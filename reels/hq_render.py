#!/usr/bin/env python3
"""
R2BOT High-Quality Reel Renderer
=================================
Drop-in replacement for the frame renderer used by generate_daily_reels.py and
_chunk_driver.py. Produces a premium look via:

  • 2x supersampling  -> anti-aliased edges on every vector shape + text
  • gradient + radial amber glow + vignette background (precomputed once)
  • parallax bokeh particle field (soft, depth-shaded)
  • additive bloom on all bright foreground elements (neon glow)
  • spring / eased motion, staggered word reveals, kinetic CTA
  • richer concept centerpiece: glowing HUD rings, scan sweep, orbiting data
    dots, and an enhanced glowing robot arm

Public API:
  render_frame(frame_num, topic) -> PIL.Image (RGB, 1080x1920)

Timing (matches original): FPS=30, DURATION=20 -> 600 frames.
  Hook    : frames   0-89   (0-3s)
  Concept : frames  90-449  (3-15s)
  CTA     : frames 450-599  (15-20s)
"""
import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

# ── Output geometry ──────────────────────────────────────────────────────────
FPS, W, H = 30, 1080, 1920
DURATION  = 60                     # seconds (long-form Reel)
FRAMES    = FPS * DURATION
SS        = 2                      # supersampling factor
WW, HH    = W * SS, H * SS

# ── Section timing (frames), derived from duration ───────────────────────────
def _at(sec): return round(FRAMES * sec / DURATION)
HOOK_END    = _at(5)
CONCEPT_END = _at(15)
BEATS_START = CONCEPT_END
BEAT_LEN    = _at(8)
N_BEATS     = 3
BEATS_END   = BEATS_START + BEAT_LEN * N_BEATS
QUIZ_END    = _at(48)
REVEAL_END  = _at(53)
CTA_START   = REVEAL_END
FADE        = 30

# ── Palette ──────────────────────────────────────────────────────────────────
BG_TOP  = (13, 15, 30)
BG_BOT  = (3,  3,  9)
AMBER   = (245, 158, 11)
AMBER_HI= (255, 193, 66)
CYAN    = (96, 214, 250)
WHITE   = (246, 248, 255)
GRAY    = (150, 154, 176)
INK     = (7, 6, 12)

# Brand anchor: logo + CTA card stay amber in every theme, so a multi-coloured
# grid still reads as one channel.
BRAND_AMBER    = (245, 158, 11)
BRAND_AMBER_HI = (255, 193, 66)
THEMES = {
    "amber":   dict(AMBER=(245,158,11),  AMBER_HI=(255,193,66),  CYAN=(96,214,250),
                    BG_TOP=(13,15,30), BG_BOT=(3,3,9)),
    "ice":     dict(AMBER=(56,189,248),  AMBER_HI=(125,211,252), CYAN=(148,197,253),
                    BG_TOP=(8,17,34),  BG_BOT=(2,4,10)),
    "violet":  dict(AMBER=(167,139,250), AMBER_HI=(196,181,253), CYAN=(244,114,182),
                    BG_TOP=(20,12,36), BG_BOT=(5,3,12)),
    "lime":    dict(AMBER=(163,230,53),  AMBER_HI=(190,242,100), CYAN=(45,212,191),
                    BG_TOP=(10,20,16), BG_BOT=(2,6,5)),
    "crimson": dict(AMBER=(248,113,113), AMBER_HI=(252,165,165), CYAN=(251,191,36),
                    BG_TOP=(28,10,14), BG_BOT=(8,2,4)),
}
_CUR_THEME = None
def apply_theme(name):
    """Swap scene palette. Must clear the bg cache, which bakes in the accent."""
    global AMBER, AMBER_HI, CYAN, BG_TOP, BG_BOT, _BG_CACHE, _CUR_THEME
    name = name or "amber"
    if name == _CUR_THEME: return
    t = THEMES.get(name, THEMES["amber"])
    AMBER, AMBER_HI, CYAN = t["AMBER"], t["AMBER_HI"], t["CYAN"]
    BG_TOP, BG_BOT = t["BG_TOP"], t["BG_BOT"]
    _BG_CACHE = None; _CUR_THEME = name

# ── Fonts ────────────────────────────────────────────────────────────────────
F_PATH = "/usr/share/fonts/truetype/google-fonts/"
_FONT_CACHE = {}
def font(style, size):
    """size is in *output* px; scaled to SS internally."""
    key = (style, size)
    f = _FONT_CACHE.get(key)
    if f is None:
        names = {"black":"Poppins-Bold.ttf", "bold":"Poppins-Bold.ttf",
                 "medium":"Poppins-Medium.ttf", "regular":"Poppins-Regular.ttf",
                 "light":"Poppins-Light.ttf"}
        f = ImageFont.truetype(F_PATH + names[style], int(size * SS))
        _FONT_CACHE[key] = f
    return f

# ── Easing ───────────────────────────────────────────────────────────────────
def clamp(v, lo=0.0, hi=1.0): return max(lo, min(hi, v))
def prg(f, s, e):
    if f <= s: return 0.0
    if f >= e: return 1.0
    return (f - s) / (e - s)
def ease_out(t):  return 1 - (1 - t) ** 3
def ease_in(t):   return t ** 3
def ease_io(t):   return 3*t*t - 2*t*t*t
def ease_back(t, s=1.9):           # overshoot (spring-ish)
    t = clamp(t)
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2

