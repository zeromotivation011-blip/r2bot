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

def frames_dir(tid): return f"/tmp/frames_{tid}"

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
    elif mode == "assemble": cmd_assemble(sys.argv[2], int(sys.argv[3]))
    elif mode == "commit": cmd_commit(sys.argv[2:])
    else: raise SystemExit(f"unknown mode {mode}")
