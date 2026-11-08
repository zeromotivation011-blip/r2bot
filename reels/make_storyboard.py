#!/usr/bin/env python3
"""Generate a storyboard doc for one or more topics.

Built FROM topic_bank.json (and the measured timeline when it exists) so the
storyboard can never drift from what actually gets rendered -- a storyboard that
disagrees with the build is worse than none.

Usage:
  python3 make_storyboard.py                 # every topic that has a `vo` block
  python3 make_storyboard.py pid_controller slam
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BANK = json.load(open(os.path.join(HERE, "topic_bank.json")))
ORDER = ["hook", "concept", "beat1", "beat2", "beat3", "quiz", "reveal", "cta"]
ROLE = {"hook": "HOOK", "concept": "SET-UP", "beat1": "STORY",
        "beat2": "MECHANISM", "beat3": "TWIST / STAKES", "quiz": "ENGAGEMENT",
        "reveal": "PAYOFF", "cta": "CONVERT"}


def timeline(tid):
    p = os.path.join(HERE, f"_timeline_{tid}.json")
    return json.load(open(p)) if os.path.exists(p) else None


def onscreen(topic, scene):
    """What the viewer literally reads on screen during this scene."""
    if scene == "hook":
        return topic["hook"]
    if scene == "concept":
        return f"{topic['title']}  ·  {topic['curiosity_angle']}"
    if scene.startswith("beat"):
        i = int(scene[-1]) - 1
        b = (topic.get("beats") or [])[i] if i < len(topic.get("beats") or []) else {}
        return f"{b.get('label','')} — {b.get('text','')}  ({b.get('detail','')})"
    if scene == "quiz":
        q = topic.get("quiz", {})
        opts = "  ".join(f"{c}) {o}" for c, o in zip("ABC", q.get("options", [])))
        return f"{q.get('q','')}   {opts}"
    if scene == "reveal":
        q = topic.get("quiz", {})
        o = q.get("options", [])
        a = q.get("answer", 0)
        return f"✓ {'ABC'[a]}) {o[a] if a < len(o) else ''} — {q.get('why','')}"
    return "Follow R2BOT · Zero to Robotics Engineer · r2bot.in"


def render(topic):
    tid = topic["id"]
    tl = timeline(tid)
    out = [f"# Storyboard — {topic['title']}", "",
           f"`{tid}` · 60s · 1080×1920 · visual `{topic.get('visuals','—')}`", ""]
    if tl:
        out.append(f"> Timing below is **measured from the actual voiceover** "
                   f"(total {tl['vo_total']}s, tempo {tl['tempo']}). Scenes start "
                   f"exactly when their narration starts.")
    else:
        out.append("> ⚠️ Not yet voiced — timings are estimates until "
                   f"`_chunk_driver.py voice {tid}` has run.")
    out += ["", "---", ""]

    est, rate = 0.0, 2.6
    for scene in ORDER:
        vo = (topic.get("vo") or {}).get(scene, "")
        if not vo:
            continue
        if tl:
            s, e = tl["seconds"][scene]
        else:
            d = len(vo.split()) / rate
            s, e = est, est + d
            est = e
        sb = (topic.get("sb") or {}).get(scene, ("", ""))
        visual, purpose = (sb if isinstance(sb, (list, tuple)) else (sb, ""))
        out += [f"### {ROLE[scene]}  ·  {s:.1f}s – {e:.1f}s",
                "", f"**Visual:** {visual}", "",
                f"**On screen:** {onscreen(topic, scene)}", "",
                f"**Narration:** “{vo}”", "",
                f"**Why it's here:** {purpose}", "", "---", ""]

    q = topic.get("quiz", {})
    out += ["## Engagement mechanic", "",
            f"- **Question:** {q.get('q','—')}",
            f"- **Options:** {' | '.join(q.get('options', []))}",
            f"- **Answer:** {'ABC'[q.get('answer',0)]} — {q.get('why','')}",
            "- A 2.4s silent pause runs after the question so the countdown ring "
            "lands before the answer is spoken.",
            "- Caption seeds the same question to drive comments.", "",
            "## Publishing", "",
            f"- **IG caption opener (the title):** {topic['hook']}",
            f"- **IG hashtags (5):** {' '.join(topic.get('ig_tags', []))}",
            f"- **YouTube title:** {topic.get('yt_title','—')}", ""]
    return "\n".join(out)


if __name__ == "__main__":
    want = sys.argv[1:]
    made = []
    for t in BANK["topics"]:
        if not t.get("vo"):
            continue
        if want and t["id"] not in want:
            continue
        path = os.path.join(HERE, f"STORYBOARD_{t['id']}.md")
        open(path, "w").write(render(t))
        made.append(os.path.basename(path))
    print("wrote:", ", ".join(made) if made else "nothing (no matching topics with `vo`)")