# ── Static background (computed once, cached) ────────────────────────────────
_BG_CACHE = None
def _background():
    global _BG_CACHE
    if _BG_CACHE is not None:
        return _BG_CACHE.copy()
    ys = np.linspace(0, 1, HH)[:, None]
    top = np.array(BG_TOP, dtype=np.float32)
    bot = np.array(BG_BOT, dtype=np.float32)
    grad = top[None, None, :] * (1 - ys[..., None]) + bot[None, None, :] * ys[..., None]
    grad = np.repeat(grad, WW, axis=1)                       # (HH, WW, 3)

    # radial amber glow low-center
    yy, xx = np.mgrid[0:HH, 0:WW].astype(np.float32)
    cx, cy = WW * 0.5, HH * 0.60
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (WW * 0.85)
    glow = np.clip(1 - d, 0, 1) ** 2.2
    amber = np.array(AMBER, dtype=np.float32)
    grad += glow[..., None] * amber[None, None, :] * 0.16

    # vignette
    dv = np.sqrt((xx - WW*0.5) ** 2 + (yy - HH*0.5) ** 2) / (WW * 0.72)
    vig = np.clip(1 - (dv ** 2.4) * 0.55, 0.25, 1.0)
    grad *= vig[..., None]

    img = Image.fromarray(np.clip(grad, 0, 255).astype(np.uint8), "RGB")

    # faint engineering grid
    gl = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gl)
    step = 120 * SS
    for x in range(0, WW, step):
        gd.line([(x, 0), (x, HH)], fill=(120, 140, 200, 12), width=SS)
    for y in range(0, HH, step):
        gd.line([(0, y), (WW, y)], fill=(120, 140, 200, 12), width=SS)
    img = Image.alpha_composite(img.convert("RGBA"), gl).convert("RGB")

    _BG_CACHE = img
    return img.copy()

# ── Particle field (seeded, deterministic) ───────────────────────────────────
random.seed(2026)
_PARTICLES = []
for _ in range(64):
    _PARTICLES.append({
        "x": random.random(),
        "y": random.random(),
        "z": random.uniform(0.35, 1.0),          # depth: bigger/brighter/faster
        "sw": random.uniform(0.2, 1.0),          # sine wobble phase speed
        "ph": random.uniform(0, math.tau),
        "cy": random.random() < 0.30,            # cyan vs amber
    })

def _draw_particles(frame_num):
    # drawn directly at full res via concentric alpha rings -> soft after the
    # final LANCZOS downscale, and avoids an expensive blur+upscale.
    layer = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    t = frame_num / FRAMES
    for p in _PARTICLES:
        z = p["z"]
        y = (p["y"] - t * 0.12 * z) % 1.0
        x = (p["x"] + 0.012 * math.sin(p["ph"] + frame_num * 0.03 * p["sw"])) % 1.0
        px, py = x * WW, y * HH
        r = (2 + 9 * z) * SS
        col = CYAN if p["cy"] else AMBER_HI
        d.ellipse([px-r*2.6, py-r*2.6, px+r*2.6, py+r*2.6], fill=(*col, int(16 * z)))
        d.ellipse([px-r*1.6, py-r*1.6, px+r*1.6, py+r*1.6], fill=(*col, int(38 * z)))
        d.ellipse([px-r, py-r, px+r, py+r], fill=(*col, int(170 * z)))
    return layer

