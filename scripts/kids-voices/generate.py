#!/usr/bin/env python3
"""
scripts/kids-voices/generate.py — natural voices for the R2BOT Kids episodes.

Reads the Level 1 episode beats (exported to JSON by export-episodes.ts), and
for every spoken line synthesises speech with that character's Piper voice,
shapes it per character (pitch, pace, robot tone, Bolt's beeps), encodes Opus
.ogg (~24 kbps mono) to public/kids/audio/l1/<sessionId>/<key>.ogg (plus an AAC
.m4a twin for browsers without Ogg Opus) and writes:

  lib/kids/episodes/audio-manifest.json      the full index (all episodes)
  public/kids/audio/l1/<sessionId>/episode.json   one episode, fetched by the player

Each line in the manifest carries its duration (ffprobe), a loudness envelope
(30 fps, one base-36 character per frame) that drives the mouths, and
estimated per-word timings for the karaoke captions.

Keys: "title" (episode title card), "prev" ("Last time…"), 0..N-1 (the
scene lines, numbered through the whole episode), "next" ("Next time…").

Usage (Piper venv + voices, see VOICES.md):
  npx tsx scripts/kids-voices/export-episodes.ts /tmp/l1.json
  <venv>/bin/python -I scripts/kids-voices/generate.py --episodes /tmp/l1.json \
      --voices <dir with .onnx voices> [--only L1-S01] [--force]

Requires ffmpeg + ffprobe with libopus. Idempotent: a line whose text, voice
and settings have not changed is not re-synthesised (hash in the manifest).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parents[2]
OUT_AUDIO = ROOT / 'public' / 'kids' / 'audio' / 'l1'
OUT_MANIFEST = ROOT / 'lib' / 'kids' / 'episodes' / 'audio-manifest.json'
PUBLIC_BASE = '/kids/audio/l1'
SR = 22050
ENV_FPS = 30
BITRATE = '24k'
SCHEMA = 4


@dataclass
class VoiceSpec:
    model: str
    speaker: str | None = None
    length: float = 1.0  # Piper length_scale: >1 slower
    noise: float = 0.667
    noise_w: float = 0.8
    pitch: float = 1.0  # resample factor, tempo kept (formants move too: child-like up, older down)
    robot: float = 0.0  # 0..1 blend of a robotised copy
    beeps: bool = False  # Bolt: beep/woof tokens become chirps and barks
    gain_db: float = 0.0
    sentence_gap: float = 0.28
    # True: shift pitch with rubberband and keep the formants (no "chipmunk"), for
    # an adult voice playing a child. Off by default; decide after a listening pass.
    formant: bool = False
    extra: list[str] = field(default_factory=list)


# One voice per character. Licences are recorded in VOICES.md — only voices
# whose licence allows commercial use (public domain, CC0, CC BY 4.0).
VOICES: dict[str, VoiceSpec] = {
    'narrator': VoiceSpec('en_GB-cori-high', length=1.06, noise=0.6, noise_w=0.7),
    'spark': VoiceSpec('en_US-ljspeech-high', length=0.9, noise=0.75, noise_w=0.9, pitch=1.05, sentence_gap=0.22),
    'amara': VoiceSpec('en_GB-vctk-medium', 'p305', length=0.94, noise=0.7, noise_w=0.9, pitch=1.13, sentence_gap=0.22),
    'lucia': VoiceSpec('en_US-kristin-medium', length=1.2, noise=0.55, noise_w=0.6, pitch=0.97, sentence_gap=0.4),
    'bolt': VoiceSpec('en_GB-vctk-medium', 'p240', length=0.85, noise=0.8, noise_w=1.0, pitch=1.32, beeps=True, gain_db=-6.0),
    'myrobot': VoiceSpec('en_US-joe-medium', length=0.95, noise=0.5, noise_w=0.6, pitch=1.12, robot=0.55),
}

GUESTS: dict[str, VoiceSpec] = {
    'okafor': VoiceSpec('en_US-norman-medium', length=1.04, pitch=0.98),
    'noor': VoiceSpec('en_GB-vctk-medium', 'p339', length=0.95, noise=0.75, pitch=1.28),
    'adaeze': VoiceSpec('en_US-kathleen-medium', length=1.0),
    'mei': VoiceSpec('en_GB-vctk-medium', 'p361', length=1.0),
    'haruto': VoiceSpec('en_US-john-medium', length=1.05),
    'diego': VoiceSpec('en_GB-vctk-medium', 'p347', length=1.0),
    'ingrid': VoiceSpec('en_GB-alba-medium', length=1.0, pitch=0.96),
}
DEFAULT_GUEST = VoiceSpec('en_US-bryce-medium')


def guest_voice(name: str | None) -> tuple[str, VoiceSpec]:
    n = (name or '').lower()
    for key, spec in GUESTS.items():
        if key in n:
            return key, spec
    return 'guest', DEFAULT_GUEST


# ── Synthesis ────────────────────────────────────────────────────────────────

_voices: dict[str, PiperVoice] = {}


def load_voice(voices_dir: Path, model: str) -> PiperVoice:
    if model not in _voices:
        _voices[model] = PiperVoice.load(str(voices_dir / f'{model}.onnx'))
    return _voices[model]


def speaker_id(voices_dir: Path, model: str, speaker: str | None) -> int | None:
    if speaker is None:
        return None
    cfg = json.loads((voices_dir / f'{model}.onnx.json').read_text())
    return int(cfg['speaker_id_map'][speaker])


def clean_for_tts(text: str) -> str:
    t = text.replace('…', '... ').replace('—', ', ').replace('–', ', ')
    t = t.replace('“', '"').replace('”', '"').replace('’', "'").replace('‘', "'")
    t = re.sub(r'\bNana Lucía\b', 'Nana Lucia', t)
    t = t.replace('Lucía', 'Lucia')
    return re.sub(r'\s+', ' ', t).strip()


def split_sentences(text: str) -> list[str]:
    parts = re.split(r'(?<=[.!?…])\s+', text.strip())
    return [p for p in parts if p.strip()]


@dataclass
class Segment:
    text: str  # the caption words this audio covers ('' for a pause / beep with no caption)
    audio: np.ndarray


def tts(voices_dir: Path, spec: VoiceSpec, text: str, length_mul: float = 1.0) -> np.ndarray:
    v = load_voice(voices_dir, spec.model)
    cfg = SynthesisConfig(
        speaker_id=speaker_id(voices_dir, spec.model, spec.speaker),
        length_scale=spec.length * length_mul,
        noise_scale=spec.noise,
        noise_w_scale=spec.noise_w,
    )
    chunks = [c.audio_float_array for c in v.synthesize(clean_for_tts(text), cfg)]
    if not chunks:
        return np.zeros(int(SR * 0.1), dtype=np.float32)
    return trim(np.concatenate(chunks).astype(np.float32))


def trim(a: np.ndarray, thr: float = 0.012) -> np.ndarray:
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    pad = int(SR * 0.04)
    return a[max(0, idx[0] - pad): min(len(a), idx[-1] + pad)]


def silence(sec: float) -> np.ndarray:
    return np.zeros(int(SR * sec), dtype=np.float32)


def chirp(f0: float, f1: float, dur: float, amp: float = 0.2) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = np.linspace(f0, f1, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.25 * np.sin(2 * ph)
    env = np.minimum(1, t / 0.008) * np.minimum(1, (dur - t) / 0.03)
    return (amp * tone * env).astype(np.float32)


BEEP_RE = re.compile(r"(?i)\b(beep|bip|boop)\b")


def bolt_segments(voices_dir: Path, spec: VoiceSpec, line: str) -> list[Segment]:
    """Bolt speaks in beeps and barks plus the odd short word."""
    segs: list[Segment] = []
    tokens = re.findall(r"[A-Za-z']+[^A-Za-z']*", line.replace('-', ' '))
    for tok in tokens:
        word = re.match(r"[A-Za-z']+", tok)
        w = word.group(0).lower() if word else ''
        trailing = tok[len(w):]
        question = '?' in trailing
        long_pause = '…' in trailing or '...' in trailing
        if BEEP_RE.fullmatch(w):
            # Beep: a bright up-chirp (up-up when asking).
            a = chirp(900, 1400 if not question else 1900, 0.14)
            b = chirp(1300, 1250 if not question else 2100, 0.1)
            segs.append(Segment(tok.strip(), np.concatenate([a, silence(0.03), b])))
        elif w.startswith('woo') and w.endswith('f'):
            stretch = 1.0 + 0.35 * max(0, w.count('o') - 2)
            bark = tts(voices_dir, spec, 'Woof?' if question else 'Woof!', length_mul=stretch)
            segs.append(Segment(tok.strip(), bark))
        else:
            segs.append(Segment(tok.strip(), tts(voices_dir, spec, tok.strip())))
        segs.append(Segment('', silence(0.32 if long_pause else 0.08)))
    return segs


def speech_segments(voices_dir: Path, spec: VoiceSpec, text: str) -> list[Segment]:
    if spec.beeps:
        return bolt_segments(voices_dir, spec, text)
    segs: list[Segment] = []
    for i, sentence in enumerate(split_sentences(text)):
        if i:
            gap = spec.sentence_gap * (1.6 if sentence.startswith(('…', '...')) else 1.0)
            segs.append(Segment('', silence(gap)))
        segs.append(Segment(sentence, tts(voices_dir, spec, sentence)))
    return segs


# ── Shaping (ffmpeg) ─────────────────────────────────────────────────────────

def write_wav(path: Path, a: np.ndarray, sr: int = SR) -> None:
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), 'rb') as w:
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return data.astype(np.float32) / 32767


def shape_filter(spec: VoiceSpec) -> str:
    """The ffmpeg -af chain for a character. Tempo is preserved, so word timings hold."""
    chain: list[str] = ['highpass=f=70']
    if abs(spec.pitch - 1) > 1e-3 and spec.formant:
        chain += [f'rubberband=pitch={spec.pitch:.4f}:formant=preserved:pitchq=quality']
    elif abs(spec.pitch - 1) > 1e-3:
        chain += [f'asetrate={SR}*{spec.pitch:.4f}', f'aresample={SR}', f'atempo={1 / spec.pitch:.5f}']
    pre = ','.join(chain)
    tail = 'acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-17:TP=-1.5:LRA=7'
    if spec.gain_db:
        tail += f',volume={spec.gain_db}dB'
    tail += ',alimiter=limit=0.89:level=disabled'
    if spec.robot > 0:
        robot = "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75"
        w = spec.robot
        return (
            f'[0:a]{pre},asplit=2[d][r];[r]{robot},volume=0.9[rb];'
            f'[d][rb]amix=inputs=2:weights={1 - w:.2f} {w:.2f}:normalize=0,{tail}[out]'
        )
    return f'[0:a]{pre},{tail}[out]'


def run(cmd: list[str]) -> str:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:6])}…\n{res.stderr[-1500:]}")
    return res.stdout


def render_line(voices_dir: Path, spec: VoiceSpec, text: str, out_ogg: Path) -> tuple[float, str, list[list[object]]]:
    segs = speech_segments(voices_dir, spec, text)
    lead, tail = silence(0.06), silence(0.18)
    audio = np.concatenate([lead] + [s.audio for s in segs] + [tail])
    with tempfile.TemporaryDirectory() as td:
        raw, shaped = Path(td) / 'raw.wav', Path(td) / 'shaped.wav'
        write_wav(raw, audio)
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-filter_complex', shape_filter(spec), '-map', '[out]',
             '-ar', str(SR), '-ac', '1', str(shaped)])
        shaped_audio = read_wav(shaped)
        out_ogg.parent.mkdir(parents=True, exist_ok=True)
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(shaped), '-c:a', 'libopus', '-b:a', BITRATE, '-vbr', 'on',
             '-application', 'voip', '-ac', '1', '-ar', '24000', str(out_ogg)])
        # AAC twin for browsers without Ogg Opus (Safari before 18.4).
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(shaped), '-c:a', 'aac', '-b:a', '40k', '-ac', '1', '-ar', str(SR),
             '-movflags', '+faststart', str(out_ogg.with_suffix('.m4a'))])
    dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out_ogg)]).strip())
    env = envelope(shaped_audio)
    words = word_timings(segs, len(lead))
    return dur, env, words


def envelope(a: np.ndarray) -> str:
    """Loudness per 1/30 s as base-36 digits 0..z (0 = silent). Drives lip-sync."""
    hop = SR // ENV_FPS
    n = int(np.ceil(len(a) / hop))
    out = []
    peak = max(1e-4, float(np.percentile(np.abs(a), 99.5)))
    for i in range(n):
        x = a[i * hop:(i + 1) * hop]
        rms = float(np.sqrt(np.mean(x * x))) if len(x) else 0.0
        v = min(1.0, (rms / peak) * 2.0)
        v = 0.0 if v < 0.05 else v
        out.append(np.base_repr(int(round(v * 35)), 36).lower())
    return ''.join(out)


def word_timings(segs: list[Segment], offset_samples: int) -> list[list[object]]:
    """Estimate when each caption word is spoken: inside each segment's voiced
    span, words share the time in proportion to their letters (+1 for the gap)."""
    out: list[list[object]] = []
    pos = offset_samples
    for s in segs:
        n = len(s.audio)
        words = s.text.split()
        if words:
            voiced = np.where(np.abs(s.audio) > 0.02)[0]
            a0 = pos + (voiced[0] if len(voiced) else 0)
            a1 = pos + (voiced[-1] if len(voiced) else n)
            weights = [len(re.sub(r'[^A-Za-z0-9]', '', w)) + 1.5 for w in words]
            total = sum(weights)
            t = float(a0)
            for w, wt in zip(words, weights):
                d = (a1 - a0) * wt / total
                out.append([w, round(t / SR, 2), round((t + d) / SR, 2)])
                t += d
        pos += n
    return out


# ── Manifest ────────────────────────────────────────────────────────────────

def spec_for(who: str, guest_name: str | None) -> tuple[str, VoiceSpec]:
    if who == 'guest':
        return guest_voice(guest_name)
    return who, VOICES.get(who, VOICES['narrator'])


def line_hash(spec: VoiceSpec, text: str) -> str:
    d = {k: v for k, v in spec.__dict__.items() if not (k == 'formant' and v is False)}  # old hashes stay valid
    h = hashlib.sha1(json.dumps([SCHEMA, d, text], sort_keys=True, default=str).encode()).hexdigest()
    return h[:12]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--episodes', required=True)
    ap.add_argument('--voices', required=True)
    ap.add_argument('--only', default=None, help='comma-separated session ids')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()
    voices_dir = Path(args.voices)
    data = json.loads(Path(args.episodes).read_text())
    only = set(args.only.split(',')) if args.only else None

    old: dict[str, object] = {}
    if OUT_MANIFEST.exists():
        old = json.loads(OUT_MANIFEST.read_text()).get('episodes', {})

    def old_line(sid: str, key: str) -> dict[str, object] | None:
        ep = old.get(sid)
        if not isinstance(ep, dict):
            return None
        named = {'title': 'titleCard', 'prev': 'previously', 'next': 'cliffhanger'}
        if key in named:
            rec = ep.get(named[key])
            return rec if isinstance(rec, dict) else None
        for sc in ep.get('scenes', []):
            for ln in sc.get('lines', []):
                if str(ln.get('i')) == key:
                    return ln
        return None

    episodes_out: dict[str, object] = {}
    for ep in data['episodes']:
        sid: str = ep['sessionId']
        if only and sid not in only:
            if sid in old:
                episodes_out[sid] = old[sid]
            continue
        print(f'— {sid} {ep["title"]}', flush=True)
        index: dict[str, dict[str, object]] = {}

        def voice(key: str, who: str, guest: str | None, text: str) -> dict[str, object]:
            vkey, spec = spec_for(who, guest)
            h = line_hash(spec, text)
            ogg = OUT_AUDIO / sid / f'{key}.ogg'
            prev = old_line(sid, key)
            if not args.force and prev and prev.get('hash') == h and ogg.exists() and ogg.with_suffix('.m4a').exists():
                rec = {k: prev[k] for k in ('file', 'dur', 'env', 'words', 'voice', 'hash', 'bytes') if k in prev}
            else:
                dur, env, words = render_line(voices_dir, spec, text, ogg)
                rec = {'file': f'{PUBLIC_BASE}/{sid}/{key}.ogg', 'dur': round(dur, 3), 'env': env, 'words': words,
                       'voice': vkey, 'hash': h, 'bytes': ogg.stat().st_size}
                print(f'   {key:>5} {who:<8} {dur:5.2f}s  {text[:60]}', flush=True)
            index[key] = rec
            return rec

        title_text = f'Episode {ep["number"]}. {ep["title"]}.'
        out_ep: dict[str, object] = {
            'sessionId': sid,
            'number': ep['number'],
            'sessionTitle': ep['sessionTitle'],
            'title': ep['title'],
            'titleCard': {'text': title_text, **voice('title', 'narrator', None, title_text)},
            'previously': None,
            'scenes': [],
            'cliffhanger': None,
        }
        if ep.get('previously'):
            t = f'Last time... {ep["previously"]}'
            out_ep['previously'] = {'text': ep['previously'], **voice('prev', 'narrator', None, t)}
        n = 0
        scenes = []
        for sc in ep['scenes']:
            lines = []
            for ln in sc['lines']:
                rec = voice(str(n), ln['who'], ln.get('guestName'), ln['line'])
                lines.append({'i': n, 'who': ln['who'], 'guestName': ln.get('guestName'), 'text': ln['line'],
                              'direction': ln.get('direction'), **rec})
                n += 1
            scenes.append({'setting': sc['setting'], 'action': sc['action'], 'seconds': sc['seconds'], 'lines': lines})
        out_ep['scenes'] = scenes
        nt = f'Next time... {ep["cliffhanger"]}'
        out_ep['cliffhanger'] = {'text': ep['cliffhanger'], **voice('next', 'narrator', None, nt)}
        out_ep['bytes'] = sum(int(v.get('bytes', 0)) for v in index.values())
        out_ep['voicedSec'] = round(sum(float(v['dur']) for v in index.values()), 1)
        # Remove stale files (e.g. a line was deleted).
        keep = {f'{k}.{ext}' for k in index for ext in ('ogg', 'm4a')}
        for f in [*(OUT_AUDIO / sid).glob('*.ogg'), *(OUT_AUDIO / sid).glob('*.m4a')]:
            if f.name not in keep:
                f.unlink()
        episodes_out[sid] = out_ep
        (OUT_AUDIO / sid / 'episode.json').write_text(json.dumps(strip_private(out_ep), ensure_ascii=False, separators=(',', ':')))

    voices_meta = {k: {'model': v.model, 'speaker': v.speaker} for k, v in {**VOICES, **GUESTS, 'guest': DEFAULT_GUEST}.items()}
    total = sum(int(e.get('bytes', 0)) for e in episodes_out.values() if isinstance(e, dict))
    manifest = {
        'schema': SCHEMA,
        'level': 1,
        'envFps': ENV_FPS,
        'bitrate': BITRATE,
        'voices': voices_meta,
        'totalBytes': total,
        'episodes': dict(sorted(episodes_out.items())),
    }
    OUT_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    OUT_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
    print(f'wrote {OUT_MANIFEST.relative_to(ROOT)} — {len(episodes_out)} episodes, audio {total / 1e6:.2f} MB')


def strip_private(o: object) -> object:
    """The public per-episode JSON drops the cache hash and byte counts."""
    if isinstance(o, dict):
        return {k: strip_private(v) for k, v in o.items() if k not in ('hash', 'bytes')}
    if isinstance(o, list):
        return [strip_private(v) for v in o]
    return o


if __name__ == '__main__':
    sys.exit(main())
