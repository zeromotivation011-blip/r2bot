"""
R2BOT Reels #003 and #004 renderer
#003 — Leonardo da Vinci's Robot  (circuit background)
#004 — Robot That Found the Titanic  (radar background)
"""

import os, math, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.path.insert(0, '/sessions/upbeat-pensive-euler/mnt/r2bot/reels')
from backgrounds import apply_background

W, H   = 1080, 1920
FPS    = 30
FRAMES = FPS * 20   # 600
BG     = (4, 4, 12)
AMBER  = (245, 158, 11)
GOLD   = (255, 200,  50)
WHITE  = (255, 255, 255)
CREAM  = (255, 245, 220)
GRAY   = (150, 150, 170)
CYAN   = ( 60, 200, 240)
GREEN  = ( 60, 220, 120)

FP = '/usr/share/fonts/truetype/google-fonts/'
def font(style, size):
    m = {'bold':'Poppins-Bold.ttf','medium':'Poppins-Medium.ttf','regular':'Poppins-Regular.ttf'}
    return ImageFont.truetype(FP + m[style], size)

def ease_out(t):  return 1-(1-t)**3
def ease_in(t):   return t**3
def clamp(v,lo=0.,hi=1.): return max(lo,min(hi,v))
def prg(f,s,e):
    if f<=s: return 0.
    if f>=e: return 1.
    return (f-s)/(e-s)

def draw_r2bot_badge(img, alpha=1.0):
    layer = Image.new('RGBA',(W,H),(0,0,0,0))
    ld    = ImageDraw.Draw(layer)
    a = int(200*alpha)
    ld.rounded_rectangle([44,72,280,132], radius=30, fill=(20,20,40,a),
                          outline=(*AMBER,int(120*alpha)), width=2)
    ld.text((68,87),  'R2', font=font('bold',38), fill=(*AMBER,int(255*alpha)))
    ld.text((118,93), 'BOT', font=font('bold',30), fill=(*WHITE,int(255*alpha)))
    img.alpha_composite(layer)

def wrap(text, max_chars=20):
    words = text.split()
    lines, cur = [], []
    for w in words:
        if sum(len(x)+1 for x in cur)+len(w) > max_chars:
            lines.append(' '.join(cur)); cur=[w]
        else: cur.append(w)
    if cur: lines.append(' '.join(cur))
    return lines