# ── Bloom: additive glow from a bright RGBA layer ────────────────────────────
def _bloom_at_output(bright_rgba, strength=0.9):
    """Compute additive glow directly at OUTPUT resolution (cheap)."""
    small = bright_rgba.resize((W // 2, H // 2), Image.BILINEAR)
    small = small.filter(ImageFilter.GaussianBlur(4))
    glow = small.resize((W, H), Image.BILINEAR).convert("RGB")
    return np.asarray(glow, dtype=np.int16), strength

def _text(d, xy, s, fnt, fill, anchor="mm"):
    d.text((xy[0]*SS, xy[1]*SS), s, font=fnt, fill=fill, anchor=anchor)

_MEAS = ImageDraw.Draw(Image.new("RGB", (8, 8)))
def _wpx(s, f):
    bb = _MEAS.textbbox((0, 0), s, font=f)
    return bb[2] - bb[0]

def _wrap_fit(text, style, max_w_out, max_size, min_size=34, max_lines=4):
    """Greedy word-wrap + auto-shrink so text fits max_w_out (output px) in
    <= max_lines lines. Returns (lines, font_obj, size)."""
    limit = max_w_out * SS
    lines, f, size = [text], font(style, min_size), min_size
    for size in range(max_size, min_size - 1, -2):
        f = font(style, size)
        words, lines, cur = text.split(), [], ""
        for w in words:
            t = (cur + " " + w).strip()
            if not cur or _wpx(t, f) <= limit:
                cur = t
            else:
                lines.append(cur); cur = w
        if cur:
            lines.append(cur)
        if len(lines) <= max_lines and all(_wpx(l, f) <= limit for l in lines):
            return lines, f, size
    return lines, f, size


def _chevron(sd, cx, cy, w, a, col):
    """Downward chevron. Replaces emoji, which Poppins cannot render (tofu box)."""
    sd.line([(cx-w)*SS, (cy-w*0.45)*SS, cx*SS, (cy+w*0.45)*SS], fill=(*col, a), width=int(5*SS))
    sd.line([cx*SS, (cy+w*0.45)*SS, (cx+w)*SS, (cy-w*0.45)*SS], fill=(*col, a), width=int(5*SS))

# ── R2BOT logo ───────────────────────────────────────────────────────────────
def _logo(d, x, y, size, alpha):
    f1 = font("bold", size)
    f2 = font("bold", int(size * 0.8))
    d.text((x*SS, y*SS), "R2", font=f1, fill=(*BRAND_AMBER, alpha))
    bb = d.textbbox((0, 0), "R2", font=f1)
    d.text((x*SS + bb[2] + 3*SS, y*SS + 4*SS), "BOT", font=f2, fill=(*WHITE, alpha))

# ── Enhanced glowing robot arm ───────────────────────────────────────────────
def _robot_arm(bright, sharp, frame_num, cx, cy, alpha):
    """Draw onto bright (for bloom) and sharp (crisp top) layers."""
    bd = ImageDraw.Draw(bright)
    sd = ImageDraw.Draw(sharp)
    t = frame_num / FRAMES
    sh = math.radians(-58 + 34 * math.sin(t * math.tau))
    el = math.radians(-118 + 54 * math.sin(t * math.tau + 1.2))
    L1, L2 = 250, 190
    cxx, cyy = cx*SS, cy*SS
    x1 = cxx + L1*SS*math.cos(sh);      y1 = cyy + L1*SS*math.sin(sh)
    x2 = x1 + L2*SS*math.cos(sh+el);    y2 = y1 + L2*SS*math.sin(sh+el)
    a = alpha

    # base plate
    sd.ellipse([cxx-46*SS, cyy-14*SS, cxx+46*SS, cyy+14*SS], fill=(30, 26, 16, a))
    # links (bright for glow + sharp on top)
    for dd, w in ((bd, 18), (sd, 14)):
        dd.line([(cxx, cyy), (x1, y1)], fill=(*AMBER, a), width=int(w*SS))
    for dd, w in ((bd, 14), (sd, 10)):
        dd.line([(x1, y1), (x2, y2)], fill=(*AMBER_HI, a), width=int(w*SS))
    # joints
    for jx, jy, r in [(cxx, cyy, 28), (x1, y1, 21), (x2, y2, 15)]:
        bd.ellipse([jx-r*SS, jy-r*SS, jx+r*SS, jy+r*SS], fill=(255, 205, 70, a))
        sd.ellipse([jx-r*SS, jy-r*SS, jx+r*SS, jy+r*SS], fill=(255, 210, 90, a))
        sd.ellipse([jx-(r-6)*SS, jy-(r-6)*SS, jx+(r-6)*SS, jy+(r-6)*SS], fill=(26, 18, 4, a))
    # end-effector pulse ring
    pulse = 0.5 + 0.5*math.sin(frame_num*0.16)
    rr = int((20 + 12*pulse) * SS)
    ca = int(220*pulse * a/255)
    bd.ellipse([x2-rr, y2-rr, x2+rr, y2+rr], outline=(*CYAN, ca), width=int(3*SS))
    sd.ellipse([x2-8*SS, y2-8*SS, x2+8*SS, y2+8*SS], fill=(*CYAN, a))

def _hud_rings(bright, sharp, frame_num, cx, cy, alpha):
    bd = ImageDraw.Draw(bright)
    sd = ImageDraw.Draw(sharp)
    cxx, cyy = cx*SS, cy*SS
    a = alpha
    ang = frame_num * 2.2
    for i, (R, col, dash) in enumerate([(320, AMBER, 26), (250, CYAN, 18), (185, AMBER_HI, 14)]):
        Rs = R*SS
        # dashed ring via arc segments
        segs = dash
        rot = ang * (1 if i % 2 == 0 else -1) * (0.6 + i*0.2)
        for sdeg in range(0, 360, int(360/segs)):
            a0 = sdeg + rot
            a1 = a0 + 360/segs * 0.55
            bd.arc([cxx-Rs, cyy-Rs, cxx+Rs, cyy+Rs], a0, a1, fill=(*col, int(a*0.55)), width=int(3*SS))
            sd.arc([cxx-Rs, cyy-Rs, cxx+Rs, cyy+Rs], a0, a1, fill=(*col, int(a*0.8)), width=int(2*SS))
    # orbiting data dots
    for k in range(6):
        aa = math.radians(ang*1.4 + k*60)
        R = 250
        ox = cxx + R*SS*math.cos(aa)
        oy = cyy + R*SS*math.sin(aa)
        r = 7*SS
        bd.ellipse([ox-r*1.8, oy-r*1.8, ox+r*1.8, oy+r*1.8], fill=(*CYAN, int(a*0.5)))
        sd.ellipse([ox-r, oy-r, ox+r, oy+r], fill=(*CYAN, a))
    # scan sweep line
    sw = math.radians(ang*3)
    R = 320*SS
    bd.line([(cxx, cyy), (cxx + R*math.cos(sw), cyy + R*math.sin(sw))], fill=(*AMBER_HI, int(a*0.35)), width=int(6*SS))


# ── Section: body beat ───────────────────────────────────────────────────────
def _scene_beat(bright, sharp, sd, frame_num, topic, beat_idx, local, alpha, seg_len=None):
    beats = topic.get("beats") or []
    if beat_idx >= len(beats): return
    beat = beats[beat_idx]; a = int(255*alpha); bd = ImageDraw.Draw(bright)
    pc = ease_back(prg(local, 0, 40)); cx = int(96 + (1-clamp(pc))*-60); chip_a = int(a*clamp(pc))
    sd.rounded_rectangle([cx*SS,300*SS,(cx+92)*SS,372*SS], radius=18*SS, fill=(*AMBER,int(chip_a*0.92)))
    _text(sd,(cx+46,337),f"{beat_idx+1:02d}",font("bold",38),(*INK,chip_a))
    _text(sd,(cx+124,337),beat.get("label","").upper(),font("medium",27),(*CYAN,int(a*0.85)),anchor="lm")
    lines, fh, size = _wrap_fit(beat["text"], "bold", 900, 68, 40, max_lines=4)
    lh = size*1.22; top = 640 - lh*len(lines)/2
    for i, ln in enumerate(lines):
        lp = ease_out(prg(local, 10+i*6, 56+i*6)); ya = int(a*lp); y = top + lh*(i+0.5) - (1-lp)*30
        bd.text((W//2*SS,int(y*SS)), ln, font=fh, fill=(*AMBER_HI,int(ya*0.28)), anchor="mm")
        sd.text((W//2*SS,int(y*SS)), ln, font=fh, fill=(*WHITE,ya), anchor="mm")
    if beat.get("detail"):
        sp = ease_out(prg(local, 52, 104))
        sl, fs, ss_ = _wrap_fit(beat["detail"], "regular", 880, 38, 28, max_lines=3)
        slh = ss_*1.3; stop = 940 - slh*len(sl)/2
        for i, ln in enumerate(sl):
            _text(sd,(W//2, stop+slh*(i+0.5)), ln, fs, (*GRAY,int(a*sp)))
    _hud_rings(bright, sharp, frame_num, 540, 1410, int(a*0.45))
    nb = max(len(beats), 1)
    rail_w, seg = 560, 560//nb; rx = W//2 - rail_w//2; rail_y = 1772
    for k in range(nb):
        _bl = seg_len or BEAT_LEN
        fp = 1.0 if k < beat_idx else (clamp(local/_bl) if k == beat_idx else 0.0)
        x0, x1 = rx + k*seg + 5, rx + (k+1)*seg - 5
        sd.rounded_rectangle([x0*SS,rail_y*SS,x1*SS,(rail_y+8)*SS], radius=4*SS, fill=(*GRAY,int(a*0.22)))
        if fp > 0:
            sd.rounded_rectangle([x0*SS,rail_y*SS,int(x0+(x1-x0)*fp)*SS,(rail_y+8)*SS], radius=4*SS, fill=(*AMBER,int(a*0.95)))

# ── Section: quiz ────────────────────────────────────────────────────────────
def _scene_quiz(bright, sharp, sd, frame_num, topic, local, alpha, quiz_len):
    quiz = topic.get("quiz")
    if not quiz: return
    a = int(255*alpha); bd = ImageDraw.Draw(bright)
    _text(sd,(W//2,300),"QUICK CHECK",font("medium",30),(*CYAN,int(a*0.9)))
    ql, fq, qs = _wrap_fit(quiz["q"], "bold", 920, 62, 38, max_lines=3)
    qlh = qs*1.24; qtop = 470 - qlh*len(ql)/2
    for i, ln in enumerate(ql):
        qp = ease_out(prg(local, i*6, 44+i*6)); ya = int(a*qp)
        bd.text((W//2*SS,int((qtop+qlh*(i+0.5))*SS)), ln, font=fq, fill=(*AMBER_HI,int(ya*0.3)), anchor="mm")
        sd.text((W//2*SS,int((qtop+qlh*(i+0.5))*SS)), ln, font=fq, fill=(*WHITE,ya), anchor="mm")
    opts = quiz.get("options",[])[:3]; card_h, gap, top = 150, 32, 760
    for i, opt in enumerate(opts):
        op = ease_back(prg(local, 40+i*14, 92+i*14)); oa = int(a*clamp(op))
        y0 = top + i*(card_h+gap); xoff = (1-clamp(op))*40
        sd.rounded_rectangle([(70+xoff)*SS,y0*SS,(W-70+xoff)*SS,(y0+card_h)*SS], radius=28*SS,
                             fill=(*WHITE,int(oa*0.07)), outline=(*GRAY,int(oa*0.5)), width=int(3*SS))
        sd.rounded_rectangle([(112+xoff)*SS,(y0+38)*SS,(172+xoff)*SS,(y0+112)*SS], radius=16*SS, fill=(*AMBER,int(oa*0.9)))
        _text(sd,(142+xoff,y0+75),"ABC"[i],font("bold",36),(*INK,oa))
        ol, fo, _ = _wrap_fit(opt, "medium", 700, 40, 28, max_lines=2)
        for j, ln in enumerate(ol):
            _text(sd,(200+xoff, y0+card_h/2+(j-(len(ol)-1)/2)*40), ln, fo, (*WHITE,oa), anchor="lm")
    cd_start = quiz_len - 90
    if local > cd_start:
        cp = clamp((local-cd_start)/90); n = 3 - int(cp*3)
        if n >= 1:
            cy, r = 1500, 62
            sd.ellipse([(W//2-r)*SS,(cy-r)*SS,(W//2+r)*SS,(cy+r)*SS], outline=(*GRAY,int(a*0.35)), width=int(5*SS))
            sweep = 360*(1-(cp*3)%1)
            sd.arc([(W//2-r)*SS,(cy-r)*SS,(W//2+r)*SS,(cy+r)*SS], -90, -90+sweep, fill=(*AMBER,a), width=int(7*SS))
            bd.arc([(W//2-r)*SS,(cy-r)*SS,(W//2+r)*SS,(cy+r)*SS], -90, -90+sweep, fill=(*AMBER_HI,int(a*0.8)), width=int(9*SS))
            _text(sd,(W//2,cy),str(n),font("bold",58),(*WHITE,a))
    else:
        pp = ease_out(prg(local, 130, 180))
        ca = int(a*pp*0.95)
        _text(sd,(W//2,1490),"Comment your answer",font("medium",34),(*CYAN,ca))
        _chevron(sd, W//2, 1540, 20, ca, CYAN)

# ── Section: reveal ──────────────────────────────────────────────────────────
def _scene_reveal(bright, sharp, sd, frame_num, topic, local, alpha):
    quiz = topic.get("quiz")
    if not quiz: return
    a = int(255*alpha); bd = ImageDraw.Draw(bright)
    idx = quiz.get("answer",0); opts = quiz.get("options",[])
    if idx >= len(opts): return
    _text(sd,(W//2,480),"ANSWER",font("medium",32),(*CYAN,int(a*0.9)))
    pulse = 0.5+0.5*math.sin(local/7.0); gp = ease_back(prg(local,0,50)); ch, y0 = 200, 700
    sd.rounded_rectangle([90*SS,y0*SS,(W-90)*SS,(y0+ch)*SS], radius=32*SS, fill=(*AMBER,int(a*0.92*clamp(gp))))
    bd.rounded_rectangle([90*SS,y0*SS,(W-90)*SS,(y0+ch)*SS], radius=32*SS,
                         outline=(*AMBER_HI,int(a*(0.45+0.4*pulse))), width=int(8*SS))
    _text(sd,(150,y0+ch/2),"ABC"[idx],font("bold",44),(*INK,int(a*0.55)),anchor="lm")
    wl, fw, _ = _wrap_fit(opts[idx], "bold", 720, 48, 32, max_lines=2)
    for j, ln in enumerate(wl):
        _text(sd,(W//2+30, y0+ch/2+(j-(len(wl)-1)/2)*52), ln, fw, (*INK,int(a*clamp(gp))), anchor="mm")
    if quiz.get("why"):
        wp = ease_out(prg(local,40,100))
        yl, fy, ys_ = _wrap_fit(quiz["why"], "regular", 880, 38, 28, max_lines=3)
        ylh = ys_*1.3; ytop = 1080 - ylh*len(yl)/2
        for i, ln in enumerate(yl):
            _text(sd,(W//2, ytop+ylh*(i+0.5)), ln, fy, (*WHITE,int(a*wp*0.92)))


# ── Section: predict (early engagement beat) ─────────────────────────────────
def _scene_predict(bright, sharp, sd, frame_num, topic, local, alpha, seg_len):
    """A fast either/or posed BEFORE the explanation. Two big cards, a pulsing
    'commit to an answer' cue, no reveal here -- the payoff lands in the beats,
    which is what keeps people watching past the 10s drop-off."""
    p = topic.get("predict")
    if not p: return
    a = int(255*alpha); bd = ImageDraw.Draw(bright)
    _text(sd,(W//2,330),"YOUR CALL",font("medium",30),(*CYAN,int(a*0.9)))
    ql, fq, qs = _wrap_fit(p["q"], "bold", 920, 64, 40, max_lines=3)
    qlh = qs*1.22; qtop = 520 - qlh*len(ql)/2
    for i, ln in enumerate(ql):
        qp = ease_out(prg(local, i*5, 40+i*5)); ya = int(a*qp)
        bd.text((W//2*SS,int((qtop+qlh*(i+0.5))*SS)), ln, font=fq, fill=(*AMBER_HI,int(ya*0.3)), anchor="mm")
        sd.text((W//2*SS,int((qtop+qlh*(i+0.5))*SS)), ln, font=fq, fill=(*WHITE,ya), anchor="mm")
    opts = p.get("options",[])[:2]
    cw, chh, gap, ytop = 420, 210, 40, 900
    x0 = W//2 - (cw*len(opts) + gap*(len(opts)-1))//2
    for i, opt in enumerate(opts):
        op = ease_back(prg(local, 30+i*12, 84+i*12)); oa = int(a*clamp(op))
        cx0 = x0 + i*(cw+gap); yoff = (1-clamp(op))*36
        col = AMBER if i == 0 else CYAN
        sd.rounded_rectangle([cx0*SS,(ytop+yoff)*SS,(cx0+cw)*SS,(ytop+chh+yoff)*SS], radius=30*SS,
                             fill=(*col,int(oa*0.14)), outline=(*col,int(oa*0.95)), width=int(4*SS))
        bd.rounded_rectangle([cx0*SS,(ytop+yoff)*SS,(cx0+cw)*SS,(ytop+chh+yoff)*SS], radius=30*SS,
                             outline=(*col,int(oa*0.35)), width=int(9*SS))
        ol, fo, osz = _wrap_fit(opt, "bold", cw-70, 46, 30, max_lines=3)
        olh = osz*1.2; oy = ytop + yoff + chh/2 - olh*(len(ol)-1)/2
        for j, ln in enumerate(ol):
            _text(sd,(cx0+cw/2, oy+j*olh), ln, fo, (*WHITE,oa))
    pulse = 0.55 + 0.45*math.sin(local/6.0)
    pp = ease_out(prg(local, 60, 105))
    la = int(a*pp*pulse)
    _text(sd,(W//2,1280),"Lock in your guess",font("medium",36),(*AMBER_HI,la))
    _chevron(sd, W//2, 1334, 22, la, AMBER_HI)
    _hud_rings(bright, sharp, frame_num, 540, 1680, int(a*0.22))


# ── Section: stat (infographic) ──────────────────────────────────────────────
def _scene_stat(bright, sharp, sd, frame_num, topic, local, alpha, seg_len):
    """A single number, made physical.

    Abstract quantities ("10 million pulses a second") mean nothing to a
    non-engineer until they're anchored against something familiar. This scene
    counts the number up, then draws a comparison bar against a human reference
    so the scale lands rather than washes over.
    """
    st = topic.get("stat")
    if not st: return
    a = int(255*alpha); bd = ImageDraw.Draw(bright)

    _text(sd,(W//2,330),st.get("eyebrow","BY THE NUMBERS").upper(),
          font("medium",30),(*CYAN,int(a*0.9)))

    # headline number counts up, then holds
    cp = ease_out(prg(local, 10, 70))
    target = st.get("value", 0)
    shown = target * cp
    if isinstance(target, int) and target >= 1000:
        txt = f"{int(shown):,}"
    elif float(target).is_integer():
        txt = f"{int(shown)}"
    else:
        txt = f"{shown:.1f}"
    nl, fn, nsz = _wrap_fit(txt, "bold", 900, 190, 90, max_lines=1)
    ny = 560
    bd.text((W//2*SS, ny*SS), nl[0], font=fn, fill=(*AMBER, int(a*0.45)), anchor="mm")
    sd.text((W//2*SS, ny*SS), nl[0], font=fn, fill=(*AMBER_HI, a), anchor="mm")
    if st.get("unit"):
        _text(sd,(W//2, ny+nsz*0.72), st["unit"], font("medium",42),(*WHITE,int(a*0.92)))

    # what it means, in plain words
    lp = ease_out(prg(local, 46, 104))
    ll, fl, lsz = _wrap_fit(st.get("label",""), "regular", 880, 40, 28, max_lines=3)
    llh = lsz*1.3; ltop = 880 - llh*len(ll)/2
    for i, ln in enumerate(ll):
        _text(sd,(W//2, ltop+llh*(i+0.5)), ln, fl, (*GRAY, int(a*lp)))

    # comparison bars: the human reference vs the machine
    cmp_ = st.get("compare")
    if cmp_:
        bp = ease_out(prg(local, 80, 150))
        bx, bw, bh = 130, W-260, 62
        for i,(nm, frac, col) in enumerate([
                (cmp_["a_label"], cmp_.get("a_frac",1.0), GRAY),
                (cmp_["b_label"], cmp_.get("b_frac",1.0), AMBER)]):
            by = 1090 + i*(bh+64)
            _text(sd,(bx, by-26), nm, font("medium",28), (*col, int(a*0.95)), anchor="lm")
            sd.rounded_rectangle([bx*SS, by*SS, (bx+bw)*SS, (by+bh)*SS], radius=bh//2*SS,
                                 fill=(*GRAY, int(a*0.16)))
            fw = max(int(bw*frac*bp), 4)
            sd.rounded_rectangle([bx*SS, by*SS, (bx+fw)*SS, (by+bh)*SS], radius=bh//2*SS,
                                 fill=(*col, int(a*0.92)))
            if col is AMBER:
                bd.rounded_rectangle([bx*SS, by*SS, (bx+fw)*SS, (by+bh)*SS], radius=bh//2*SS,
                                     fill=(*AMBER_HI, int(a*0.35)))
            val = cmp_.get(f"{'ab'[i]}_value")
            if val:
                fv = font("bold", 30)
                vw = _wpx(str(val), fv) / SS
                # A full-width bar leaves no room outside, so the value moves
                # inside and flips to ink for contrast against the fill.
                if bx + fw + 18 + vw > W - 20:
                    _text(sd,(bx+fw-18, by+bh/2), str(val), fv,
                          (*INK, int(a*bp)), anchor="rm")
                else:
                    _text(sd,(bx+fw+18, by+bh/2), str(val), fv,
                          (*col, int(a*bp)), anchor="lm")

# ── Timeline resolution ──────────────────────────────────────────────────────
SECTION_ORDER = ["hook","concept","predict","beat1","beat2","stat","beat3","quiz","reveal","cta"]
_STATIC_BOUNDS = {
    "hook":(0,HOOK_END), "concept":(HOOK_END,CONCEPT_END),
    "beat1":(BEATS_START,BEATS_START+BEAT_LEN),
    "beat2":(BEATS_START+BEAT_LEN,BEATS_START+2*BEAT_LEN),
    "beat3":(BEATS_START+2*BEAT_LEN,BEATS_END),
    "quiz":(BEATS_END,QUIZ_END), "reveal":(QUIZ_END,REVEAL_END), "cta":(CTA_START,FRAMES),
}
def bounds_for(topic):
    """Scene boundaries measured from the real voiceover when available."""
    tl = (topic or {}).get("_timeline")
    if not tl: return _STATIC_BOUNDS
    f = tl.get("frames", {})
    return {k: tuple(f[k]) for k in SECTION_ORDER if k in f}
def _which(B, frame_num):
    for name in SECTION_ORDER:
        if name not in B: continue
        s0, s1 = B[name]
        if s0 <= frame_num < s1: return name, s0, s1
    last = [n for n in SECTION_ORDER if n in B][-1]
    return last, B[last][0], B[last][1]

# ── Main frame renderer ──────────────────────────────────────────────────────
def render_frame(frame_num, topic):
    apply_theme((topic or {}).get("theme"))
    base = _background().convert("RGBA")                   # RGBA @ SS
    base = Image.alpha_composite(base, _draw_particles(frame_num))

    bright = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))     # -> bloom source
    sharp  = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))     # -> crisp overlay
    sd = ImageDraw.Draw(sharp)

    # persistent logo
    if frame_num > 8:
        la = int(255 * clamp(prg(frame_num, 8, 34)))
        _logo(sd, 62, 84, 40, la)

    B = bounds_for(topic)
    _sec, _s0, _s1 = _which(B, frame_num)
    _local, _seg = frame_num - _s0, max(_s1 - _s0, 1)
    _fade = min(FADE, max(_seg // 4, 6))

    # ── Section 1: HOOK ──────────────────────────────────────────────────────
    if _sec == "hook":
        HOOK_END = _s1
        # The hook is the 3-second decision point: motion holds attention far
        # better than static text, so the topic's own visual runs behind it.
        import visuals
        _hv = int(255 * clamp(prg(frame_num, 6, 46)) * 0.30)
        if _hv > 0:
            visuals.draw(topic, bright, sharp, frame_num, 540, 1330, _hv)
        lines, fh, size = _wrap_fit(topic["hook"], "bold", 940, 82, 46, max_lines=5)
        lh = size * 1.2                                    # line height (output px)
        block_h = lh * len(lines)
        top = 560 - block_h / 2                             # vertically centered block
        oa = 1 - ease_in(prg(frame_num, HOOK_END - _fade, HOOK_END))   # fade into concept
        bd = ImageDraw.Draw(bright)
        # Words listed in topic["emphasis"] render in the accent colour so the
        # payload of the hook is readable at a glance, mid-scroll, muted.
        emph = {w.lower().strip(".,!?") for w in (topic.get("emphasis") or [])}
        for i, ln in enumerate(lines):
            p = ease_back(prg(frame_num, i*7, 38 + i*7))
            yoff = (1 - clamp(p)) * 42
            ya = int(255 * clamp(prg(frame_num, i*7, 32 + i*7)) * oa)
            y = top + lh*(i + 0.5) - yoff
            bd.text((W//2*SS, int(y*SS)), ln, font=fh, fill=(*AMBER_HI, int(ya*0.32)), anchor="mm")
            if emph and any(w.lower().strip(".,!?") in emph for w in ln.split()):
                words = ln.split(" ")
                widths = [_wpx(w + " ", fh) for w in words]
                x = W//2*SS - sum(widths)/2
                for w, wd in zip(words, widths):
                    hot = w.lower().strip(".,!?") in emph
                    sd.text((x, int(y*SS)), w, font=fh,
                            fill=((*AMBER_HI, ya) if hot else (*WHITE, ya)), anchor="lm")
                    x += wd
            else:
                sd.text((W//2*SS, int(y*SS)), ln, font=fh, fill=(*WHITE, ya), anchor="mm")
        # underline bar spring-grows under the block
        p2 = ease_out(prg(frame_num, 26, 78)) * oa
        bar = int(560 * p2)
        yb = int((top + block_h + 26) * SS)
        sd.rectangle([(W//2*SS - bar//2*SS, yb), (W//2*SS + bar//2*SS, yb + 6*SS)], fill=(*AMBER, int(235*p2)))
        bd.rectangle([(W//2*SS - bar//2*SS, yb-2*SS), (W//2*SS + bar//2*SS, yb + 8*SS)], fill=(*AMBER, int(150*p2)))
        # scroll-cue chevrons
        if frame_num > 55:
            pc = ease_out(prg(frame_num, 55, 85)) * oa
            for k in range(3):
                cy = 1560 + k*26
                ca = int(150*pc*(1 - k*0.25))
                sd.line([((W//2-26)*SS, cy*SS), (W//2*SS, (cy+22)*SS)], fill=(*GRAY, ca), width=int(4*SS))
                sd.line([(W//2*SS, (cy+22)*SS), ((W//2+26)*SS, cy*SS)], fill=(*GRAY, ca), width=int(4*SS))

    # ── Section 2: CONCEPT ───────────────────────────────────────────────────
    elif _sec == "concept":
        local, seg = _local, _seg
        p_in  = ease_out(prg(local, 0, min(40, seg//3)))
        p_out = ease_in(prg(local, seg - _fade, seg))
        alpha = int(255 * clamp(p_in - p_out))
        if alpha > 0:
            # eyebrow + title
            _tlp, _, _tsz = _wrap_fit(topic["title"], "bold", 960, 62, 34, max_lines=2)
            _ttop = 268 - (_tsz * 1.16) * (len(_tlp) - 1) / 2
            _text(sd, (W//2, _ttop - _tsz*0.72 - 30), "CONCEPT", font("medium", 30),
                  (*CYAN, int(alpha*0.85)))
            bd = ImageDraw.Draw(bright)
            tlines, ftitle, tsize = _wrap_fit(topic["title"], "bold", 960, 62, 34, max_lines=2)
            tlh = tsize * 1.16
            ttop = 268 - tlh * (len(tlines) - 1) / 2
            for i, ln in enumerate(tlines):
                ty = int((ttop + i*tlh) * SS)
                bd.text((W//2*SS, ty), ln, font=ftitle, fill=(*AMBER, int(alpha*0.4)), anchor="mm")
                sd.text((W//2*SS, ty), ln, font=ftitle, fill=(*AMBER_HI, alpha), anchor="mm")
            bp = ease_out(prg(local, 6, 52))
            bw = int(460 * bp)
            ybar = int((ttop + tlh*(len(tlines)-1) + tsize*0.78) * SS)
            sd.rectangle([(W//2*SS - bw//2*SS, ybar), (W//2*SS + bw//2*SS, ybar + 6*SS)],
                         fill=(*AMBER, int(200*bp*alpha/255)))

            # centerpiece: HUD rings + robot arm
            ccx, ccy = 540, 900
            import visuals
            visuals.draw(topic, bright, sharp, frame_num, ccx, ccy, alpha)

            # curiosity angle (auto-wrapped, fades up)
            p_sub = ease_out(prg(local, 44, 108))
            sa = int(alpha * p_sub)
            alines, fs, asize = _wrap_fit(topic["curiosity_angle"], "regular", 900, 40, 30, max_lines=3)
            alh = asize * 1.28
            atop = 1380 - alh*len(alines)/2
            for i, ln in enumerate(alines):
                _text(sd, (W//2, atop + alh*(i + 0.5)), ln, fs, (*CYAN, sa))

    # ── Section 3: CTA ───────────────────────────────────────────────────────
    elif _sec == "predict":
        local, seg = _local, _seg
        p_in  = ease_out(prg(local, 0, min(30, seg//3)))
        p_out = ease_in(prg(local, seg - _fade, seg))
        alpha = clamp(p_in - p_out)
        if alpha > 0:
            _scene_predict(bright, sharp, sd, frame_num, topic, local, alpha, seg)

    elif _sec in ("beat1","beat2","beat3"):
        bidx = int(_sec[-1]) - 1
        local, seg = _local, _seg
        p_in  = ease_out(prg(local, 0, min(34, seg//3)))
        p_out = ease_in(prg(local, seg - _fade, seg))
        alpha = clamp(p_in - p_out)
        if alpha > 0:
            _scene_beat(bright, sharp, sd, frame_num, topic, bidx, local, alpha, seg)

    elif _sec == "stat":
        local, seg = _local, _seg
        p_in  = ease_out(prg(local, 0, min(32, seg//3)))
        p_out = ease_in(prg(local, seg - _fade, seg))
        alpha = clamp(p_in - p_out)
        if alpha > 0:
            _scene_stat(bright, sharp, sd, frame_num, topic, local, alpha, seg)

    elif _sec == "quiz":
        local, qlen = _local, _seg
        p_in  = ease_out(prg(local, 0, min(36, qlen//3)))
        p_out = ease_in(prg(local, qlen - _fade, qlen))
        alpha = clamp(p_in - p_out)
        if alpha > 0:
            _scene_quiz(bright, sharp, sd, frame_num, topic, local, alpha, qlen)

    elif _sec == "reveal":
        local, rlen = _local, _seg
        p_in  = ease_out(prg(local, 0, min(34, rlen//3)))
        p_out = ease_in(prg(local, rlen - _fade, rlen))
        alpha = clamp(p_in - p_out)
        if alpha > 0:
            _scene_reveal(bright, sharp, sd, frame_num, topic, local, alpha)

    else:
        local = _local
        clen  = _seg
        p = ease_out(prg(local, 0, 42))
        out = ease_in(prg(local, clen - 40, clen))
        alpha = clamp(p - out)
        a255 = int(255 * alpha)

        # amber panel scales in with spring
        pb = ease_back(prg(local, 0, 46))
        bh = int(380 * clamp(pb))
        panel = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))
        pd = ImageDraw.Draw(panel)
        y0, y1 = (H - bh)//2, (H + bh)//2
        pd.rounded_rectangle([40*SS, y0*SS, (W-40)*SS, y1*SS], radius=40*SS, fill=(*BRAND_AMBER, int(240*alpha)))
        # inner highlight
        pd.rounded_rectangle([40*SS, y0*SS, (W-40)*SS, (y0+8)*SS], radius=8*SS, fill=(*BRAND_AMBER_HI, int(200*alpha)))
        sharp = Image.alpha_composite(sharp, panel)
        sd = ImageDraw.Draw(sharp)

        p2 = ease_out(prg(local, 12, 48))
        _text(sd, (W//2, H//2 - 96), "Follow", font("medium", 60), (*INK, int(235*p2)))
        _text(sd, (W//2, H//2 + 2), "R2BOT", font("black", 116), (*INK, int(255*p2)))
        if local > 22:
            p3 = ease_out(prg(local, 22, 58))
            sub = "Zero to Robotics Engineer"
            fsub = font("medium", 37)
            a3 = int(235*p3)
            # centered text with a drawn arrow replacing "to"
            left, right = "Zero", "Robotics Engineer"
            fL, fR = font("medium", 37), font("medium", 37)
            wL, wR = _wpx(left, fL), _wpx(right, fR)
            gap = 74*SS                                    # room for arrow
            total = wL + gap + wR
            x = W//2*SS - total//2
            yb = (H//2 + 118)*SS
            sd.text((x, yb), left, font=fL, fill=(40, 28, 0, a3), anchor="lm")
            ax0 = x + wL + 18*SS; ax1 = x + wL + gap - 18*SS; aym = yb
            sd.line([(ax0, aym), (ax1, aym)], fill=(40, 28, 0, a3), width=int(4*SS))
            sd.polygon([(ax1, aym-9*SS), (ax1+16*SS, aym), (ax1, aym+9*SS)], fill=(40, 28, 0, a3))
            sd.text((x + wL + gap, yb), right, font=fR, fill=(40, 28, 0, a3), anchor="lm")
        if local > 46:
            ph = ease_out(prg(local, 46, 88))
            _text(sd, (W//2, H//2 + 176), "r2bot.in", font("bold", 34), (54, 38, 2, int(210*ph)))
        # glow behind panel
        bd = ImageDraw.Draw(bright)
        bd.rounded_rectangle([40*SS, y0*SS, (W-40)*SS, y1*SS], radius=40*SS, outline=(*BRAND_AMBER_HI, int(160*alpha)), width=int(6*SS))

    # ── Compose at output res: base+glow (behind) then crisp sharp on top ─────
    base_out = base.convert("RGB").resize((W, H), Image.LANCZOS)
    glow, strength = _bloom_at_output(bright, strength=0.85)
    arr = np.clip(np.asarray(base_out, np.int16) + (glow * strength).astype(np.int16), 0, 255).astype(np.uint8)
    base_out = Image.fromarray(arr, "RGB").convert("RGBA")
    sharp_out = sharp.resize((W, H), Image.LANCZOS)
    out = Image.alpha_composite(base_out, sharp_out).convert("RGB")
    return out
