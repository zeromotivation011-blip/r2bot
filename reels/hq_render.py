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
HOOK_END  = round(FRAMES * 5 / 60)         # ~5s hook
CTA_START = round(FRAMES * 50 / 60)        # last ~10s = CTA
FADE      = 30                             # ~1s cross-fade used throughout

# ── Palette ──────────────────────────────────────────────────────────────────
BG_TOP  = (13, 15, 30)
BG_BOT  = (3,  3,  9)
AMBER   = (245, 158, 11)
AMBER_HI= (255, 193, 66)
CYAN    = (96, 214, 250)
WHITE   = (246, 248, 255)
GRAY    = (150, 154, 176)
INK     = (7, 6, 12)

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

# ── R2BOT logo ───────────────────────────────────────────────────────────────
def _logo(d, x, y, size, alpha):
    f1 = font("bold", size)
    f2 = font("bold", int(size * 0.8))
    d.text((x*SS, y*SS), "R2", font=f1, fill=(*AMBER, alpha))
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

# ── Main frame renderer ──────────────────────────────────────────────────────
def render_frame(frame_num, topic):
    base = _background().convert("RGBA")                   # RGBA @ SS
    base = Image.alpha_composite(base, _draw_particles(frame_num))

    bright = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))     # -> bloom source
    sharp  = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))     # -> crisp overlay
    sd = ImageDraw.Draw(sharp)

    # persistent logo
    if frame_num > 8:
        la = int(255 * clamp(prg(frame_num, 8, 34)))
        _logo(sd, 62, 84, 40, la)

    # ── Section 1: HOOK ──────────────────────────────────────────────────────
    if frame_num < HOOK_END:
        lines, fh, size = _wrap_fit(topic["hook"], "bold", 940, 82, 46, max_lines=5)
        lh = size * 1.2                                    # line height (output px)
        block_h = lh * len(lines)
        top = 560 - block_h / 2                             # vertically centered block
        oa = 1 - ease_in(prg(frame_num, HOOK_END - FADE, HOOK_END))   # fade into concept
        bd = ImageDraw.Draw(bright)
        for i, ln in enumerate(lines):
            p = ease_back(prg(frame_num, i*7, 38 + i*7))
            yoff = (1 - clamp(p)) * 42
            ya = int(255 * clamp(prg(frame_num, i*7, 32 + i*7)) * oa)
            y = top + lh*(i + 0.5) - yoff
            bd.text((W//2*SS, int(y*SS)), ln, font=fh, fill=(*AMBER_HI, int(ya*0.32)), anchor="mm")
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
    elif frame_num < 450:
        local = frame_num - 90
        p_in  = ease_out(prg(local, 0, 40))
        p_out = ease_in(prg(local, 322, 360))
        alpha = int(255 * clamp(p_in - p_out))
        if alpha > 0:
            # eyebrow + title
            _text(sd, (W//2, 200), "CONCEPT", font("medium", 30),
                  (*CYAN, int(alpha*0.85)))
            ftitle = font("bold", 62)
            bd = ImageDraw.Draw(bright)
            bd.text((W//2*SS, 268*SS), topic["title"], font=ftitle, fill=(*AMBER, int(alpha*0.4)), anchor="mm")
            sd.text((W//2*SS, 268*SS), topic["title"], font=ftitle, fill=(*AMBER_HI, alpha), anchor="mm")
            bp = ease_out(prg(local, 6, 52))
            bw = int(460 * bp)
            sd.rectangle([(W//2*SS - bw//2*SS, 316*SS), (W//2*SS + bw//2*SS, 322*SS)], fill=(*AMBER, int(200*bp*alpha/255)))

            # centerpiece: HUD rings + robot arm
            ccx, ccy = 540, 900
            _hud_rings(bright, sharp, frame_num, ccx, ccy, alpha)
            _robot_arm(bright, sharp, frame_num, ccx, ccy + 30, alpha)

            # curiosity angle (auto-wrapped, fades up)
            p_sub = ease_out(prg(local, 44, 108))
            sa = int(alpha * p_sub)
            alines, fs, asize = _wrap_fit(topic["curiosity_angle"], "regular", 900, 40, 30, max_lines=3)
            alh = asize * 1.28
            atop = 1380 - alh*len(alines)/2
            for i, ln in enumerate(alines):
                _text(sd, (W//2, atop + alh*(i + 0.5)), ln, fs, (*CYAN, sa))

    # ── Section 3: CTA ───────────────────────────────────────────────────────
    else:
        local = frame_num - 450
        p = ease_out(prg(local, 0, 42))
        out = ease_in(prg(local, 104, 150))
        alpha = clamp(p - out)
        a255 = int(255 * alpha)

        # amber panel scales in with spring
        pb = ease_back(prg(local, 0, 46))
        bh = int(380 * clamp(pb))
        panel = Image.new("RGBA", (WW, HH), (0, 0, 0, 0))
        pd = ImageDraw.Draw(panel)
        y0, y1 = (H - bh)//2, (H + bh)//2
        pd.rounded_rectangle([40*SS, y0*SS, (W-40)*SS, y1*SS], radius=40*SS, fill=(*AMBER, int(240*alpha)))
        # inner highlight
        pd.rounded_rectangle([40*SS, y0*SS, (W-40)*SS, (y0+8)*SS], radius=8*SS, fill=(*AMBER_HI, int(200*alpha)))
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
        bd.rounded_rectangle([40*SS, y0*SS, (W-40)*SS, y1*SS], radius=40*SS, outline=(*AMBER_HI, int(160*alpha)), width=int(6*SS))

    # ── Compose at output res: base+glow (behind) then crisp sharp on top ─────
    base_out = base.convert("RGB").resize((W, H), Image.LANCZOS)
    glow, strength = _bloom_at_output(bright, strength=0.85)
    arr = np.clip(np.asarray(base_out, np.int16) + (glow * strength).astype(np.int16), 0, 255).astype(np.uint8)
    base_out = Image.fromarray(arr, "RGB").convert("RGBA")
    sharp_out = sharp.resize((W, H), Image.LANCZOS)
    out = Image.alpha_composite(base_out, sharp_out).convert("RGB")
    return out
