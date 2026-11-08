#!/usr/bin/env python3
"""Chunked driver for the daily reel pipeline so each step fits the sandbox
per-call time limit. Reuses the exact render logic from generate_daily_reels.py.

Modes:
  render <topic_id> <start> <end>   render frame range [start,end) to /tmp/frames_<id>
  assemble <topic_id> <index>       audio + ffmpeg encode + combine + caption
  pick <count>                       print the next <count> unused topic ids
  commit <topic_id> [<topic_id>...]  append ids to reel_log.json used[]
"""
import os, sys, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_reels as G

def frames_dir(tid):
    # Must live on the persistent mount; each bash call gets a fresh /tmp.
    # Keyed by frame count so a DURATION change can't reuse stale frames.
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "_frames", f"{tid}_{G.FRAMES}")

def get_topic(tid):
    bank = json.load(open(G.TOPIC_BANK_PATH))
    for t in bank["topics"]:
        if t["id"] == tid: return t
    raise SystemExit(f"topic {tid} not found")

def cmd_pick(count):
    bank = json.load(open(G.TOPIC_BANK_PATH))
    topics = bank["topics"]
    log_path = os.path.join(G.OUTPUT_DIR, "reel_log.json")
    log = json.load(open(log_path)) if os.path.exists(log_path) else {"used": []}
    unused = [t for t in topics if t["id"] not in log["used"]]
    if len(unused) < count:
        # cycle reset
        unused = topics
    print(" ".join(t["id"] for t in unused[:count]))

def cmd_render(tid, start, end):
    topic = get_topic(tid)
    d = frames_dir(tid)
    os.makedirs(d, exist_ok=True)
    for i in range(start, min(end, G.FRAMES)):
        G.render_frame(i, topic).save(f"{d}/f{i:04d}.png")
    print(f"rendered {start}..{min(end,G.FRAMES)} -> {d}")


SEG = 600   # frames per encode segment (fits one 45s sandbox call)

def audio_path_for(tid, index):
    """Today's audio path, but fall back to an existing one from a previous day.

    Filenames are date-stamped, so a `voice` built before midnight would not be
    found by a `mux` run after it -- the driver then silently regenerated a
    single-shot TTS, breaking the timeline lock and spending credits twice.
    """
    import datetime, glob
    ds = datetime.date.today().strftime("%Y%m%d")
    today = os.path.join(G.OUTPUT_DIR, f"reel_{ds}_{index:02d}_{tid}_audio.mp3")
    if os.path.exists(today):
        return today
    prior = sorted(glob.glob(os.path.join(G.OUTPUT_DIR, f"reel_*_{index:02d}_{tid}_audio.mp3")))
    return prior[-1] if prior else today

def cmd_voice(tid, index):
    """Build VO + derive scene timeline. MUST run before render."""
    topic = get_topic(tid)
    if not topic.get("vo"):
        raise SystemExit(f"{tid} has no `vo` sections; author them first.")
    tl = G.build_voiceover(topic, audio_path_for(tid, index), G.timeline_path(tid))
    if not tl: raise SystemExit("voiceover generation failed")
    print(f"OK voice {tid} -> {G.timeline_path(tid)}")

def _decodable(path):
    """True if ffprobe can read a frame count -- catches truncated files."""
    r = subprocess.run(["ffprobe","-v","error","-select_streams","v",
                        "-show_entries","stream=nb_frames","-of","default=nw=1:nk=1",path],
                       capture_output=True, text=True)
    return r.returncode == 0 and r.stdout.strip().isdigit()

def cmd_encode(tid, part):
    """Encode one 600-frame segment. Encoding all 1800 at once blows the 45s
    limit and leaves a corrupt file with no moov atom."""
    d = frames_dir(tid); start = part*SEG; end = min(start+SEG, G.FRAMES)
    def bad(i):
        p = os.path.join(d, f"f{i:04d}.png")
        return (not os.path.exists(p)) or os.path.getsize(p) < 1000
    missing = [i for i in range(start,end) if bad(i)]
    if missing:
        raise SystemExit(f"segment {part}: {len(missing)} frames missing/truncated "
                         f"in {start}-{end}, first at {missing[0]}. Backfill: "
                         f"python3 _prender.py {tid} {start} {end}")
    out = os.path.join(G.OUTPUT_DIR, f"_seg_{tid}_{part}.mp4")
    # Encode to a temp file and rename. A sandbox timeout that kills ffmpeg
    # mid-write otherwise leaves a truncated mp4 with no moov atom, which looks
    # like a valid segment on disk and only fails later at concat.
    tmp = out + ".tmp.mp4"
    subprocess.run(["ffmpeg","-y","-framerate",str(G.FPS),"-start_number",str(start),
        "-i",f"{d}/f%04d.png","-frames:v",str(SEG),"-c:v","libx264","-pix_fmt","yuv420p",
        "-crf","18","-preset","veryfast",tmp], check=True, capture_output=True)
    if not _decodable(tmp):
        raise SystemExit(f"segment {part} encoded but is not decodable; retry")
    os.replace(tmp, out)
    print(f"OK segment {part} -> {out}")

