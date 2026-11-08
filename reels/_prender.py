#!/usr/bin/env python3
"""Parallel persistent renderer for chunked reel generation.
Renders frame range [start,end) for a topic into ./_frames/<tid> using all cores.
Usage: python3 _prender.py <topic_id> <start> <end>
"""
import sys, os, json, time
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_reels as G

TID = sys.argv[1]
START = int(sys.argv[2])
END = min(int(sys.argv[3]), G.FRAMES)
# 4th arg "force" re-renders frames that already exist -- needed when only one
# scene changes (e.g. a new topic visual) and you want to patch that range
# instead of rebuilding all 1800 frames.
FORCE = len(sys.argv) > 4 and sys.argv[4] == "force"

bank = json.load(open(G.TOPIC_BANK_PATH))
TOPIC = G.attach_timeline(next(t for t in bank["topics"] if t["id"] == TID))
if "_timeline" not in TOPIC:
    print(f"  ⚠️  no measured timeline for {TID} — run `_chunk_driver.py voice {TID}` "
          f"first, or the visuals will drift out of sync with the narration.")
# Frame cache is keyed by frame count: if DURATION changes, stale frames from a
# previous timeline can never be silently reused (this bit us on the 20s->60s move).
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_frames", f"{TID}_{G.FRAMES}")
os.makedirs(DIR, exist_ok=True)

MIN_BYTES = 1000   # a real 1080x1920 frame is far larger; anything less is truncated

def rr(i):
    p = f"{DIR}/f{i:04d}.png"
    # Treat truncated frames as missing. A sandbox timeout can kill the process
    # mid-write, leaving a 0-byte PNG that passes an existence check but makes
    # ffmpeg stop dead at that frame -- silently producing a short video.
    if os.path.exists(p) and os.path.getsize(p) >= MIN_BYTES and not FORCE:
        return i
    # Write to a temp file and rename: rename is atomic, so a frame is either
    # fully there or not there at all.
    tmp = f"{DIR}/.f{i:04d}.tmp.png"
    G.render_frame(i, TOPIC).save(tmp)
    os.replace(tmp, p)
    return i

if __name__ == "__main__":
    s = time.time()
    with Pool(os.cpu_count()) as p:
        p.map(rr, range(START, END))
    have = len([f for f in os.listdir(DIR) if f.endswith(".png")])
    print(f"rendered {START}..{END} in {round(time.time()-s,1)}s; total frames present={have}/{G.FRAMES}")
