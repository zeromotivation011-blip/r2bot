#!/usr/bin/env python3
"""Render a vertical Short/Reel (1080x1920) from an autopilot package.

    python3 render_short.py <package.json> <brand> <out.mp4>

package.json is a queue item's payload: voiceover, scenes [{t, text, visual, broll?}], on_screen, title.
brand is r2bot | rajstudy | rajchaupal.

Voice: ElevenLabs when ELEVENLABS_API_KEY is set (and not PLACEHOLDER), else Microsoft Edge neural TTS (free).
B-roll: Pexels portrait videos (PEXELS_API_KEY), one clip per scene, chosen from the scene's `broll` keywords
or its `visual` description. Captions: word-timed, burned in. Nothing here is uploaded; see publish.py.
"""
import asyncio, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request
from pathlib import Path

W, H, FPS = 1080, 1920, 30
BRANDS = {
    'r2bot':      {'voice': 'en-US-AndrewMultilingualNeural', 'rate': '+8%', 'lang': 'en', 'handle': 'r2bot.in',
                   'name': 'R2BOT', 'accent': '&H000B9EF5', 'font': 'Inter', 'fallback': 'robot technology'},
    'rajstudy':   {'voice': 'hi-IN-MadhurNeural', 'rate': '+6%', 'lang': 'hi', 'handle': 'rajstudy.com',
                   'name': 'Raj Study', 'accent': '&H00336BFF', 'font': 'Noto Sans Devanagari', 'fallback': 'rajasthan india'},
    'rajchaupal': {'voice': 'hi-IN-MadhurNeural', 'rate': '+6%', 'lang': 'hi', 'handle': 'rajchaupal.com',
                   'name': 'राज चौपाल', 'accent': '&H0030A0E0', 'font': 'Noto Sans Devanagari', 'fallback': 'india parliament'},
}
STOP = set('a an the of on in at to and or with from for by is are its it this that into over under top down view shot '
           'wide close up x-ray screen r2bot logo full lesson quiz same then each one two'.split())


def sh(*args, **kw):
    return subprocess.run(list(args), check=True, capture_output=True, text=True, **kw).stdout


