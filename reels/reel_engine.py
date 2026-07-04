"""
R2BOT Reel Engine v3 — audio-first, sync-correct
1. Generate audio → measure exact duration
2. Render FRAMES = round(duration × FPS) frames
3. Section timing defined in SECONDS (not frames) → always in sync
"""

import os, sys, math, subprocess, requests
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from backgrounds import apply_background, radial_glow

W, H   = 1080, 1920
FPS    = 30
BG     = (4, 4, 12)
AMBER  = (245, 158, 11)
GOLD   = (255, 200,  50)
WHITE  = (255, 255, 255)
CREAM  = (255, 245, 220)
GRAY   = (150, 150, 170)
CYAN   = ( 60, 200, 240)
GREEN  = ( 60, 220, 120)
RED    = (220,  60,  60)

KEY  = "sk_7b8f5ea80a2eb8cd518d9824229e4c052f1390828c0673f0"
VID  = "omLr0bN17lYIC1JWLSYV"
VS   = {"stability":0.48,"similarity_boost":0.82,"style":0.45,"use_speaker_boost":True}

FP = "/usr/share/fonts/truetype/google-fonts/"
def font(style, size):
    m = {"bold":"Poppins-Bold.ttf","medium":"Poppins-Medium.ttf","regular":"Poppins-Regular.ttf"}
    return ImageFont.truetype(FP + m[style], size)

def ease_out(t):  return 1-(1-t)**3
def ease_in(t):   return t**3
def clamp(v,lo=0.,hi=1.): return max(lo,min(hi,v))

def prg(t, s, e):
    """Progress of time t within window [s,e] in seconds"""
    if t<=s: return 0.
    if t>=e: return 1.
    return (t-s)/(e-s)

def wrap(text, max_chars=18):
    words = text.split()
    lines, cur = [], []
    for w in words:
        if sum(len(x)+1 for x in cur)+len(w) > max_chars:
            lines.append(" ".join(cur)); cur=[w]
        else: cur.append(w)
    if cur: lines.append(" ".join(cur))
    return lines

