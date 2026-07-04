"""
R2BOT Reel v2 — redesigned visuals
Topic: The Chess Robot That Fooled Napoleon (The Mechanical Turk)
Voice: omLr0bN17lYIC1JWLSYV
"""

import os, math, random, subprocess, requests, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Config ────────────────────────────────────────────────────────────────────
W, H      = 1080, 1920
FPS       = 30
DURATION  = 20
FRAMES    = FPS * DURATION
OUT_DIR   = "/sessions/upbeat-pensive-euler/mnt/r2bot/reels"
FRAMES_DIR= "/tmp/r2bot_v2_frames"

ELEVENLABS_KEY = "sk_7b8f5ea80a2eb8cd518d9824229e4c052f1390828c0673f0"
VOICE_ID       = "omLr0bN17lYIC1JWLSYV"

# ── Brand Palette v2 ──────────────────────────────────────────────────────────
BG       = (4,   4,  12)        # near-black blue
AMBER    = (245, 158, 11)
GOLD     = (255, 200,  50)
WHITE    = (255, 255, 255)
CREAM    = (255, 245, 220)
GRAY     = (160, 160, 180)
RED_ACC  = (220,  60,  60)      # drama accent
DIM      = ( 30,  30,  50)

# ── Fonts ─────────────────────────────────────────────────────────────────────
FP = "/usr/share/fonts/truetype/google-fonts/"
def font(style, size):
    m = {"bold":"Poppins-Bold.ttf","medium":"Poppins-Medium.ttf","regular":"Poppins-Regular.ttf"}
    return ImageFont.truetype(FP + m[style], size)

# ── Easing ────────────────────────────────────────────────────────────────────
def ease_out(t):    return 1 - (1-t)**3
def ease_in(t):     return t**3
def ease_bounce(t): return 1 - abs(math.cos(t * math.pi * 2.5)) * (1-t)
def clamp(v,lo=0.,hi=1.): return max(lo, min(hi, v))
def prg(f, s, e):
    if f <= s: return 0.
    if f >= e: return 1.
    return (f-s)/(e-s)

# ── Particle system ───────────────────────────────────────────────────────────
random.seed(42)
PARTICLES = []
for _ in range(55):
    PARTICLES.append({
        "x":  random.randint(50, W-50),
        "y":  random.randint(0, H),
        "vy": random.uniform(0.3, 1.4),        # upward speed (px/frame)
        "r":  random.uniform(1.5, 4.0),        # radius
        "alpha": random.uniform(60, 180),      # base opacity
        "phase": random.uniform(0, math.pi*2), # sine wobble phase
        "wobble": random.uniform(0.3, 1.0),    # horizontal wobble strength
    })

def draw_particles(img, frame_num):
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    for p in PARTICLES:
        # Current position
        y = (p["y"] - p["vy"] * frame_num) % H
        x = p["x"] + math.sin(frame_num * 0.03 + p["phase"]) * p["wobble"] * 18
        r = p["r"]
        # Twinkle
        twinkle = 0.6 + 0.4 * math.sin(frame_num * 0.08 + p["phase"])
        a = int(p["alpha"] * twinkle)
        # Glow (outer)
        for gr in [r*3, r*2, r]:
            ga = int(a * 0.15 * (r*3 - gr + r) / (r*3))
            ld.ellipse([x-gr, y-gr, x+gr, y+gr], fill=(*GOLD, ga))
        # Core
        ld.ellipse([x-r, y-r, x+r, y+r], fill=(*GOLD, a))
    img.alpha_composite(layer)

def draw_radial_glow(img, cx, cy, radius, color, strength=0.18):
    """Soft radial glow painted onto image"""
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    steps = 8
    for i in range(steps, 0, -1):
        r_step = int(radius * i / steps)
        a = int(255 * strength * (1 - i/steps)**1.5)
        ld.ellipse([cx-r_step, cy-r_step, cx+r_step, cy+r_step],
                   fill=(*color, a))
    img.alpha_composite(layer)

def draw_vignette(img, strength=0.65):
    """Dark vignette around edges"""
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    steps = 30
    for i in range(steps, 0, -1):
        margin_x = int(W * i / (steps * 1.5))
        margin_y = int(H * i / (steps * 1.5))
        a = int(255 * strength * (i/steps)**2)
        ld.rectangle([0, 0, margin_x, H], fill=(0,0,0,a))
        ld.rectangle([W-margin_x, 0, W, H], fill=(0,0,0,a))
        ld.rectangle([0, 0, W, margin_y], fill=(0,0,0,a))
        ld.rectangle([0, H-margin_y, W, H], fill=(0,0,0,a))
    img.alpha_composite(layer)