def cmd_mux(tid, index):
    import datetime
    topic = get_topic(tid)
    nseg = (G.FRAMES + SEG - 1)//SEG
    ds = datetime.date.today().strftime("%Y%m%d")
    prefix = f"reel_{ds}_{index:02d}_{tid}"
    audio  = audio_path_for(tid, index)
    silent = os.path.join(G.OUTPUT_DIR, f"{prefix}_silent.mp4")
    final  = os.path.join(G.OUTPUT_DIR, f"{prefix}.mp4")
    cap    = os.path.join(G.OUTPUT_DIR, f"{prefix}_caption.txt")
    if os.path.exists(audio) and os.path.exists(G.timeline_path(tid)):
        ok = True; print(f"  \u2713 Using timeline-locked voiceover ({G.audio_duration(audio):.1f}s)")
    else:
        ok = G.generate_audio(topic["script"], audio, voice=topic.get("voice"))
        if ok: G.fit_audio(audio, G.DURATION - 2)
    listing = os.path.join(G.OUTPUT_DIR, f"_concat_{tid}.txt")
    with open(listing,"w") as fh:
        for p in range(nseg):
            seg = os.path.join(G.OUTPUT_DIR, f"_seg_{tid}_{p}.mp4")
            if not os.path.exists(seg) or not _decodable(seg):
                raise SystemExit(f"segment {p} missing or corrupt; re-run: "
                                 f"python3 _chunk_driver.py encode {tid} {p}")
            fh.write(f"file '{os.path.abspath(seg)}'\n")
    subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",listing,"-c","copy",silent],
                   check=True, capture_output=True)
    if ok:
        subprocess.run(["ffmpeg","-y","-i",silent,"-i",audio,"-filter_complex","[1:a]apad[a]",
            "-map","0:v","-map","[a]","-c:v","copy","-c:a","aac","-shortest",final],
            check=True, capture_output=True)
    else:
        import shutil; shutil.copy(silent, final)
    open(cap,"w").write(G.build_caption(topic))
    print(f"OK {final} ({os.path.getsize(final)//1024}KB) dur={G.audio_duration(final):.1f}s")

def cmd_assemble(tid, index):
    import datetime
    topic = get_topic(tid)
    d = frames_dir(tid)
    n = len([f for f in os.listdir(d) if f.endswith('.png')])
    if n < G.FRAMES:
        raise SystemExit(f"only {n}/{G.FRAMES} frames present in {d}; render more first")
    date_str = datetime.date.today().strftime("%Y%m%d")
    prefix = f"reel_{date_str}_{index:02d}_{tid}"
    audio_path  = os.path.join(G.OUTPUT_DIR, f"{prefix}_audio.mp3")
    silent_path = os.path.join(G.OUTPUT_DIR, f"{prefix}_silent.mp4")
    final_path  = os.path.join(G.OUTPUT_DIR, f"{prefix}.mp4")
    caption_path= os.path.join(G.OUTPUT_DIR, f"{prefix}_caption.txt")

    ok = G.generate_audio(topic["script"], audio_path)
    subprocess.run(["ffmpeg","-y","-framerate",str(G.FPS),
        "-i",f"{d}/f%04d.png","-c:v","libx264","-pix_fmt","yuv420p",
        "-crf","18","-preset","fast",silent_path], check=True, capture_output=True)
    if ok:
        subprocess.run(["ffmpeg","-y","-i",silent_path,"-i",audio_path,
            "-c:v","copy","-c:a","aac","-shortest",final_path], check=True, capture_output=True)
    else:
        import shutil; shutil.copy(silent_path, final_path)
    caption = f"""{topic['hook']}

{topic['curiosity_angle']}

✅ Follow @r2bot.in to learn robotics from zero to job-ready.
\U0001f517 Free courses + AI mentor at r2bot.in

{chr(10).join(topic['tags'])}
#robotics #engineering #STEM #learnrobotics #r2bot
"""
    open(caption_path,"w").write(caption)
    size = os.path.getsize(final_path)//1024
    print(f"OK {final_path} ({size}KB) audio_ok={ok}")

def cmd_commit(ids):
    log_path = os.path.join(G.OUTPUT_DIR, "reel_log.json")
    log = json.load(open(log_path)) if os.path.exists(log_path) else {"used": []}
    for tid in ids:
        if tid not in log["used"]:
            log["used"].append(tid)
    json.dump(log, open(log_path,"w"), indent=2)
    print("used:", log["used"])

if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "pick":     cmd_pick(int(sys.argv[2]))
    elif mode == "render": cmd_render(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
    elif mode == "voice":    cmd_voice(sys.argv[2], int(sys.argv[3]))
    elif mode == "encode":   cmd_encode(sys.argv[2], int(sys.argv[3]))
    elif mode == "mux":      cmd_mux(sys.argv[2], int(sys.argv[3]))
    elif mode == "assemble": cmd_assemble(sys.argv[2], int(sys.argv[3]))
    elif mode == "commit": cmd_commit(sys.argv[2:])
    else: raise SystemExit(f"unknown mode {mode}")
