#!/usr/bin/env python3
"""Generate a single reel by topic id + index. Chunk-friendly wrapper around generate_daily_reels."""
import sys, os, json
import generate_daily_reels as g

topic_id = sys.argv[1]
index = int(sys.argv[2])

bank = json.load(open(g.TOPIC_BANK_PATH))
topic = next(t for t in bank["topics"] if t["id"] == topic_id)

video, caption = g.generate_reel(topic, reel_index=index)

# maintain reel_log.json cycle tracking
log_path = os.path.join(g.OUTPUT_DIR, "reel_log.json")
log = json.load(open(log_path)) if os.path.exists(log_path) else {"used": []}
if topic_id not in log["used"]:
    log["used"].append(topic_id)
json.dump(log, open(log_path, "w"), indent=2)
print(f"DONE {video}")
