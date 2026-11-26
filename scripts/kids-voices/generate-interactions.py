#!/usr/bin/env python3
"""
scripts/kids-voices/generate-interactions.py — Spark's voice for the "join in"
moments (lib/kids/episodes/interactions.ts): the question and its options
read aloud (so a 5-year-old who cannot read yet can answer), a reply for every
option, and the "your turn" prompt.

Clips go to public/kids/audio/l1/<sessionId>/join/ (a sub-folder, so
generate.py's stale-file sweep never touches them) and the index to
lib/kids/episodes/interaction-audio.json, which the episode plan reads.

Usage (same Piper venv and voices as generate.py, see VOICES.md):
  npx tsx scripts/kids-voices/export-interactions.ts /tmp/l1-join.json
  <venv>/bin/python -I scripts/kids-voices/generate-interactions.py --join /tmp/l1-join.json --voices <dir> [--force]
Idempotent: a clip whose text and voice settings are unchanged is kept.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate as G  # noqa: E402

OUT_INDEX = G.ROOT / 'lib' / 'kids' / 'episodes' / 'interaction-audio.json'
EMOJI = re.compile('[\U0001F000-\U0001FAFF←-⇿⌀-➿⬀-⯿　-〿️‍]')


def plain(s: str) -> str:
    s = EMOJI.sub('', s).replace('“', '').replace('”', '').replace('"', '')
    return re.sub(r'\s+', ' ', s).strip()


def spoken_question(prompt: str, options: list[dict[str, object]]) -> str:
    labels = [plain(str(o['label'])).rstrip('!.') for o in options]
    # Mid-sentence: "a dance, a drawing … or lights?" (names keep their capital).
    labels = [l if re.match(r'(Distance|Spark|Noor|Nana|I\b|\d)', l) else l[:1].lower() + l[1:] for l in labels]
    if len(labels) == 2 and {l.lower() for l in labels} == {'yes', 'no'}:
        return plain(prompt)
    joined = ', '.join(labels[:-1]) + ' … or ' + labels[-1] + '?'
    return f'{plain(prompt)} {joined}'


def spoken_turn(prompt: str) -> str:
    p = plain(prompt).rstrip(':')
    return p if p.lower().startswith('your turn') else f'Your turn! {p}'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--join', required=True)
    ap.add_argument('--voices', required=True)
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()
    voices_dir = Path(args.voices)
    data: dict[str, list[dict[str, object]]] = json.loads(Path(args.join).read_text())
    spec = G.VOICES['spark']
    old: dict[str, dict[str, object]] = json.loads(OUT_INDEX.read_text()) if OUT_INDEX.exists() else {}

    # Previous clips by file, for the unchanged-text cache.
    old_clips: dict[str, dict[str, object]] = {}
    for ep in old.values():
        for entry in ep.values():
            if isinstance(entry, dict):
                for c in [entry.get('prompt'), *entry.get('replies', [])]:
                    if isinstance(c, dict) and 'file' in c:
                        old_clips[str(c['file'])] = c

    out: dict[str, dict[str, object]] = {}
    for sid, items in sorted(data.items()):
        folder = G.OUT_AUDIO / sid / 'join'
        used: set[str] = set()
        ep_out: dict[str, object] = {}

        def clip(key: str, text: str) -> dict[str, object]:
            h = G.line_hash(spec, text)
            ogg = folder / f'{key}.ogg'
            used.update({f'{key}.ogg', f'{key}.m4a'})
            prev = old_clips.get(f'{G.PUBLIC_BASE}/{sid}/join/{key}.ogg')
            if not args.force and isinstance(prev, dict) and prev.get('hash') == h and ogg.exists():
                return prev
            dur, env, _words = G.render_line(voices_dir, spec, text, ogg)
            print(f'  {sid} {key:<8} {dur:4.2f}s  {text[:70]}', flush=True)
            return {'file': f'{G.PUBLIC_BASE}/{sid}/join/{key}.ogg', 'dur': round(dur, 3), 'env': env, 'hash': h, 'text': text}

        for it in items:
            after = str(it['after'])
            if it['kind'] == 'choice':
                opts = list(it['options'])  # type: ignore[arg-type]
                q = clip(f'{after}-q', spoken_question(str(it['prompt']), opts))
                replies = []
                for k, o in enumerate(opts):
                    r = clip(f'{after}-r{k}', plain(str(o['reply'])))
                    replies.append(r)
                ep_out[after] = {'prompt': q, 'replies': replies}
            else:
                p = clip(f'{after}-t', spoken_turn(str(it['prompt'])))
                ep_out[after] = {'prompt': p, 'replies': []}
        out[sid] = ep_out
        if folder.exists():
            for f in folder.iterdir():
                if f.name not in used:
                    f.unlink()

    OUT_INDEX.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print(f'wrote {OUT_INDEX.relative_to(G.ROOT)}')


if __name__ == '__main__':
    sys.exit(main())
