"""
R2BOT Reel Background Library
6 robotics-flavored backgrounds — one per reel, cycling automatically.
All share: dark base, amber/gold accent, vignette. Each has a unique motion layer.
"""

import math, random
from PIL import Image, ImageDraw, ImageFont

W, H   = 1080, 1920
AMBER  = (245, 158, 11)
GOLD   = (255, 200,  50)
CYAN   = ( 60, 200, 240)
GREEN  = ( 60, 220, 120)
BLUE   = ( 80, 130, 255)
WHITE  = (255, 255, 255)
BG     = (  4,   4,  12)

# ── Shared utilities ──────────────────────────────────────────────────────────
def vignette(img, strength=0.58):
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    steps = 28
    for i in range(steps, 0, -1):
        mx = int(W * i / (steps * 1.4))
        my = int(H * i / (steps * 1.4))
        a  = int(255 * strength * (i/steps)**2)
        ld.rectangle([0,0,mx,H],        fill=(0,0,0,a))
        ld.rectangle([W-mx,0,W,H],      fill=(0,0,0,a))
        ld.rectangle([0,0,W,my],        fill=(0,0,0,a))
        ld.rectangle([0,H-my,W,H],      fill=(0,0,0,a))
    img.alpha_composite(layer)

def radial_glow(img, cx, cy, radius, color, strength=0.15):
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld    = ImageDraw.Draw(layer)
    for i in range(8, 0, -1):
        r = int(radius * i / 8)
        a = int(255 * strength * (1 - i/8)**1.6)
        ld.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(*color, a))
    img.alpha_composite(layer)


# ══════════════════════════════════════════════════════════════════════════════
# BG 1 — FLOATING PARTICLES  (golden dust rising — default v2 style)
# ══════════════════════════════════════════════════════════════════════════════
def _make_particles(seed=42, n=55):
    random.seed(seed)
    return [{
        "x":  random.randint(50, W-50),
        "y":  random.randint(0, H),
        "vy": random.uniform(0.3, 1.4),
        "r":  random.uniform(1.5, 4.0),
        "alpha": random.uniform(60, 180),
        "phase": random.uniform(0, math.pi*2),
    } for _ in range(n)]

_PARTICLES = _make_particles()