def big(draw, text, cy, size, color, alpha, mc=17, shadow=True):
    f = font("bold", size)
    lines = wrap(text, mc)
    lh = size+14; sy = cy-(len(lines)*lh)//2
    a  = int(255*clamp(alpha))
    for i, ln in enumerate(lines):
        y = sy+i*lh
        if shadow: draw.text((W//2+3,y+3),ln,font=f,fill=(0,0,0,int(a*.4)),anchor="mm")
        draw.text((W//2,y),ln,font=f,fill=(*color,a),anchor="mm")

def sub(draw, text, cy, size, color, alpha, mc=32):
    f = font("regular", size)
    lines = wrap(text, mc)
    lh = size+10; sy = cy-(len(lines)*lh)//2
    a  = int(255*clamp(alpha))
    for i, ln in enumerate(lines):
        draw.text((W//2,sy+i*lh),ln,font=f,fill=(*color,a),anchor="mm")

def med(draw, text, cy, size, color, alpha, mc=24):
    f = font("medium", size)
    lines = wrap(text, mc)
    lh = size+12; sy = cy-(len(lines)*lh)//2
    a  = int(255*clamp(alpha))
    for i, ln in enumerate(lines):
        draw.text((W//2,sy+i*lh),ln,font=f,fill=(*color,a),anchor="mm")

def bar(draw, y, frac, alpha=1.0):
    bw = int(W*0.72*clamp(frac))
    if bw < 2: return
    draw.rounded_rectangle([W//2-bw//2,y,W//2+bw//2,y+5],radius=3,
                             fill=(*AMBER,int(255*clamp(alpha))))

def badge(img, alpha=1.0):
    layer = Image.new("RGBA",(W,H),(0,0,0,0))
    ld = ImageDraw.Draw(layer)
    a = int(200*alpha)
    ld.rounded_rectangle([44,72,280,132],radius=30,fill=(20,20,40,a),
                          outline=(*AMBER,int(120*alpha)),width=2)
    ld.text((68,87),"R2",font=font("bold",38),fill=(*AMBER,int(255*alpha)))
    ld.text((118,93),"BOT",font=font("bold",30),fill=(*WHITE,int(255*alpha)))
    img.alpha_composite(layer)

def cta_section(img, draw, t, dur, color=AMBER):
    """Generic CTA — used by all reels in final 3 seconds"""
    cta_start = dur - 3.0
    p = ease_out(prg(t, cta_start, cta_start+1.2))
    pulse = 0.5+0.5*math.sin((t-cta_start)*4)
    radial_glow(img, W//2, H//2, int(380+70*pulse), (150,90,5), 0.20*p)
    draw = ImageDraw.Draw(img)
    p2 = ease_out(prg(t, cta_start+0.2, cta_start+1.5))
    big(draw, "R2BOT", 820, 118, color, p2, mc=12)
    p3 = ease_out(prg(t, cta_start+0.6, cta_start+2.0))
    sub(draw, "Zero → Robotics Engineer", 960, 40, WHITE, p3*.85, 32)
    sub(draw, "r2bot.in  •  Free to start", 1015, 34, GRAY, p3*.7, 32)
    return draw


def generate_audio(script, path):
    """Generate ElevenLabs voiceover and return exact float duration via ffprobe."""
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VID}",
        headers={"xi-api-key": KEY, "Content-Type": "application/json"},
        json={"text": script, "model_id": "eleven_turbo_v2_5", "voice_settings": VS}
    )
    if r.status_code != 200:
        raise RuntimeError(f"ElevenLabs {r.status_code}: {r.text[:200]}")
    open(path, "wb").write(r.content)
    out = subprocess.check_output(
        ["ffprobe","-v","quiet","-show_entries","format=duration",
         "-of","csv=p=0", path], text=True
    )
    dur = float(out.strip())
    print(f"Audio: {len(r.content)//1024}KB  duration={dur:.2f}s  frames={round(dur*FPS)}")
    return dur


def make_stat_render(hero_big, hero_label, facts, bg_index=0):
    """
    Universal text-forward renderer — v4 style.
      0 → 3s    : HERO STAT slams in  (big number/word + context label)
      3s → -3s  : FACT CARDS cycle    (3 punchy lines, each ~4-5s)
      last 3s   : CTA
    """
    def render(t, dur):
        img = Image.new("RGBA", (W, H), (*BG, 255))
        apply_background(img, int(t * FPS), bg_index)
        draw = ImageDraw.Draw(img)
        badge(img, clamp(ease_out(prg(t, 0, 0.8))))
        draw = ImageDraw.Draw(img)

        # ── SECTION 1: Hero stat slam (0 → 3s) ───────────────────────
        if t < 3.0:
            p  = ease_out(prg(t, 0, 1.0))
            # Overshoot bounce on entry
            ov = 1.0 + 0.06 * math.sin(prg(t, 0, 0.5) * math.pi)
            sz = int((30 + 170 * p) * ov)
            sz = min(sz, 180)
            big(draw, hero_big, H // 2 - 90, sz, AMBER, p, mc=12)
            if t > 1.0:
                p2 = ease_out(prg(t, 1.0, 2.4))
                med(draw, hero_label, H // 2 + 100, 50, WHITE, p2 * 0.9, mc=28)
                bar(draw, H // 2 + 200, p2, p2)

        # ── SECTION 2: Fact cards (3s → dur-3s) ──────────────────────
        elif t < dur - 3.0:
            local   = t - 3.0
            total   = dur - 6.0
            seg_dur = total / len(facts)
            idx     = min(int(local / seg_dur), len(facts) - 1)
            seg_t   = local - idx * seg_dur

            p_in  = ease_out(prg(seg_t, 0, min(0.45, seg_dur * 0.28)))
            p_out = ease_in (prg(seg_t, seg_dur - 0.35, seg_dur))
            alpha = clamp(p_in - p_out)
            slide = int(28 * (1 - p_in))

            # Progress dots
            for di in range(len(facts)):
                cx = W // 2 + (di - len(facts) // 2) * 54
                r  = 11 if di == idx else 6
                c  = AMBER if di == idx else GRAY
                a  = int((240 if di == idx else 100) * alpha)
                draw.ellipse([cx-r, 220-r, cx+r, 220+r], fill=(*c, a))

            # Fact text
            big(draw, facts[idx], H // 2 + slide, 84, WHITE, alpha, mc=20)
            bar(draw, H // 2 + 210 + slide, alpha, alpha)

            # Fact number in corner
            sub(draw, f"{idx+1} / {len(facts)}", 1720, 32, GRAY, alpha * 0.6, 20)

        # ── SECTION 3: CTA (last 3s) ──────────────────────────────────
        else:
            cta_section(img, draw, t, dur)

        return img.convert("RGB")
    return render


# ══════════════════════════════════════════════════════════════════════════════
# REEL DEFINITIONS  (each returns a render function that takes (t, dur) → frame)
# t   = current time in seconds
# dur = total audio duration in seconds
# ══════════════════════════════════════════════════════════════════════════════

def make_chess_render(bg_index=0):
    """Reel 002 — The Mechanical Turk (fixed sync version)"""
    def render(t, dur):
        img  = Image.new("RGBA",(W,H),(*BG,255))
        apply_background(img, int(t*FPS), bg_index)
        draw = ImageDraw.Draw(img)
        badge(img, clamp(ease_out(prg(t,0,.8))))
        draw = ImageDraw.Draw(img)

        # 0-3s  HOOK
        if t < 3.0:
            p = ease_out(prg(t,0,1.2))
            sub(draw,"In 1769...",360,48,GRAY,p*.9,28)
            p2 = ease_out(prg(t,.5,2.2))
            big(draw,"A machine beat",530,88,WHITE,p2,17)
            big(draw,"Napoleon at chess.",660,88,AMBER,p2,17)
            p3 = ease_out(prg(t,1.2,2.8))
            draw.text((W//2,820),"♟",font=font("regular",90),
                      fill=(*WHITE,int(200*p3)),anchor="mm")

        # 3-8s  TENSION
        elif t < 8.0:
            lt = t-3.0
            p_in  = ease_out(prg(lt,0,1.2))
            p_out = ease_in(prg(lt,3.8,5.0))
            a = clamp(p_in-p_out)
            big(draw,"Napoleon tried",460,84,WHITE,p_in*a,17)
            big(draw,"to CHEAT.",580,84,RED,p_in*a,14)
            bar(draw,640,ease_out(prg(lt,.4,1.8))*a,a)
            p2 = ease_out(prg(lt,1.0,2.8))
            big(draw,"The machine",760,78,CREAM,p2*a,16)
            big(draw,"caught him every time.",880,78,WHITE,p2*a,17)
            p3 = ease_out(prg(lt,2.0,3.5))
            draw.text((W//2,1020),"😤",font=font("regular",80),
                      fill=(*WHITE,int(200*p3*a)),anchor="mm")

        # 8-14s  TWIST
        elif t < 14.0:
            lt = t-8.0
            p_in  = ease_out(prg(lt,0,1.2))
            p_out = ease_in(prg(lt,4.5,6.0))
            a = clamp(p_in-p_out)
            sub(draw,"But there was a secret...",360,46,GRAY,p_in*a,30)
            p2 = ease_out(prg(lt,.6,2.0))
            big(draw,"There was",510,86,WHITE,p2*a,16)
            big(draw,"NO machine.",640,104,AMBER,p2*a,14)
            # Strikethrough
            if p2*a > 0.4:
                sp = ease_out(prg(lt,1.2,2.5))
                f_tmp = font("bold",104)
                bbox = draw.textbbox((0,0),"NO machine.",font=f_tmp)
                tw = bbox[2]-bbox[0]
                sx = W//2-tw//2
                draw.rectangle([sx,637,sx+int(tw*sp),643],fill=(*RED,int(220*p2*a)))
            p3 = ease_out(prg(lt,2.0,3.5))
            sub(draw,"A chess grandmaster",790,44,CREAM,p3*a,30)
            sub(draw,"was hiding inside.",840,44,CREAM,p3*a,30)
            p4 = ease_out(prg(lt,3.0,5.0))
            sub(draw,"84 years of deception.",980,42,AMBER,p4*a,30)

        # 14-dur  CTA
        else:
            sub(draw,"The greatest robot hoax",580,44,GRAY,
                ease_out(prg(t,14.0,15.2)),32)
            sub(draw,"in history.",636,44,GRAY,
                ease_out(prg(t,14.0,15.2)),32)
            cta_section(img,draw,t,dur)

        return img.convert("RGB")
    return render


def make_davinci_render(bg_index=1):
    """Reel 003 — Leonardo da Vinci's Robot"""
    def render(t, dur):
        img  = Image.new("RGBA",(W,H),(*BG,255))
        apply_background(img, int(t*FPS), bg_index)
        draw = ImageDraw.Draw(img)
        badge(img, clamp(ease_out(prg(t,0,.8))))
        draw = ImageDraw.Draw(img)

        if t < 3.5:
            p = ease_out(prg(t,0,1.2))
            sub(draw,"500 years before Boston Dynamics...",380,44,GRAY,p*.9,34)
            p2 = ease_out(prg(t,.6,2.2))
            big(draw,"Leonardo da Vinci",540,82,AMBER,p2,18)
            big(draw,"built a robot.",670,82,WHITE,p2,16)
            p3 = ease_out(prg(t,1.4,3.0))
            draw.text((W//2,830),"🤖",font=font("regular",90),
                      fill=(*WHITE,int(200*p3)),anchor="mm")
            big(draw,"1495  A.D.",980,58,GOLD,p3,14)

        elif t < 9.0:
            lt = t-3.5
            p_in  = ease_out(prg(lt,0,1.2))
            p_out = ease_in(prg(lt,4.2,5.5))
            a = clamp(p_in-p_out)
            big(draw,"A mechanical knight.",440,80,WHITE,p_in*a,17)
            bar(draw,500,ease_out(prg(lt,.3,1.5))*a,a)
            p2 = ease_out(prg(lt,.8,2.5))
            sub(draw,"Sit. Stand. Raise its visor.",620,44,CREAM,p2*a,30)
            sub(draw,"Move its arms.",676,44,CREAM,p2*a,30)
            p3 = ease_out(prg(lt,2.2,3.8))
            sub(draw,"The plans were lost",820,44,GRAY,p3*a,30)
            sub(draw,"for 500 years.",876,44,GRAY,p3*a,30)

        elif t < 16.0:
            lt = t-9.0
            p_in  = ease_out(prg(lt,0,1.2))
            p_out = ease_in(prg(lt,5.5,7.0))
            a = clamp(p_in-p_out)
            sub(draw,"In 2002, NASA engineers",360,44,GRAY,p_in*a,32)
            sub(draw,"found the original sketches.",414,44,GRAY,p_in*a,32)
            bar(draw,454,ease_out(prg(lt,.3,1.4))*a,a)
            p2 = ease_out(prg(lt,.8,2.5))
            big(draw,"They built it.",570,84,WHITE,p2*a,16)
            p3 = ease_out(prg(lt,2.0,3.5))
            big(draw,"It worked.",720,96,GREEN,p3*a,14)
            big(draw,"First try.",840,80,CREAM,p3*a,14)
            p4 = ease_out(prg(lt,3.5,5.5))
            draw.text((W//2,990),"🎨  🤖",font=font("regular",72),
                      fill=(*WHITE,int(190*p4*a)),anchor="mm")
            sub(draw,"The man who painted the Mona Lisa.",1100,38,AMBER,p4*a,36)

        else:
            cta_section(img,draw,t,dur)
        return img.convert("RGB")
    return render


def make_titanic_render(bg_index=2):
    """Reel 004 — Robot That Found the Titanic"""
    def render(t, dur):
        img  = Image.new("RGBA",(W,H),(*BG,255))
        apply_background(img, int(t*FPS), bg_index)
        draw = ImageDraw.Draw(img)
        badge(img, clamp(ease_out(prg(t,0,.8))))
        draw = ImageDraw.Draw(img)

        if t < 3.5:
            p = ease_out(prg(t,0,1.2))
            big(draw,"The Titanic was not",440,86,WHITE,p,17)
            big(draw,"found by humans.",570,86,WHITE,p,17)
            bar(draw,630,ease_out(prg(t,.5,1.8))*p,p)
            p2 = ease_out(prg(t,1.0,2.8))
            big(draw,"It was found",750,80,CREAM,p2,16)
            big(draw,"by a robot.",870,80,GREEN,p2,14)
            p3 = ease_out(prg(t,1.8,3.2))
            draw.text((W//2,1020),"🚢",font=font("regular",88),
                      fill=(*WHITE,int(200*p3)),anchor="mm")

        elif t < 9.0:
            lt = t-3.5
            p_in  = ease_out(prg(lt,0,1.2))
            p_out = ease_in(prg(lt,4.2,5.5))
            a = clamp(p_in-p_out)
            big(draw,"1985.",340,68,AMBER,p_in*a,12)
            sub(draw,"Robert Ballard sent a deep-sea",420,42,GRAY,p_in*a,34)
            sub(draw,"robot to the ocean floor.",474,42,GRAY,p_in*a,34)
            bar(draw,514,ease_out(prg(lt,.3,1.4))*a,a)
            p2 = ease_out(prg(lt,.8,2.5))
            big(draw,"Its name: ARGO.",640,90,GREEN,p2*a,15)
            p3 = ease_out(prg(lt,2.2,3.8))
            sub(draw,"Cameras. Sonar. No crew.",790,42,CREAM,p3*a,30)
            sub(draw,"Just a robot in the deep.",844,42,CREAM,p3*a,30)

        elif t < 16.0:
            lt = t-9.0
            p_in  = ease_out(prg(lt,0,1.2))
            p_out = ease_in(prg(lt,5.5,7.0))
            a = clamp(p_in-p_out)
            big(draw,"2:47 AM",310,78,AMBER,p_in*a,12)
            sub(draw,"ARGO spotted a rusted boiler.",400,44,CREAM,p_in*a,32)
            bar(draw,440,ease_out(prg(lt,.4,1.5))*a,a)
            p2 = ease_out(prg(lt,.8,2.5))
            sub(draw,"The crew fell silent.",560,44,WHITE,p2*a,30)
            sub(draw,"Nobody moved.",620,44,WHITE,p2*a,30)
            p3 = ease_out(prg(lt,2.4,4.0))
            f_big = font("bold",150)
            draw.text((W//2+3,813),"73",font=f_big,fill=(0,0,0,int(100*p3*a)),anchor="mm")
            draw.text((W//2,810),"73",font=f_big,fill=(*AMBER,int(255*p3*a)),anchor="mm")
            sub(draw,"years of human searches. All failed.",930,40,GRAY,p3*a,36)
            p4 = ease_out(prg(lt,4.2,5.8))
            big(draw,"ARGO found it first.",1070,74,GREEN,p4*a,18)

        else:
            sub(draw,"Machines have already",570,44,GRAY,
                ease_out(prg(t,16.0,17.2)),32)
            sub(draw,"changed history.",626,44,GRAY,
                ease_out(prg(t,16.0,17.2)),32)
            cta_section(img,draw,t,dur)
        return img.convert("RGB")
    return render


# ══════════════════════════════════════════════════════════════════════════════
# ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def generate_audio(script, path):
    print("  🎙  Generating audio...")
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VID}",
        headers={"xi-api-key":KEY,"Content-Type":"application/json"},
        json={"text":script,"model_id":"eleven_turbo_v2_5","voice_settings":VS}
    )
    assert r.status_code == 200, f"ElevenLabs {r.status_code}: {r.text[:200]}"
    open(path,"wb").write(r.content)
    dur = float(subprocess.check_output(
        ["ffprobe","-v","quiet","-show_entries","format=duration",
         "-of","csv=p=0",path]).decode().strip())
    print(f"  ✓ Audio: {len(r.content)//1024}KB  duration={dur:.2f}s")
    return dur

def render_reel(render_fn, dur, frames_dir, start=0, end=None):
    end = end or int(round(dur*FPS))
    os.makedirs(frames_dir, exist_ok=True)
    for i in range(start, end):
        t = i / FPS
        render_fn(t, dur).save(f"{frames_dir}/f{i:04d}.png")
    return end

def encode(frames_dir, audio_path, silent_path, final_path, total_frames):
    print("  🎬  Encoding video...")
    subprocess.run([
        "ffmpeg","-y","-framerate",str(FPS),
        "-i",f"{frames_dir}/f%04d.png",
        "-c:v","libx264","-pix_fmt","yuv420p","-crf","18","-preset","fast",
        silent_path
    ], check=True, capture_output=True)
    subprocess.run([
        "ffmpeg","-y","-i",silent_path,"-i",audio_path,
        "-c:v","copy","-c:a","aac","-shortest",final_path
    ], check=True, capture_output=True)
    sz = os.path.getsize(final_path)//1024
    print(f"  ✅ {final_path}  ({sz}KB)")
    return final_path