def duration(path):
    return float(sh('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)).strip())


# ---------- voice ----------
async def edge_voice(text, voice, rate, mp3):
    import edge_tts
    import edge_tts.communicate as ec
    if os.environ.get('SSL_CERT_FILE'):  # behind a TLS-inspecting proxy: trust its CA bundle (verification stays on)
        import ssl
        ec._SSL_CTX = ssl.create_default_context(cafile=os.environ['SSL_CERT_FILE'])
    last = None
    for attempt in range(5):  # the free service drops a request now and then; a retry almost always works
        words = []
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary')
            with open(mp3, 'wb') as f:
                async for chunk in comm.stream():
                    if chunk['type'] == 'audio':
                        f.write(chunk['data'])
                    elif chunk['type'] == 'WordBoundary':
                        start = chunk['offset'] / 1e7
                        words.append([chunk['text'], start, start + chunk['duration'] / 1e7])
            if words and Path(mp3).stat().st_size > 10_000:
                return words
            last = RuntimeError('empty audio')
        except Exception as e:  # noqa: BLE001
            last = e
        await asyncio.sleep(2 + 3 * attempt)
    raise RuntimeError(f'edge voice failed after 5 tries: {last}')


def eleven_voice(text, voice_id, key, mp3):
    body = json.dumps({'text': text, 'model_id': os.environ.get('ELEVEN_MODEL', 'eleven_multilingual_v2'),
                       'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.25, 'use_speaker_boost': True}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128',
                                 data=body, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=180))
    import base64
    Path(mp3).write_bytes(base64.b64decode(r['audio_base64']))
    al = r.get('alignment') or r['normalized_alignment']
    words, w = [], None
    for ch, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if ch.isspace():
            if w: words.append(w); w = None
            continue
        if w is None: w = [ch, a, b]
        else: w[0] += ch; w[2] = b
    if w: words.append(w)
    return words


def make_voice(text, brand, tmp):
    b = BRANDS[brand]
    mp3 = tmp / 'vo.mp3'
    key = os.environ.get('ELEVENLABS_API_KEY', '')
    voice_id = os.environ.get(f'ELEVEN_VOICE_{brand.upper()}') or os.environ.get('ELEVEN_VOICE')
    if key and key != 'PLACEHOLDER' and voice_id:
        words, engine = eleven_voice(text, voice_id, key, mp3), 'elevenlabs'
    else:
        words, engine = asyncio.run(edge_voice(text, b['voice'], b['rate'], mp3)), f'edge:{b["voice"]}'
    wav = tmp / 'vo.wav'
    sh('ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', str(wav))
    return wav, words, engine


# ---------- b-roll ----------
def keywords(scene, fallback):
    if scene.get('broll'):
        return scene['broll'] if isinstance(scene['broll'], str) else ' '.join(scene['broll'])
    words = [w for w in re.findall(r"[A-Za-z]+", scene.get('visual') or scene.get('text') or '') if w.lower() not in STOP and len(w) > 2]
    return ' '.join(words[:4]) or fallback


def pexels(query, key, used, min_dur):
    url = 'https://api.pexels.com/videos/search?' + urllib.parse.urlencode({'query': query, 'orientation': 'portrait', 'per_page': 15, 'size': 'medium'})
    req = urllib.request.Request(url, headers={'Authorization': key, 'User-Agent': 'autopilot-factory'})
    try:
        vids = json.load(urllib.request.urlopen(req, timeout=30)).get('videos', [])
    except Exception as e:  # noqa: BLE001 - a failed search falls back to the next query
        print('pexels search failed:', query, e, file=sys.stderr)
        return None
    for v in vids:
        if v['id'] in used or v.get('duration', 0) < min(min_dur, 6):
            continue
        files = [f for f in v['video_files'] if f.get('height') and f.get('width') and f['height'] >= f['width'] and 720 <= f['height'] <= 2160]
        if not files:
            continue
        f = sorted(files, key=lambda f: abs(f['height'] - 1920))[0]
        used.add(v['id'])
        return {'id': v['id'], 'link': f['link'], 'url': v['url'], 'by': (v.get('user') or {}).get('name')}
    return None


def fetch(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': 'autopilot-factory'})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, 'wb') as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)


# ---------- captions ----------
def ts(t):
    t = max(t, 0)
    return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def ass_escape(s):
    return s.replace('\\', '\\\\').replace('{', '(').replace('}', ')').replace('\n', ' ')


def build_ass(words, scenes, total, brand):
    b = BRANDS[brand]
    font = b['font']
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},84,&H00FFFFFF,&H00FFFFFF,&H00101010,&H64000000,1,0,0,0,100,100,0,0,1,6,2,2,80,80,560,1
Style: Head,{font},64,&H00FFFFFF,&H00FFFFFF,&H00000000,{b['accent'].replace('&H00', '&H30')},1,0,0,0,100,100,0,0,3,18,0,8,90,90,230,1
Style: Brand,Inter,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H78000000,1,0,0,0,100,100,1,0,3,10,0,8,60,60,90,1
Style: Handle,Inter,46,&H00FFFFFF,&H00FFFFFF,&H00000000,&H78000000,1,0,0,0,100,100,1,0,3,12,0,2,60,60,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = [f'Dialogue: 2,{ts(0)},{ts(total)},Brand,,0,0,0,,{ass_escape(b["name"])}',
          f'Dialogue: 2,{ts(max(total - 6, 0))},{ts(total)},Handle,,0,0,0,,{ass_escape(b["handle"])}']
    for sc in scenes:
        if sc.get('text'):
            ev.append(f'Dialogue: 1,{ts(sc["start"] + 0.15)},{ts(sc["end"] - 0.05)},Head,,0,0,0,,{{\\fad(150,100)}}{ass_escape(sc["text"])}')
    # word-timed captions, 3 words per line (Hindi words are longer: 3; English: 4)
    per = 3 if b['lang'] == 'hi' else 4
    groups, cur = [], []
    for k, w in enumerate(words):  # a pause of 0.25 s or more is a sentence break: never caption across it
        if cur and (len(cur) >= per or w[1] - cur[-1][2] >= 0.25):
            groups.append(cur); cur = []
        cur.append(w)
    if cur: groups.append(cur)
    for gi, grp in enumerate(groups):
        nxt = groups[gi + 1][0][1] if gi + 1 < len(groups) else grp[-1][2] + 0.4
        start, end = grp[0][1], min(nxt, grp[-1][2] + 0.35)
        parts = []
        for w, a, z in grp:
            k = max(1, int(round((z - a) * 100)))
            parts.append(f'{{\\kf{k}}}{ass_escape(w)}')
        # karaoke: words fill from white to the brand accent as they are spoken
        line = f'{{\\1c&H00FFFFFF&\\2c{b["accent"]}&}}' + ' '.join(parts)
        ev.append(f'Dialogue: 0,{ts(start)},{ts(min(end, total))},Cap,,0,0,0,,{line}')
    return head + '\n'.join(ev) + '\n'


# ---------- main ----------
def parse_t(t):
    m = re.match(r'\s*([\d.]+)\s*-\s*([\d.]+)', str(t or ''))
    return (float(m.group(1)), float(m.group(2))) if m else None


def render(pkg, brand, out):
    key = os.environ.get('PEXELS_API_KEY')
    if not key:
        sys.exit('PEXELS_API_KEY is not set')
    b = BRANDS[brand]
    tmp = Path(tempfile.mkdtemp(prefix='short-'))
    text = pkg['voiceover'].strip()
    wav, words, engine = make_voice(text, brand, tmp)
    total = duration(wav) + 0.6

    # scene timing: scale the package's planned seconds to the real voice length
    scenes = [dict(s) for s in pkg.get('scenes') or [{'text': pkg.get('title', ''), 'visual': pkg.get('title', '')}]]
    plan = [parse_t(s.get('t')) for s in scenes]
    if all(plan):
        end_planned = plan[-1][1] or 1
        for s, (a, z) in zip(scenes, plan):
            s['start'], s['end'] = a / end_planned * total, z / end_planned * total
    else:
        step = total / len(scenes)
        for i, s in enumerate(scenes):
            s['start'], s['end'] = i * step, (i + 1) * step
    scenes[0]['start'], scenes[-1]['end'] = 0, total

    used, credits, segs = set(), [], []
    for i, s in enumerate(scenes):
        d = s['end'] - s['start']
        clip = pexels(keywords(s, b['fallback']), key, used, d) or pexels(b['fallback'], key, used, d)
        seg = tmp / f'seg{i:02d}.mp4'
        vf = (f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},'
              f'eq=brightness=-0.06:saturation=1.05,format=yuv420p')
        if clip:
            src = tmp / f'src{i:02d}.mp4'
            fetch(clip['link'], src)
            credits.append(clip)
            sh('ffmpeg', '-v', 'error', '-y', '-stream_loop', '-1', '-i', str(src), '-t', f'{d:.3f}', '-vf', vf, '-an',
               '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', str(seg))
        else:  # no footage found: a plain dark card, so the render never fails on b-roll
            sh('ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0x0b1220:s={W}x{H}:r={FPS}', '-t', f'{d:.3f}',
               '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', str(seg))
        segs.append(seg)

    lst = tmp / 'list.txt'
    lst.write_text(''.join(f"file '{p}'\n" for p in segs))
    joined = tmp / 'joined.mp4'
    sh('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(joined))
    ass = tmp / 'cap.ass'
    ass.write_text(build_ass(words, scenes, total, brand), encoding='utf-8')
    fontsdir = str(Path.home() / '.fonts')
    sh('ffmpeg', '-v', 'error', '-y', '-i', str(joined), '-i', str(wav),
       '-filter_complex', f"[0:v]ass='{ass}':fontsdir='{fontsdir}'[v];[1:a]apad=pad_dur=0.6[a]",
       '-map', '[v]', '-map', '[a]', '-t', f'{total:.3f}', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '6M', '-bufsize', '12M',
       '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(out))
    meta = {'duration': round(duration(out), 2), 'voice': engine, 'scenes': len(scenes),
            'broll': [{'pexels_id': c['id'], 'url': c['url'], 'by': c['by']} for c in credits]}
    Path(str(out) + '.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    return meta


if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[2] not in BRANDS:
        sys.exit(__doc__)
    print(json.dumps(render(json.load(open(sys.argv[1], encoding='utf-8')), sys.argv[2], sys.argv[3]), ensure_ascii=False))