def bg_particles(img, frame_num, color=GOLD):
    radial_glow(img, W//2, H//2,   900, (180,100,10), 0.12)
    radial_glow(img, W//2, H+100,  700, (200,120,10), 0.20)
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    for p in _PARTICLES:
        y = (p["y"] - p["vy"] * frame_num) % H
        x = p["x"] + math.sin(frame_num * 0.03 + p["phase"]) * 18
        r = p["r"]
        tw = 0.6 + 0.4 * math.sin(frame_num * 0.08 + p["phase"])
        a  = int(p["alpha"] * tw)
        for gr in [r*3, r*2, r]:
            ld.ellipse([x-gr,y-gr,x+gr,y+gr], fill=(*color, int(a*0.15*(r*3-gr+r)/(r*3))))
        ld.ellipse([x-r,y-r,x+r,y+r], fill=(*color, a))
    img.alpha_composite(layer)
    vignette(img)


# ══════════════════════════════════════════════════════════════════════════════
# BG 2 — CIRCUIT BOARD  (glowing PCB traces + nodes)
# ══════════════════════════════════════════════════════════════════════════════
def _make_circuit(seed=7):
    random.seed(seed)
    lines, nodes = [], []
    # Horizontal + vertical segments on a coarse grid
    for _ in range(60):
        x  = random.randint(0, W//120) * 120
        y  = random.randint(0, H//120) * 120
        dx = random.choice([-120, 120, 240, 0, 0])
        dy = random.choice([-120, 120, 240, 0, 0]) if dx == 0 else 0
        lines.append((x, y, x+dx, y+dy))
        nodes.append((x, y))
        nodes.append((x+dx, y+dy))
    return lines, list(set(nodes))

_CIRCUIT_LINES, _CIRCUIT_NODES = _make_circuit()

def bg_circuit(img, frame_num, color=AMBER):
    radial_glow(img, W//2, H//2, 800, (120, 60, 0), 0.10)
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld    = ImageDraw.Draw(layer)
    t     = frame_num / 600.0
    # Animated "signal pulse" along traces
    for i, (x1,y1,x2,y2) in enumerate(_CIRCUIT_LINES):
        phase = (i * 0.3 + t * 4) % 1.0
        base_a = 25
        ld.line([(x1,y1),(x2,y2)], fill=(*color, base_a), width=2)
        # Travelling bright dot
        px = int(x1 + (x2-x1) * phase)
        py = int(y1 + (y2-y1) * phase)
        for gr in [10, 6, 3]:
            ld.ellipse([px-gr,py-gr,px+gr,py+gr],
                       fill=(*color, int(80/(gr+1))))
    for nx, ny in _CIRCUIT_NODES:
        ld.ellipse([nx-5,ny-5,nx+5,ny+5], fill=(*color, 50))
    img.alpha_composite(layer)
    vignette(img)


# ══════════════════════════════════════════════════════════════════════════════
# BG 3 — RADAR SWEEP  (rotating radar + blips)
# ══════════════════════════════════════════════════════════════════════════════
def _make_blips(seed=13, n=18):
    random.seed(seed)
    cx, cy = W//2, H//2
    MAX_R  = 700
    return [(
        cx + random.randint(80, MAX_R) * math.cos(random.uniform(0, math.pi*2)),
        cy + random.randint(80, MAX_R) * math.sin(random.uniform(0, math.pi*2)),
        random.uniform(0, math.pi*2)  # angle of appearance
    ) for _ in range(n)]

_BLIPS = _make_blips()

def bg_radar(img, frame_num, color=GREEN):
    cx, cy = W//2, H//2
    layer  = Image.new("RGBA", (W, H), (0,0,0,0))
    ld     = ImageDraw.Draw(layer)
    # Concentric rings
    for r in range(120, 750, 120):
        ld.ellipse([cx-r,cy-r,cx+r,cy+r], outline=(*color, 20), width=1)
    # Cross hairs
    ld.line([(cx,cy-720),(cx,cy+720)], fill=(*color,15), width=1)
    ld.line([(cx-720,cy),(cx+720,cy)], fill=(*color,15), width=1)
    # Sweep
    sweep_angle = (frame_num / 600.0) * math.pi * 2 * 3   # 3 full rotations
    sweep_deg   = math.degrees(sweep_angle) % 360
    # Trailing glow wedge
    wedge_steps = 30
    for s in range(wedge_steps, 0, -1):
        ang = math.radians(sweep_deg - s * 2.5)
        ea  = math.degrees(ang)
        a   = int(50 * (s/wedge_steps)**1.5)
        ld.pieslice([cx-700,cy-700,cx+700,cy+700],
                    start=ea-2.5, end=ea+0.5, fill=(*color, a))
    # Bright sweep line
    end_x = cx + 700 * math.cos(math.radians(sweep_deg))
    end_y = cy + 700 * math.sin(math.radians(sweep_deg))
    ld.line([(cx,cy),(end_x,end_y)], fill=(*color,90), width=3)
    # Blips — appear when sweep passes over them
    for bx, by, bang in _BLIPS:
        diff = (sweep_angle % (math.pi*2)) - bang
        if diff < 0: diff += math.pi*2
        if diff < math.pi * 0.6:
            fade = 1 - diff/(math.pi*0.6)
            a = int(200 * fade)
            for gr in [14,9,5]:
                ld.ellipse([bx-gr,by-gr,bx+gr,by+gr], fill=(*color, int(a*0.3)))
            ld.ellipse([bx-4,by-4,bx+4,by+4], fill=(*color,a))
    img.alpha_composite(layer)
    vignette(img)


# ══════════════════════════════════════════════════════════════════════════════
# BG 4 — NEURAL NETWORK  (animated nodes + connections)
# ══════════════════════════════════════════════════════════════════════════════
def _make_network(seed=99):
    random.seed(seed)
    nodes = [(random.randint(100,W-100), random.randint(200,H-200)) for _ in range(22)]
    edges = []
    for i in range(len(nodes)):
        for j in range(i+1, len(nodes)):
            dx = nodes[i][0]-nodes[j][0]; dy = nodes[i][1]-nodes[j][1]
            if math.sqrt(dx*dx+dy*dy) < 340:
                edges.append((i, j))
    return nodes, edges

_NET_NODES, _NET_EDGES = _make_network()

def bg_neural(img, frame_num, color=CYAN):
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld    = ImageDraw.Draw(layer)
    t     = frame_num / 600.0
    radial_glow(img, W//2, H//2, 900, (0, 60, 80), 0.10)
    # Pulsing edges
    for i, j in _NET_EDGES:
        x1,y1 = _NET_NODES[i]; x2,y2 = _NET_NODES[j]
        pulse  = 0.4 + 0.3 * math.sin(t*math.pi*4 + i*0.7 + j*0.5)
        a      = int(40 * pulse)
        ld.line([(x1,y1),(x2,y2)], fill=(*color, a), width=1)
        # Signal dot travelling edge
        phase = (t * 2.5 + i * 0.4 + j * 0.3) % 1.0
        px = int(x1 + (x2-x1)*phase); py = int(y1 + (y2-y1)*phase)
        ld.ellipse([px-4,py-4,px+4,py+4], fill=(*color, int(100*pulse)))
    # Pulsing nodes
    for k, (nx, ny) in enumerate(_NET_NODES):
        pulse = 0.5 + 0.5 * math.sin(t*math.pi*3 + k*0.9)
        r  = int(8 + 5*pulse)
        a  = int(120 * pulse)
        ld.ellipse([nx-r,ny-r,nx+r,ny+r], fill=(*color, a))
        ld.ellipse([nx-3,ny-3,nx+3,ny+3], fill=(*color, 200))
    img.alpha_composite(layer)
    vignette(img)


# ══════════════════════════════════════════════════════════════════════════════
# BG 5 — BINARY RAIN  (falling 0s and 1s, amber Matrix style)
# ══════════════════════════════════════════════════════════════════════════════
def _make_columns(seed=3):
    random.seed(seed)
    cols = []
    for x in range(40, W-40, 52):
        cols.append({
            "x": x,
            "speed": random.uniform(4, 11),
            "offset": random.uniform(0, H),
            "length": random.randint(6, 18),
            "chars": [random.choice("01") for _ in range(25)],
        })
    return cols

_BIN_COLS = _make_columns()

def bg_binary(img, frame_num, color=AMBER):
    try:
        f_bin = ImageFont.truetype(
            "/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf", 26)
    except:
        f_bin = ImageFont.load_default()
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    ld    = ImageDraw.Draw(layer)
    radial_glow(img, W//2, H//2, 800, (100, 60, 0), 0.08)
    for col in _BIN_COLS:
        head_y = (col["offset"] + frame_num * col["speed"]) % (H + 200)
        for k in range(col["length"]):
            cy = head_y - k * 34
            if cy < -34 or cy > H+34: continue
            char = col["chars"][k % len(col["chars"])]
            fade = 1.0 - k/col["length"]
            if k == 0:
                a = 220
                c = WHITE
            elif k < 3:
                a = int(160 * fade)
                c = color
            else:
                a = int(55 * fade)
                c = color
            ld.text((col["x"], int(cy)), char, font=f_bin, fill=(*c, a))
    img.alpha_composite(layer)
    vignette(img, strength=0.65)


# ══════════════════════════════════════════════════════════════════════════════
# BG 6 — GRID PULSE  (3D perspective grid with pulse wave)
# ══════════════════════════════════════════════════════════════════════════════
def bg_grid_pulse(img, frame_num, color=BLUE):
    layer  = Image.new("RGBA", (W, H), (0,0,0,0))
    ld     = ImageDraw.Draw(layer)
    radial_glow(img, W//2, H+200, 1100, (20, 40, 120), 0.18)
    horizon_y = int(H * 0.52)
    vp_x      = W // 2
    t         = frame_num / 600.0
    LINES_V   = 16
    LINES_H   = 14
    # Vertical lines (perspective)
    for i in range(LINES_V + 1):
        fx      = i / LINES_V           # 0→1
        base_x  = int(fx * W)
        top_x   = int(vp_x + (base_x - vp_x) * 0.01)
        ld.line([(top_x, horizon_y),(base_x, H)], fill=(*color,22), width=1)
    # Horizontal lines (scroll toward viewer)
    for i in range(LINES_H):
        scroll  = (i/LINES_H + t * 0.8) % 1.0
        persp   = scroll ** 1.8
        y       = int(horizon_y + persp * (H - horizon_y))
        # Width at this depth
        left_x  = int(vp_x - persp * vp_x)
        right_x = int(vp_x + persp * (W - vp_x))
        # Pulse brightness on nearest line
        brightness = 0.3 + 0.7 * persp
        a = int(55 * brightness)
        ld.line([(left_x,y),(right_x,y)], fill=(*color, a), width=max(1,int(persp*2)))
    img.alpha_composite(layer)
    vignette(img)


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════
BACKGROUNDS = [
    {"name": "particles",   "fn": bg_particles,  "color": GOLD,  "feel": "warm / discovery"},
    {"name": "circuit",     "fn": bg_circuit,    "color": AMBER, "feel": "PCB / hardware"},
    {"name": "radar",       "fn": bg_radar,      "color": GREEN, "feel": "sensor / detection"},
    {"name": "neural",      "fn": bg_neural,     "color": CYAN,  "feel": "AI / deep learning"},
    {"name": "binary",      "fn": bg_binary,     "color": AMBER, "feel": "code / software"},
    {"name": "grid_pulse",  "fn": bg_grid_pulse, "color": BLUE,  "feel": "space / future"},
]

def get_background(index: int):
    """Returns the background function for a given reel index (cycles every 6)."""
    bg = BACKGROUNDS[index % len(BACKGROUNDS)]
    return bg["fn"], bg["color"], bg["name"]

def apply_background(img, frame_num, bg_index: int):
    """Apply background + vignette to an RGBA image in-place."""
    fn, color, _ = get_background(bg_index)
    fn(img, frame_num, color)