def big_text(draw, text, cy, size, color, alpha, max_chars=17, shadow=True):
    f = font('bold', size)
    lines = wrap(text, max_chars)
    lh = size + 14
    sy = cy - (len(lines)*lh)//2
    a  = int(255*alpha)
    for i, ln in enumerate(lines):
        y = sy + i*lh
        if shadow:
            draw.text((W//2+3,y+3), ln, font=f, fill=(0,0,0,int(a*0.45)), anchor='mm')
        draw.text((W//2,y), ln, font=f, fill=(*color,a), anchor='mm')

def sub_text(draw, text, cy, size, color, alpha, max_chars=32):
    f = font('regular', size)
    lines = wrap(text, max_chars)
    lh = size+10
    sy = cy - (len(lines)*lh)//2
    a  = int(255*alpha)
    for i, ln in enumerate(lines):
        draw.text((W//2, sy+i*lh), ln, font=f, fill=(*color,a), anchor='mm')

def amber_line(draw, y, frac, alpha=1.0):
    bw = int(W*0.72*frac)
    draw.rounded_rectangle([W//2-bw//2,y,W//2+bw//2,y+5], radius=3,
                             fill=(*AMBER,int(255*alpha)))

# ─────────────────────────────────────────────────────────────────────────────
# REEL 003 — Leonardo da Vinci's Robot
# BG index 1 = circuit
# Sections:
#  0-3s  (0-89):   Hook — "500 years before Boston Dynamics"
#  3-7s  (90-209): "da Vinci built a ROBOT"
#  7-13s (210-389): Plans lost → NASA found them → worked first try
#  13-18s(390-539): "Same man who painted the Mona Lisa"
#  18-20s(540-599): CTA
# ─────────────────────────────────────────────────────────────────────────────
def frame_003(fn):
    img  = Image.new('RGBA',(W,H),(*BG,255))
    apply_background(img, fn, bg_index=1)   # circuit
    draw = ImageDraw.Draw(img)

    badge_a = clamp(ease_out(prg(fn,5,30)))
    draw_r2bot_badge(img, badge_a)
    draw = ImageDraw.Draw(img)

    if fn < 90:
        p = ease_out(prg(fn,0,50))
        sub_text(draw, '500 years before Boston Dynamics...', 420, 46, GRAY, p*0.9, 30)
        p2 = ease_out(prg(fn,18,65))
        big_text(draw, 'A man built', 580, 90, WHITE, p2, 16)
        big_text(draw, 'a walking ROBOT.', 700, 90, AMBER, p2, 16)
        p3 = ease_out(prg(fn,35,80))
        f_yr = font('bold',52)
        draw.text((W//2,850), '1495  A.D.', font=f_yr,
                  fill=(*GOLD,int(200*p3)), anchor='mm')

    elif fn < 210:
        loc = fn-90
        p_in  = ease_out(prg(loc,0,40))
        p_out = ease_in(prg(loc,80,120))
        a = clamp(p_in-p_out)

        big_text(draw, 'Leonardo', 420, 96, WHITE, p_in*a, 14)
        big_text(draw, 'da Vinci.', 540, 96, AMBER, p_in*a, 14)
        amber_line(draw, 600, ease_out(prg(loc,10,55))*a, a)

        p2 = ease_out(prg(loc,25,70))
        sub_text(draw, 'Designed a mechanical knight.', 720, 44, CREAM, p2*a, 30)
        sub_text(draw, 'It could sit. Stand. Raise its visor.', 780, 40, GRAY, p2*a, 34)
        sub_text(draw, 'Move its arms.', 830, 40, GRAY, p2*a, 34)

        p3 = ease_out(prg(loc,50,95))
        f_em = font('regular',78)
        draw.text((W//2,990),'🤖', font=f_em, fill=(*WHITE,int(200*p3*a)), anchor='mm')

    elif fn < 390:
        loc = fn-210
        p_in  = ease_out(prg(loc,0,35))
        p_out = ease_in(prg(loc,140,180))
        a = clamp(p_in-p_out)

        sub_text(draw, 'The plans were lost for 500 years.', 340, 44, GRAY, p_in*a, 34)
        amber_line(draw, 380, ease_out(prg(loc,5,40))*a, a*0.7)

        p2 = ease_out(prg(loc,20,60))
        big_text(draw, 'In 2002,', 490, 72, WHITE, p2*a, 16)
        big_text(draw, 'NASA engineers', 590, 72, AMBER, p2*a, 16)
        big_text(draw, 'found the sketches.', 690, 72, WHITE, p2*a, 16)

        p3 = ease_out(prg(loc,55,100))
        sub_text(draw, 'They built it.', 820, 50, CREAM, p3*a, 28)

        p4 = ease_out(prg(loc,75,120))
        big_text(draw, 'It worked.', 940, 88, GREEN, p4*a, 14)
        sub_text(draw, 'First try.', 1020, 46, GRAY, p4*a, 28)

    elif fn < 540:
        loc = fn-390
        p_in  = ease_out(prg(loc,0,35))
        p_out = ease_in(prg(loc,110,150))
        a = clamp(p_in-p_out)

        sub_text(draw, 'The man who built the first robot...', 380, 44, GRAY, p_in*a, 34)
        p2 = ease_out(prg(loc,15,55))
        big_text(draw, 'also painted', 510, 80, WHITE, p2*a, 16)
        big_text(draw, 'the Mona Lisa.', 620, 80, AMBER, p2*a, 16)
        amber_line(draw, 680, ease_out(prg(loc,20,60))*a, a)

        p3 = ease_out(prg(loc,45,90))
        f_em = font('regular',100)
        draw.text((W//2,830),'🎨🤖', font=f_em,
                  fill=(*WHITE,int(200*p3*a)), anchor='mm')
        sub_text(draw, 'Leonardo da Vinci.', 980, 46, CREAM, p3*a, 30)
        sub_text(draw, 'The original genius.', 1040, 40, GRAY, p3*a, 30)

    else:
        loc = fn-540
        p = ease_out(prg(loc,0,35))
        pulse = 0.5+0.5*math.sin(loc*0.2)
        # Warm glow pulse
        from backgrounds import radial_glow
        radial_glow(img, W//2, H//2, int(400+80*pulse), (180,100,10), 0.22*p)
        draw = ImageDraw.Draw(img)
        p2 = ease_out(prg(loc,8,42))
        sub_text(draw, 'History is stranger', 620, 44, GRAY, p2, 30)
        sub_text(draw, 'than science fiction.', 676, 44, GRAY, p2, 30)
        big_text(draw, 'R2BOT', 820, 118, AMBER, p2, 14)
        p3 = ease_out(prg(loc,20,55))
        sub_text(draw, 'Zero → Robotics Engineer', 960, 40, WHITE, p3*0.85, 30)
        sub_text(draw, 'r2bot.in  •  Free to start', 1014, 34, GRAY, p3*0.7, 30)

    return img.convert('RGB')


# ─────────────────────────────────────────────────────────────────────────────
# REEL 004 — Robot That Found the Titanic
# BG index 2 = radar
# Sections:
#  0-3s  (0-89):   Hook — "The Titanic was not found by humans"
#  3-7s  (90-209): "Robert Ballard — 1985 — deep-sea robot ARGO"
#  7-12s (210-359): "2:47am — cameras spotted a rusted boiler"
#  12-17s(360-509): "73 years. Humans failed. ARGO found it."
#  17-20s(510-599): CTA
# ─────────────────────────────────────────────────────────────────────────────
def frame_004(fn):
    img  = Image.new('RGBA',(W,H),(*BG,255))
    apply_background(img, fn, bg_index=2)   # radar
    draw = ImageDraw.Draw(img)

    badge_a = clamp(ease_out(prg(fn,5,30)))
    draw_r2bot_badge(img, badge_a)
    draw = ImageDraw.Draw(img)

    if fn < 90:
        p = ease_out(prg(fn,0,45))
        sub_text(draw, 'The Titanic was not found', 440, 50, WHITE, p, 26)
        sub_text(draw, 'by humans.', 506, 50, WHITE, p, 26)
        amber_line(draw, 546, ease_out(prg(fn,12,55))*p, p)
        p2 = ease_out(prg(fn,22,68))
        big_text(draw, 'It was found', 660, 86, CREAM, p2, 16)
        big_text(draw, 'by a robot.', 770, 86, GREEN, p2, 16)
        p3 = ease_out(prg(fn,40,82))
        f_em = font('regular',82)
        draw.text((W//2,920),'🚢', font=f_em,
                  fill=(*WHITE,int(200*p3)), anchor='mm')

    elif fn < 210:
        loc = fn-90
        p_in  = ease_out(prg(loc,0,38))
        p_out = ease_in(prg(loc,82,120))
        a = clamp(p_in-p_out)

        sub_text(draw, '1985.', 340, 52, AMBER, p_in*a, 20)
        sub_text(draw, 'Oceanographer Robert Ballard', 412, 42, GRAY, p_in*a, 32)
        sub_text(draw, 'sent a deep-sea robot to the ocean floor.', 466, 38, GRAY, p_in*a, 38)
        amber_line(draw, 510, ease_out(prg(loc,10,50))*a, a)

        p2 = ease_out(prg(loc,25,68))
        big_text(draw, 'Its name:', 620, 70, WHITE, p2*a, 16)
        big_text(draw, 'ARGO.', 720, 108, GREEN, p2*a, 12)

        p3 = ease_out(prg(loc,48,92))
        sub_text(draw, 'Cameras. Sonar. No crew.', 860, 42, CREAM, p3*a, 32)
        sub_text(draw, 'Just a robot hunting the deep.', 914, 40, GRAY, p3*a, 34)

    elif fn < 360:
        loc = fn-210
        p_in  = ease_out(prg(loc,0,35))
        p_out = ease_in(prg(loc,110,150))
        a = clamp(p_in-p_out)

        # Time stamp
        f_time = font('bold',60)
        draw.text((W//2,320), '2:47 AM', font=f_time,
                  fill=(*AMBER,int(255*p_in*a)), anchor='mm')
        sub_text(draw, 'After weeks of searching...', 400, 40, GRAY, p_in*a, 32)
        amber_line(draw, 435, ease_out(prg(loc,8,45))*a, a)

        p2 = ease_out(prg(loc,20,62))
        big_text(draw, "ARGO's cameras", 560, 76, WHITE, p2*a, 18)
        big_text(draw, 'spotted something.', 660, 76, WHITE, p2*a, 18)

        p3 = ease_out(prg(loc,40,82))
        big_text(draw, 'A rusted boiler.', 800, 86, GREEN, p3*a, 16)

        p4 = ease_out(prg(loc,62,105))
        sub_text(draw, 'The crew fell silent.', 930, 44, CREAM, p4*a, 30)
        sub_text(draw, 'Nobody moved.', 985, 44, CREAM, p4*a, 30)

    elif fn < 510:
        loc = fn-360
        p_in  = ease_out(prg(loc,0,35))
        p_out = ease_in(prg(loc,115,150))
        a = clamp(p_in-p_out)

        # Big number
        f_big = font('bold',150)
        draw.text((W//2+3,490+3), '73', font=f_big,
                  fill=(0,0,0,int(120*p_in*a)), anchor='mm')
        draw.text((W//2,490), '73', font=f_big,
                  fill=(*AMBER,int(255*p_in*a)), anchor='mm')
        sub_text(draw, 'years of human searches.', 590, 44, GRAY, p_in*a, 30)
        sub_text(draw, 'All failed.', 644, 44, GRAY, p_in*a, 30)
        amber_line(draw, 680, ease_out(prg(loc,12,50))*a, a)

        p2 = ease_out(prg(loc,28,68))
        big_text(draw, 'ARGO', 790, 100, GREEN, p2*a, 12)
        big_text(draw, 'found it first.', 900, 80, WHITE, p2*a, 16)

        p3 = ease_out(prg(loc,55,98))
        sub_text(draw, 'The robot saw the Titanic', 1020, 40, CREAM, p3*a, 32)
        sub_text(draw, 'before any human ever did.', 1070, 40, CREAM, p3*a, 32)

    else:
        loc = fn-510
        p = ease_out(prg(loc,0,35))
        from backgrounds import radial_glow
        pulse = 0.5+0.5*math.sin(loc*0.2)
        radial_glow(img, W//2, H//2, int(420+80*pulse), (0,80,40), 0.20*p)
        draw = ImageDraw.Draw(img)
        p2 = ease_out(prg(loc,8,42))
        sub_text(draw, 'Machines have already', 620, 44, GRAY, p2, 30)
        sub_text(draw, 'changed history.', 676, 44, GRAY, p2, 30)
        big_text(draw, 'R2BOT', 820, 118, AMBER, p2, 14)
        p3 = ease_out(prg(loc,20,55))
        sub_text(draw, 'Zero → Robotics Engineer', 960, 40, WHITE, p3*0.85, 30)
        sub_text(draw, 'r2bot.in  •  Free to start', 1014, 34, GRAY, p3*0.7, 30)

    return img.convert('RGB')


REEL_RENDERERS = {
    'reel_003': frame_003,
    'reel_004': frame_004,
}