def draw_r2bot_badge(img, alpha=1.0):
    """Small R2BOT badge top-left"""
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    # Pill background
    a = int(200 * alpha)
    ld.rounded_rectangle([44, 72, 280, 132], radius=30,
                          fill=(20, 20, 40, a), outline=(*AMBER, int(120*alpha)), width=2)
    f1 = font("bold", 38)
    f2 = font("bold", 30)
    ld.text((68, 87), "R2", font=f1, fill=(*AMBER, int(255*alpha)))
    ld.text((118, 93), "BOT", font=f2, fill=(*WHITE, int(255*alpha)))
    img.alpha_composite(layer)

def wrap_text(text, max_chars=22):
    """Simple word wrap"""
    words = text.split()
    lines, cur = [], []
    for w in words:
        if sum(len(x)+1 for x in cur) + len(w) > max_chars:
            lines.append(" ".join(cur)); cur = [w]
        else:
            cur.append(w)
    if cur: lines.append(" ".join(cur))
    return lines

def draw_big_text(draw, text, cy, size, color, alpha, max_chars=18, shadow=True):
    """Center-aligned big text with optional drop shadow"""
    f = font("bold", size)
    lines = wrap_text(text, max_chars)
    line_h = size + 12
    total_h = len(lines) * line_h
    start_y = cy - total_h // 2
    a = int(255 * alpha)
    for i, line in enumerate(lines):
        y = start_y + i * line_h
        if shadow:
            draw.text((W//2+4, y+4), line, font=f,
                      fill=(0,0,0,int(a*0.5)), anchor="mm")
        draw.text((W//2, y), line, font=f, fill=(*color, a), anchor="mm")
    return total_h

def draw_sub_text(draw, text, cy, size, color, alpha, max_chars=30):
    f = font("regular", size)
    lines = wrap_text(text, max_chars)
    line_h = size + 10
    total_h = len(lines) * line_h
    start_y = cy - total_h // 2
    a = int(255 * alpha)
    for i, line in enumerate(lines):
        draw.text((W//2, start_y + i*line_h), line,
                  font=f, fill=(*color, a), anchor="mm")

def amber_bar(draw, y, width_frac, alpha=1.0):
    bw = int(W * 0.75 * width_frac)
    a = int(255 * alpha)
    draw.rounded_rectangle(
        [W//2 - bw//2, y, W//2 + bw//2, y+5],
        radius=3, fill=(*AMBER, a))

# ── SCRIPT ────────────────────────────────────────────────────────────────────
SCRIPT = (
    "In 1769, a machine beat Napoleon Bonaparte at chess. "
    "Napoleon was so furious he tried to cheat. "
    "The machine caught him — every single time. "
    "But there was a secret: there was no machine. "
    "A chess grandmaster was hiding inside, moving pieces through a hidden mechanism. "
    "The Mechanical Turk fooled kings and emperors for 84 years. "
    "The greatest robot hoax in history. "
    "Follow R2BOT for the stories behind the machines."
)

# ── FRAME SECTIONS ────────────────────────────────────────────────────────────
# 0-3s   (f 0-89):   HOOK — "In 1769, a machine beat Napoleon at chess"
# 3-7s   (f 90-209): TENSION — "Napoleon tried to cheat. It caught him."
# 7-12s  (f 210-359): TWIST — "There was NO machine."
# 12-17s (f 360-509): REVEAL — Grandmaster hiding inside / 84 years
# 17-20s (f 510-599): CTA

def render_frame(fn):
    img = Image.new("RGBA", (W, H), (*BG, 255))

    # ── Background elements ────────────────────────────────────────────────
    # Warm radial glow — center of frame, low intensity
    draw_radial_glow(img, W//2, H//2, 900, (180, 100, 10), strength=0.12)
    # Bottom glow (stage light feel)
    draw_radial_glow(img, W//2, H+100, 700, (200, 120, 10), strength=0.20)

    # Particles
    draw_particles(img, fn)

    # Vignette (always)
    draw_vignette(img, strength=0.55)

    draw = ImageDraw.Draw(img)

    # R2BOT badge (fades in by frame 20)
    badge_a = clamp(ease_out(prg(fn, 5, 30)))
    draw_r2bot_badge(img, alpha=badge_a)
    draw = ImageDraw.Draw(img)

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 1 — HOOK (frames 0–89)
    # ─────────────────────────────────────────────────────────────────────────
    if fn < 90:
        # Year stamp — slams in first
        p_year = ease_out(prg(fn, 0, 20))
        f_year = font("bold", 52)
        draw.text((W//2, 350), "1769", font=f_year,
                  fill=(*AMBER, int(255*p_year)), anchor="mm")

        # Horizontal line under year
        bar_p = ease_out(prg(fn, 5, 35))
        amber_bar(draw, 375, bar_p * p_year, alpha=p_year)

        # Main hook text
        p_hook = ease_out(prg(fn, 10, 55))
        draw_big_text(draw, "A machine beat Napoleon Bonaparte", 620, 86,
                      WHITE, p_hook, max_chars=16)

        # "at chess." emphasis
        p_chess = ease_out(prg(fn, 30, 70))
        draw_big_text(draw, "at chess.", 820, 96,
                      AMBER, p_chess, max_chars=16)

        # Subtle emoji
        p_em = ease_out(prg(fn, 45, 80))
        f_em = font("regular", 80)
        draw.text((W//2, 980), "♟", font=f_em,
                  fill=(*WHITE, int(200*p_em)), anchor="mm")

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 2 — TENSION (frames 90–209)
    # ─────────────────────────────────────────────────────────────────────────
    elif fn < 210:
        loc = fn - 90
        p_in  = ease_out(prg(loc, 0, 35))
        p_out = ease_in(prg(loc, 85, 120))
        a = clamp(p_in - p_out)

        # Napoleon tried to cheat
        draw_big_text(draw, "Napoleon tried to CHEAT.", 480, 82,
                      WHITE, a * p_in, max_chars=18)

        # Separator
        bar_p2 = ease_out(prg(loc, 15, 55))
        amber_bar(draw, 590, bar_p2 * a, alpha=a)

        # It caught him
        p_caught = ease_out(prg(loc, 25, 70))
        draw_big_text(draw, "The machine caught him", 700, 78,
                      CREAM, p_caught * a, max_chars=18)

        p_every = ease_out(prg(loc, 40, 80))
        draw_big_text(draw, "every single time.", 820, 82,
                      AMBER, p_every * a, max_chars=18)

        # Drama accent
        if loc > 50:
            p_em = ease_out(prg(loc, 50, 90))
            f_em = font("regular", 72)
            draw.text((W//2, 1000), "😤", font=f_em,
                      fill=(*WHITE, int(200*p_em*a)), anchor="mm")

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 3 — TWIST (frames 210–359)
    # ─────────────────────────────────────────────────────────────────────────
    elif fn < 360:
        loc = fn - 210
        p_in  = ease_out(prg(loc, 0, 30))
        p_out = ease_in(prg(loc, 110, 150))
        a = clamp(p_in - p_out)

        # "But there was a secret..." small
        p_but = ease_out(prg(loc, 0, 40))
        draw_sub_text(draw, "But there was a secret...", 380, 46,
                      GRAY, p_but * a, max_chars=30)

        # THE BIG TWIST
        p_twist = ease_out(prg(loc, 15, 55))
        # Flash effect on reveal
        if 15 <= loc <= 25:
            flash_a = ease_out(prg(loc, 15, 20)) * (1 - ease_in(prg(loc, 20, 25)))
            flash_layer = Image.new("RGBA", (W, H), (255,200,50, int(40*flash_a)))
            img.alpha_composite(flash_layer)
            draw = ImageDraw.Draw(img)

        draw_big_text(draw, "There was", 560, 88,
                      WHITE, p_twist * a, max_chars=16)
        draw_big_text(draw, "NO machine.", 680, 108,
                      AMBER, p_twist * a, max_chars=16)

        # Strikethrough effect on "machine" — draw a line across
        if p_twist > 0.6:
            strike_p = ease_out(prg(loc, 40, 75))
            f_tmp = font("bold", 108)
            bbox = draw.textbbox((0,0), "NO machine.", font=f_tmp)
            tw = bbox[2]-bbox[0]
            sx = W//2 - tw//2
            sy = 680 - 8
            sw = int(tw * strike_p)
            draw.rectangle([sx, sy, sx+sw, sy+6],
                           fill=(*RED_ACC, int(220*p_twist*a)))

        # Reveal hint
        p_hint = ease_out(prg(loc, 60, 105))
        draw_sub_text(draw, "A human was hiding inside.", 850, 44,
                      CREAM, p_hint * a, max_chars=30)

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 4 — REVEAL (frames 360–509)
    # ─────────────────────────────────────────────────────────────────────────
    elif fn < 510:
        loc = fn - 360
        p_in  = ease_out(prg(loc, 0, 35))
        p_out = ease_in(prg(loc, 115, 150))
        a = clamp(p_in - p_out)

        # Chess grandmaster hiding inside
        draw_big_text(draw, "A chess grandmaster", 380, 74,
                      WHITE, p_in * a, max_chars=20)
        draw_big_text(draw, "hid inside the machine.", 480, 74,
                      CREAM, p_in * a, max_chars=22)

        # Divider
        bar_p = ease_out(prg(loc, 20, 60))
        amber_bar(draw, 548, bar_p * a, alpha=a)

        # 84 years — big number
        p_84 = ease_out(prg(loc, 30, 70))
        f_num = font("bold", 140)
        draw.text((W//2, 720), "84", font=f_num,
                  fill=(*AMBER, int(255*p_84*a)), anchor="mm")
        draw_sub_text(draw, "years of deception", 820, 48,
                      GRAY, p_84 * a, max_chars=28)

        # People it fooled
        p_fool = ease_out(prg(loc, 55, 95))
        draw_sub_text(draw, "It fooled kings, emperors & Benjamin Franklin.", 940, 36,
                      CREAM, p_fool * a, max_chars=38)

        # Bottom label
        p_lab = ease_out(prg(loc, 75, 115))
        draw_sub_text(draw, "The greatest robot hoax in history.", 1040, 38,
                      AMBER, p_lab * a, max_chars=34)

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 5 — CTA (frames 510–599)
    # ─────────────────────────────────────────────────────────────────────────
    else:
        loc = fn - 510
        p = ease_out(prg(loc, 0, 35))

        # Glow pulse
        pulse = 0.5 + 0.5*math.sin(loc*0.18)
        draw_radial_glow(img, W//2, H//2, int(500+100*pulse),
                         (200, 120, 10), strength=0.25*p)
        draw = ImageDraw.Draw(img)

        # "Follow" text
        p2 = ease_out(prg(loc, 5, 40))
        draw_sub_text(draw, "Follow for more forgotten", 640, 44,
                      GRAY, p2, max_chars=30)
        draw_sub_text(draw, "stories of machines.", 696, 44,
                      GRAY, p2, max_chars=30)

        # R2BOT big
        p3 = ease_out(prg(loc, 8, 42))
        f_big = font("bold", 120)
        draw.text((W//2+3, 850+3), "R2BOT", font=f_big,
                  fill=(0,0,0,int(120*p3)), anchor="mm")
        draw.text((W//2, 850), "R2BOT", font=f_big,
                  fill=(*AMBER, int(255*p3)), anchor="mm")

        # Tagline
        p4 = ease_out(prg(loc, 20, 55))
        draw_sub_text(draw, "Zero → Robotics Engineer", 1000, 40,
                      WHITE, p4*0.85, max_chars=30)
        draw_sub_text(draw, "r2bot.in  •  Free to start", 1060, 34,
                      GRAY, p4*0.7, max_chars=30)

    return img.convert("RGB")

# ── GENERATE AUDIO ─────────────────────────────────────────────────────────
def generate_audio(path):
    print("🎙  Generating voiceover (new voice)...")
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers={"xi-api-key": ELEVENLABS_KEY, "Content-Type":"application/json"},
        json={
            "text": SCRIPT,
            "model_id": "eleven_turbo_v2_5",
            "voice_settings": {
                "stability": 0.48,
                "similarity_boost": 0.82,
                "style": 0.45,
                "use_speaker_boost": True
            }
        }
    )
    if r.status_code == 200:
        open(path, "wb").write(r.content)
        print(f"  ✓ {len(r.content)//1024}KB saved")
        return True
    print(f"  ✗ {r.status_code}: {r.text[:200]}")
    return False

# ── MAIN ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(FRAMES_TEMP_DIR, exist_ok=True)

    AUDIO  = f"{OUT_DIR}/reel_002_audio.mp3"
    SILENT = f"{OUT_DIR}/reel_002_silent.mp4"
    FINAL  = f"{OUT_DIR}/reel_002_mechanical_turk.mp4"

    print("="*60)
    print("  R2BOT Reel #002 — The Chess Robot That Fooled Napoleon")
    print("="*60)

    # Audio
    ok = generate_audio(AUDIO)

    # Frames
    print(f"\n🎬  Rendering {FRAMES} frames...")
    for i in range(FRAMES):
        if i % 60 == 0: print(f"   {i}/{FRAMES}  ({i//FPS}s)")
        render_frame(i).save(f"{FRAMES_TEMP_DIR}/f{i:04d}.png")
    print("  ✓ Frames done")

    # Encode silent
    subprocess.run([
        "ffmpeg","-y","-framerate",str(FPS),
        "-i",f"{FRAMES_TEMP_DIR}/f%04d.png",
        "-c:v","libx264","-pix_fmt","yuv420p","-crf","18","-preset","fast",
        SILENT
    ], check=True, capture_output=True)

    # Combine
    if ok:
        subprocess.run([
            "ffmpeg","-y","-i",SILENT,"-i",AUDIO,
            "-c:v","copy","-c:a","aac","-shortest", FINAL
        ], check=True, capture_output=True)
    else:
        import shutil; shutil.copy(SILENT, FINAL)

    print(f"\n✅  Done → {FINAL}")
    print(f"    Size: {os.path.getsize(FINAL)//1024}KB")
