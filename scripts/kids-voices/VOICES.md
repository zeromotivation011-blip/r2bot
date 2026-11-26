# R2BOT Kids — episode voices

The episode voices are generated offline with [Piper](https://github.com/OHF-Voice/piper1-gpl)
(`piper-tts` 1.8, Python) from the voice models published at
`https://huggingface.co/rhasspy/piper-voices`. Nothing is synthesised in the
browser: the player streams small Opus files (`public/kids/audio/l1/…`).

Only voices whose **training data licence allows commercial use** are used
(public domain, CC0, CC BY 4.0). The licence below is the one stated in each
voice's `MODEL_CARD` in that repository — for the voice's own dataset **and**
for the base model it was fine-tuned from (checked 26 Nov 2026). CC BY 4.0
voices and bases need attribution: the credit line at the end of this file is
shown on the episode end card and the episode preview page, from one constant
(`lib/kids/episodes/credits.ts`). Change both together.

| Character | Piper voice | Speaker | Licence (MODEL_CARD) | Fine-tuned from (base model, its licence) | Shaping |
|-----------|-------------|---------|----------------------|-------------------------------------------|---------|
| Narrator | `en_GB-cori-high` | — | Public domain (LibriVox) | — | slightly slow storyteller pace |
| Spark (orange robot) | `en_US-ljspeech-high` | — | Public domain (LJ Speech) | — | quick and playful: length 0.9, pitch ×1.05 |
| Amara (9, inventor) | `en_GB-vctk-medium` | p305 | CC BY 4.0 (VCTK, CSTR, Univ. of Edinburgh) | `hifi_tts_92` — Hi-Fi TTS (NVIDIA), CC BY 4.0 | bright, pitch ×1.13 for a child's voice |
| Nana Lucía (grandmother) | `en_US-kristin-medium` | — | Public domain (LibriVox) | — | warm and slow: length 1.2, pitch ×0.97, longer pauses |
| Bolt (robot puppy) | `en_GB-vctk-medium` | p240 | CC BY 4.0 (VCTK) | `hifi_tts_92`, CC BY 4.0 | "beep" → synthesised chirps, "woof" → pitched bark (×1.32) |
| The child's robot | `en_US-joe-medium` | — | CC0 | `rdh` voice, CC0 | pitch ×1.12 blended with a robotised copy (FFT phase flattening) |
| Mr Okafor (baker) | `en_US-norman-medium` | — | Public domain (LibriVox) | — | — |
| Noor (age 5) | `en_GB-vctk-medium` | p339 | CC BY 4.0 (VCTK) | `hifi_tts_92`, CC BY 4.0 | pitch ×1.28 |
| Ms Adaeze (teacher) | `en_US-kathleen-medium` | — | CC0 (dataset) | `hifi_tts_92`, CC BY 4.0 | — |
| Ms Mei (fruit seller) | `en_GB-vctk-medium` | p361 | CC BY 4.0 (VCTK) | `hifi_tts_92`, CC BY 4.0 | — |
| Mr Haruto (librarian) | `en_US-john-medium` | — | Public domain (LibriVox) | — | — |
| Mr Diego (flower seller) | `en_GB-vctk-medium` | p347 | CC BY 4.0 (VCTK) | `hifi_tts_92`, CC BY 4.0 | — |
| Captain Ingrid | `en_GB-alba-medium` | — | CC BY 4.0 (Univ. of Edinburgh DataShare 10283/3270) | `hifi_tts_92`, CC BY 4.0 | pitch ×0.96 |
| any other guest | `en_US-bryce-medium` | — | Public domain | — | — |

Spark also reads the "join in" questions, the reply to every answer and the
"your turn" prompts (`generate-interactions.py`, same `ljspeech` voice).

**Before launch: a human listening pass.** Nobody has auditioned these by ear
yet. Amara (×1.13) and Noor (×1.28) are adult VCTK speakers pitched up with a
plain resample, which moves the formants too and can sound chipmunk-like. If
they do, set `formant=True` on their `VoiceSpec` in `generate.py` (rubberband,
formants preserved) and re-voice just those lines with `--only`.

**Not used, on purpose:** `en_US-lessac-*` (Blizzard 2013 / Lessac data, research
licence) and `en_US-amy-*` (no clear commercial grant in its card). Do not add a
voice without reading its MODEL_CARD and adding a row here.

## Regenerating

```bash
# once: a venv with Piper, and the .onnx + .onnx.json + MODEL_CARD of each voice above
python3 -m venv tts && tts/bin/pip install piper-tts
# voices: https://huggingface.co/rhasspy/piper-voices/resolve/main/en/<lang>/<name>/<quality>/<file>

npx tsx scripts/kids-voices/export-episodes.ts /tmp/l1.json
tts/bin/python -I scripts/kids-voices/generate.py --episodes /tmp/l1.json --voices <voices dir>
#   --only L1-S03          one episode
#   --force                re-synthesise everything (otherwise unchanged lines are kept)
```

Output: `public/kids/audio/l1/<sessionId>/{title,prev,0…N,next}.ogg` (Opus 24 kbps
mono) + `.m4a` twins (AAC 40 kbps, for Safari before 18.4), `episode.json` per
episode (fetched by the player), and `lib/kids/episodes/audio-manifest.json`
(the full index: durations from ffprobe, a 30 fps loudness envelope per line
for lip-sync, and estimated word timings for the karaoke captions).

Editing a line in `lib/kids/curriculum/level1/*` means re-running both commands;
only the changed lines are re-voiced.

The "join in" moments (`lib/kids/episodes/interactions.ts`) are voiced separately,
into `public/kids/audio/l1/<sessionId>/join/` and `lib/kids/episodes/interaction-audio.json`:

```bash
npx tsx scripts/kids-voices/export-interactions.ts /tmp/l1-join.json
tts/bin/python -I scripts/kids-voices/generate-interactions.py --join /tmp/l1-join.json --voices <voices dir>
```

If a script line is added or removed, check the `after:` line numbers in
`interactions.ts` against `audio-manifest.json`.

## Recording an episode to MP4

```bash
npx next dev -p 3611   # in a scratch copy
node scripts/kids-voices/record-episode.mjs --session L1-S01 --out /tmp/l1-s1.mp4 [--base http://localhost:3611] [--crf 18] [--lufs -14]
```

Playwright plays the episode at 1280×720 and records the page; the script then
builds the soundtrack from the same .ogg files at the times the player logged
(plus the music bed, rendered by the player's own generator offline) and muxes
it with ffmpeg. MP4s are artefacts — do not commit them.

## Credit line (CC BY 4.0)

> Voices made with Piper TTS. Amara, Bolt, Noor, Ms Mei and Mr Diego use the
> VCTK corpus (CSTR, University of Edinburgh, CC BY 4.0); Captain Ingrid uses
> the Piper "alba" voice (University of Edinburgh DataShare, CC BY 4.0). The
> VCTK, alba and Ms Adaeze (kathleen) voices are fine-tuned from a base model
> trained on Hi-Fi TTS (NVIDIA, CC BY 4.0).
