import os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_reels as G
tid = sys.argv[1]; maxn = int(sys.argv[2]) if len(sys.argv)>2 else 2
bank = json.load(open(G.TOPIC_BANK_PATH))
topic = [t for t in bank["topics"] if t["id"]==tid][0]
vo = topic["vo"]; voice = topic.get("voice")
tmp = os.path.join(G.OUTPUT_DIR, f"_vo_{tid}"); os.makedirs(tmp, exist_ok=True)
done = 0
for name in G.VO_SECTIONS:
    text = (vo.get(name) or "").strip()
    if not text: continue
    seg = os.path.join(tmp, f"{name}.mp3")
    if os.path.exists(seg) and os.path.getsize(seg) > 2000:
        print(f"cached {name} ({G.audio_duration(seg):.1f}s)"); continue
    t0=time.time()
    ok = G.generate_audio(text, seg, voice=voice)
    print(f"{'OK' if ok else 'FAIL'} {name} in {time.time()-t0:.1f}s")
    if not ok: sys.exit(1)
    done += 1
    if done >= maxn: print("PARTIAL - rerun"); sys.exit(0)
print("ALL SECTIONS DONE")
