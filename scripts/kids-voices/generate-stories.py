"""
scripts/kids-voices/generate-stories.py — Piper voices for the Story Theatre.

The eight Story Theatre episodes (/kids/stories, lib/kids/stories) were read by
the browser's own speech voice. This voices every line they read aloud with
the same Piper voices and shaping as the 3D episodes (generate.py: narrator,
Spark, Amara, Nana Lucía, Bolt), plus two machines that only appear here:
Zippy (a little robot car) and Rover (the Mars rover).

Output, one file per unique speaker+text (see lib/kids/episodes/story-voice-key.ts):
  public/kids/audio/stories/<key>.ogg   Opus ~24 kbps mono
  public/kids/audio/stories/<key>.m4a   AAC twin for Safari before 18.4
  public/kids/audio/stories/index.json  {key: {d: seconds, v: voice, h: hash}}

The player (lib/kids/episodes/story-voice.ts) plays a file when the index has
the line and falls back to the browser voice when it does not, so an edited
line is never silent — just not yet re-voiced.

Usage (Piper venv + voices, see VOICES.md):
  npx tsx scripts/kids-voices/export-stories.ts /tmp/stories.json
  <venv>/bin/python -I scripts/kids-voices/generate-stories.py --lines /tmp/stories.json \
      --voices <dir with .onnx voices> [--force]

Idempotent: a line whose text, voice and settings have not changed is kept.
Stale files (lines that no longer exist) are removed.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))  # -I drops the script dir; generate.py lives next to this file

import generate as g  # noqa: E402

OUT = g.ROOT / 'public' / 'kids' / 'audio' / 'stories'
INDEX = OUT / 'index.json'
SCHEMA = 1

# Story-only machines. Licences: VOICES.md (joe = CC0, john = public domain).
STORY_VOICES: dict[str, g.VoiceSpec] = {
    'zippy': g.VoiceSpec('en_US-joe-medium', length=0.88, noise=0.6, noise_w=0.8, pitch=1.3, robot=0.4, sentence_gap=0.2),
    'rover': g.VoiceSpec('en_US-john-medium', length=1.08, noise=0.5, noise_w=0.6, pitch=0.9, robot=0.45),
}


def spec(who: str) -> tuple[str, g.VoiceSpec]:
    if who in STORY_VOICES:
        return who, STORY_VOICES[who]
    return who if who in g.VOICES else 'narrator', g.VOICES.get(who, g.VOICES['narrator'])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--lines', required=True)
    ap.add_argument('--voices', required=True)
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()
    voices_dir = Path(args.voices)
    data = json.loads(Path(args.lines).read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    old: dict[str, dict[str, object]] = {}
    if INDEX.exists():
        old = json.loads(INDEX.read_text()).get('lines', {})

    lines: dict[str, dict[str, object]] = {}
    total = 0
    for ln in data['lines']:
        key: str = ln['key']
        vkey, sp = spec(ln['who'])
        h = g.line_hash(sp, ln['text'])
        ogg = OUT / f'{key}.ogg'
        prev = old.get(key)
        if not args.force and prev and prev.get('h') == h and ogg.exists() and ogg.with_suffix('.m4a').exists():
            lines[key] = prev
        else:
            dur, _env, _words = g.render_line(voices_dir, sp, ln['text'], ogg)
            lines[key] = {'d': round(dur, 3), 'v': vkey, 'h': h}
            print(f'  {key} {ln["who"]:<8} {dur:5.2f}s  {ln["text"][:60]}', flush=True)
        total += ogg.stat().st_size

    keep = {f'{k}.{ext}' for k in lines for ext in ('ogg', 'm4a')}
    for f in [*OUT.glob('*.ogg'), *OUT.glob('*.m4a')]:
        if f.name not in keep:
            f.unlink()

    INDEX.write_text(json.dumps({'schema': SCHEMA, 'base': '/kids/audio/stories', 'lines': dict(sorted(lines.items()))},
                                ensure_ascii=False, separators=(',', ':')))
    print(f'wrote {INDEX.relative_to(g.ROOT)} — {len(lines)} lines, ogg {total / 1e6:.2f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
