#!/usr/bin/env python3
"""Per-topic centerpiece animations for R2BOT reels.

Every function has the same signature as hq_render._robot_arm so it can be
dropped straight into the concept scene:

    fn(bright, sharp, frame_num, cx, cy, alpha)

  bright  RGBA layer that feeds the bloom pass (draw glow here)
  sharp   RGBA layer composited crisply on top (draw line work here)
  alpha   0-255 master opacity for the scene fade

Coordinates are in OUTPUT px and multiplied by SS at draw time, matching the
convention in hq_render.

Dispatch is by the topic's "visuals" key in topic_bank.json. Anything without a
registered visual falls back to abstract HUD rings -- deliberately neutral, so a
reel never shows an object that misrepresents its subject (a LiDAR explainer
showing a robot arm, for example).

hq_render is imported lazily inside each function to avoid a circular import.
"""
import math


# ── shared drawing helpers ───────────────────────────────────────────────────
def _ctx():
    import hq_render as H
    return H


def _grid_dots(sd, H, cx, cy, cols, rows, step, a, color=None):
    color = color or H.GRAY
    SS = H.SS
    x0 = cx - (cols - 1) * step / 2
    y0 = cy - (rows - 1) * step / 2
    for r in range(rows):
        for c in range(cols):
            x, y = x0 + c*step, y0 + r*step
            sd.ellipse([(x-2)*SS, (y-2)*SS, (x+2)*SS, (y+2)*SS], fill=(*color, a))


# ── 1. robot arm (inverse kinematics, end effector) ──────────────────────────
def robot_arm(bright, sharp, frame_num, cx, cy, alpha):
    H = _ctx()
    H._robot_arm(bright, sharp, frame_num, cx, cy, alpha)


# ── 2. lidar scan ────────────────────────────────────────────────────────────
def lidar_scan(bright, sharp, frame_num, cx, cy, alpha):
    """Rotating beam sweep; each pulse leaves a point where it strikes a wall."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    t = frame_num / H.FRAMES
    sweep = (t * 4.0) % 1.0
    head = sweep * 2 * math.pi
    R = 300

    # room outline the beams bounce off (an irregular closed shape)
    def wall_r(theta):
        return R * (0.80 + 0.16*math.sin(3*theta + 0.6) + 0.07*math.cos(5*theta))

    pts = []
    for k in range(160):
        th = 2*math.pi * k/160
        rr = wall_r(th)
        pts.append((cx + rr*math.cos(th), cy + rr*math.sin(th)))
    sd.line([(p[0]*SS, p[1]*SS) for p in pts] + [(pts[0][0]*SS, pts[0][1]*SS)],
            fill=(*H.GRAY, int(a*0.30)), width=int(3*SS))

    # accumulated point cloud - denser behind the beam head, fading with age
    N = 132
    for k in range(N):
        frac = k / N
        age = (sweep - frac) % 1.0
        if age > 0.62:
            continue
        th = 2*math.pi * frac
        rr = wall_r(th)
        px, py = cx + rr*math.cos(th), cy + rr*math.sin(th)
        fade = (1 - age/0.62) ** 1.6
        pa = int(a * fade)
        s = 3 + 3*fade
        sd.ellipse([(px-s)*SS, (py-s)*SS, (px+s)*SS, (py+s)*SS], fill=(*H.CYAN, pa))
        if fade > 0.45:
            bd.ellipse([(px-s*1.9)*SS, (py-s*1.9)*SS, (px+s*1.9)*SS, (py+s*1.9)*SS],
                       fill=(*H.CYAN, int(pa*0.5)))

    # active beam wedge
    for j in range(9):
        th = head - j*0.031
        rr = wall_r(th)
        ba = int(a * (1 - j/9) * 0.85)
        sd.line([cx*SS, cy*SS, (cx + rr*math.cos(th))*SS, (cy + rr*math.sin(th))*SS],
                fill=(*H.AMBER, ba), width=int((4 - j*0.3)*SS))
    hr = wall_r(head)
    bd.line([cx*SS, cy*SS, (cx + hr*math.cos(head))*SS, (cy + hr*math.sin(head))*SS],
            fill=(*H.AMBER_HI, int(a*0.7)), width=int(9*SS))

    # sensor body
    sd.ellipse([(cx-26)*SS, (cy-26)*SS, (cx+26)*SS, (cy+26)*SS],
               fill=(*H.INK, a), outline=(*H.AMBER, a), width=int(4*SS))
    bd.ellipse([(cx-34)*SS, (cy-34)*SS, (cx+34)*SS, (cy+34)*SS],
               fill=(*H.AMBER, int(a*0.34)))


# ── 3. PID controller ────────────────────────────────────────────────────────
def pid_graph(bright, sharp, frame_num, cx, cy, alpha):
    """Response curve overshooting a setpoint, then damping onto it."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    Wd, Hg = 620, 300
    x0, y0 = cx - Wd/2, cy - Hg/2
    setp = y0 + Hg*0.32

    # axes + setpoint
    sd.line([x0*SS, (y0+Hg)*SS, (x0+Wd)*SS, (y0+Hg)*SS], fill=(*H.GRAY, int(a*0.5)), width=int(3*SS))
    sd.line([x0*SS, y0*SS, x0*SS, (y0+Hg)*SS], fill=(*H.GRAY, int(a*0.5)), width=int(3*SS))
    for dx in range(0, int(Wd), 26):
        sd.line([(x0+dx)*SS, setp*SS, (x0+dx+13)*SS, setp*SS], fill=(*H.CYAN, int(a*0.55)), width=int(3*SS))
    H._text(sd, (x0 + Wd + 46, setp), "target", H.font("medium", 26), (*H.CYAN, int(a*0.8)))

    # curve sweeps in
    prog = H.clamp(((frame_num / H.FRAMES) * 3.2) % 1.0 / 0.75)
    steps = int(200 * prog)
    pts = []
    for i in range(max(steps, 2)):
        u = i / 200
        # damped oscillation settling on the setpoint
        env = math.exp(-4.2*u)
        val = 1 - env*math.cos(9.5*u)
        px = x0 + Wd*u
        py = (y0 + Hg) - (setp_off := (y0 + Hg - setp)) * val
        pts.append((px*SS, py*SS))
    if len(pts) > 1:
        sd.line(pts, fill=(*H.AMBER, a), width=int(5*SS), joint="curve")
        bd.line(pts, fill=(*H.AMBER_HI, int(a*0.55)), width=int(11*SS), joint="curve")
        hx, hy = pts[-1]
        sd.ellipse([hx-9*SS, hy-9*SS, hx+9*SS, hy+9*SS], fill=(*H.WHITE, a))
        bd.ellipse([hx-19*SS, hy-19*SS, hx+19*SS, hy+19*SS], fill=(*H.AMBER_HI, int(a*0.6)))

    # P I D chips light in sequence
    for i, lab in enumerate("PID"):
        lit = (int((frame_num/12)) % 3) == i
        bx = cx - 96 + i*96
        by = y0 + Hg + 62
        col = H.AMBER if lit else H.GRAY
        sd.rounded_rectangle([(bx-32)*SS, (by-26)*SS, (bx+32)*SS, (by+26)*SS], radius=12*SS,
                             outline=(*col, a), width=int(3*SS),
                             fill=(*H.AMBER, int(a*0.22)) if lit else None)
        H._text(sd, (bx, by), lab, H.font("bold", 32), (*(H.WHITE if lit else H.GRAY), a))


# ── 4. SLAM ──────────────────────────────────────────────────────────────────
def slam_map(bright, sharp, frame_num, cx, cy, alpha):
    """Robot traces a loop; occupancy grid fills in behind it."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    prog = ((frame_num / H.FRAMES) * 3.0) % 1.0
    R = 210

    def path(u):
        th = 2*math.pi*u
        return (cx + R*math.cos(th)*1.15, cy + R*math.sin(th)*0.78)

    _grid_dots(sd, H, cx, cy, 11, 9, 56, int(a*0.16))

    # mapped walls revealed progressively
    N = 150
    for k in range(N):
        u = k/N
        if u > prog:
            continue
        px, py = path(u)
        nx, ny = math.cos(2*math.pi*u), math.sin(2*math.pi*u)
        wx, wy = px + nx*54, py + ny*40
        fade = H.clamp((prog - u) * 6)
        sd.ellipse([(wx-4)*SS, (wy-4)*SS, (wx+4)*SS, (wy+4)*SS],
                   fill=(*H.CYAN, int(a*0.85*fade)))

    # travelled trajectory
    tp = [path(k/120) for k in range(int(120*prog)+1)]
    if len(tp) > 1:
        sd.line([(p[0]*SS, p[1]*SS) for p in tp], fill=(*H.AMBER, int(a*0.85)), width=int(4*SS))

    # loop closure flash
    if prog > 0.93:
        f = (prog - 0.93)/0.07
        sx, sy = path(0)
        rr = 26 + 30*f
        bd.ellipse([(sx-rr)*SS, (sy-rr)*SS, (sx+rr)*SS, (sy+rr)*SS],
                   outline=(*H.AMBER_HI, int(a*(1-f))), width=int(6*SS))

    rx, ry = path(prog)
    sd.ellipse([(rx-15)*SS, (ry-15)*SS, (rx+15)*SS, (ry+15)*SS],
               fill=(*H.AMBER, a), outline=(*H.WHITE, a), width=int(3*SS))
    bd.ellipse([(rx-30)*SS, (ry-30)*SS, (rx+30)*SS, (ry+30)*SS], fill=(*H.AMBER_HI, int(a*0.5)))


# ── 5. ROS2 nodes ────────────────────────────────────────────────────────────
def ros2_nodes(bright, sharp, frame_num, cx, cy, alpha):
    """Nodes on a bus with messages travelling along the links."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    nodes = [("camera", cx-190, cy-140), ("lidar", cx+190, cy-140),
             ("planner", cx, cy), ("motors", cx-190, cy+150), ("odom", cx+190, cy+150)]
    links = [(0, 2), (1, 2), (2, 3), (2, 4)]

    for i, j in links:
        _, x1, y1 = nodes[i]
        _, x2, y2 = nodes[j]
        sd.line([x1*SS, y1*SS, x2*SS, y2*SS], fill=(*H.GRAY, int(a*0.4)), width=int(3*SS))
        # message pips
        for m in range(2):
            u = ((frame_num/48) + m*0.5 + i*0.17) % 1.0
            mx, my = x1 + (x2-x1)*u, y1 + (y2-y1)*u
            sd.ellipse([(mx-6)*SS, (my-6)*SS, (mx+6)*SS, (my+6)*SS], fill=(*H.CYAN, a))
            bd.ellipse([(mx-13)*SS, (my-13)*SS, (mx+13)*SS, (my+13)*SS], fill=(*H.CYAN, int(a*0.55)))

    for k, (name, nx, ny) in enumerate(nodes):
        hub = (k == 2)
        r = 54 if hub else 44
        sd.ellipse([(nx-r)*SS, (ny-r)*SS, (nx+r)*SS, (ny+r)*SS],
                   fill=(*H.INK, a), outline=(*(H.AMBER if hub else H.GRAY), a), width=int(4*SS))
        if hub:
            bd.ellipse([(nx-r-10)*SS, (ny-r-10)*SS, (nx+r+10)*SS, (ny+r+10)*SS],
                       fill=(*H.AMBER, int(a*0.3)))
        H._text(sd, (nx, ny), name, H.font("medium", 22),
                (*(H.WHITE if hub else H.GRAY), a))


# ── 6. reinforcement learning ────────────────────────────────────────────────
def rl_learning(bright, sharp, frame_num, cx, cy, alpha):
    """Attempts fail, then succeed; the reward bar climbs."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    cyc = ((frame_num / H.FRAMES) * 5.0) % 1.0
    attempt = int((frame_num / H.FRAMES) * 5.0)
    success = attempt >= 3

    ground = cy + 150
    sd.line([(cx-260)*SS, ground*SS, (cx+260)*SS, ground*SS], fill=(*H.GRAY, int(a*0.5)), width=int(3*SS))

    # walker: falls on early attempts, strides on later ones
    if success:
        px = cx - 200 + 400*cyc
        py = ground - 66 - abs(math.sin(cyc*10))*16
        lean = math.sin(cyc*10)*0.25
    else:
        px = cx - 150 + 150*cyc
        fall = H.clamp((cyc - 0.45) / 0.55)
        py = ground - 66 + fall*44
        lean = fall * 1.35

    col = H.AMBER if success else H.GRAY
    # body
    hx, hy = px + math.sin(lean)*54, py - math.cos(lean)*54
    sd.line([px*SS, py*SS, hx*SS, hy*SS], fill=(*col, a), width=int(9*SS))
    sd.ellipse([(hx-19)*SS, (hy-19)*SS, (hx+19)*SS, (hy+19)*SS], fill=(*col, a))
    # legs
    sw = math.sin(cyc*10) * (26 if success else 6)
    sd.line([px*SS, py*SS, (px-sw)*SS, ground*SS], fill=(*col, a), width=int(7*SS))
    sd.line([px*SS, py*SS, (px+sw)*SS, ground*SS], fill=(*col, a), width=int(7*SS))
    if success:
        bd.ellipse([(hx-30)*SS, (hy-30)*SS, (hx+30)*SS, (hy+30)*SS], fill=(*H.AMBER_HI, int(a*0.5)))

    # reward bar
    bx, by, bw = cx - 200, cy - 190, 400
    filled = H.clamp((attempt + cyc) / 5.0)
    sd.rounded_rectangle([bx*SS, by*SS, (bx+bw)*SS, (by+18)*SS], radius=9*SS, fill=(*H.GRAY, int(a*0.25)))
    sd.rounded_rectangle([bx*SS, by*SS, (bx+bw*filled)*SS, (by+18)*SS], radius=9*SS, fill=(*H.AMBER, a))
    H._text(sd, (cx, by - 30), "reward", H.font("medium", 24), (*H.CYAN, int(a*0.85)))
    H._text(sd, (cx, ground + 46), f"attempt {attempt+1:,}".replace("attempt 1", "attempt 1"),
            H.font("medium", 24), (*H.GRAY, int(a*0.8)))


# ── 7. degrees of freedom ────────────────────────────────────────────────────
def dof_diagram(bright, sharp, frame_num, cx, cy, alpha):
    """Three rotation axes plus three translation arrows."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    t = frame_num / 26.0

    sd.rounded_rectangle([(cx-44)*SS, (cy-44)*SS, (cx+44)*SS, (cy+44)*SS], radius=14*SS,
                         fill=(*H.INK, a), outline=(*H.AMBER, a), width=int(4*SS))
    bd.rounded_rectangle([(cx-52)*SS, (cy-52)*SS, (cx+52)*SS, (cy+52)*SS], radius=18*SS,
                         outline=(*H.AMBER, int(a*0.4)), width=int(7*SS))

    # rotation arcs
    for k in range(3):
        rr = 112 + k*52
        ph = t + k*2.1
        start = (ph*38) % 360
        sd.arc([(cx-rr)*SS, (cy-rr*0.62)*SS, (cx+rr)*SS, (cy+rr*0.62)*SS],
               start, start+120, fill=(*H.CYAN, int(a*0.9)), width=int(5*SS))
        ax = cx + rr*math.cos(math.radians(start+120))
        ay = cy + rr*0.62*math.sin(math.radians(start+120))
        sd.ellipse([(ax-7)*SS, (ay-7)*SS, (ax+7)*SS, (ay+7)*SS], fill=(*H.CYAN, a))

    # translation arrows
    for k, (dx, dy) in enumerate([(1, 0), (0, 1), (0.72, -0.72)]):
        osc = 62 + 22*math.sin(t*1.5 + k*2.0)
        ex, ey = cx + dx*osc, cy + dy*osc
        sd.line([cx*SS, cy*SS, ex*SS, ey*SS], fill=(*H.AMBER, int(a*0.9)), width=int(5*SS))
        ang = math.atan2(dy, dx)
        for s in (-0.5, 0.5):
            sd.line([ex*SS, ey*SS,
                     (ex - 17*math.cos(ang+s))*SS, (ey - 17*math.sin(ang+s))*SS],
                    fill=(*H.AMBER, int(a*0.9)), width=int(5*SS))

    H._text(sd, (cx, cy + 250), "6 degrees of freedom", H.font("medium", 28), (*H.GRAY, int(a*0.85)))


# ── 8. computer vision / CNN ─────────────────────────────────────────────────
def cnn_layers(bright, sharp, frame_num, cx, cy, alpha):
    """Activations propagating through stacked layers."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    wave = ((frame_num / H.FRAMES) * 4.0) % 1.0
    layers = [(cx-230, 6), (cx-80, 5), (cx+70, 4), (cx+220, 3)]

    for li, (lx, n) in enumerate(layers):
        lit = H.clamp(1 - abs(wave - li/len(layers))*4.5)
        step = 54
        y0 = cy - (n-1)*step/2
        for k in range(n):
            y = y0 + k*step
            r = 17
            on = lit > 0.25 and ((k + li) % 2 == 0 or lit > 0.7)
            col = H.AMBER if on else H.GRAY
            sd.ellipse([(lx-r)*SS, (y-r)*SS, (lx+r)*SS, (y+r)*SS],
                       fill=(*col, int(a*(0.9 if on else 0.3))),
                       outline=(*col, a), width=int(3*SS))
            if on:
                bd.ellipse([(lx-r*1.9)*SS, (y-r*1.9)*SS, (lx+r*1.9)*SS, (y+r*1.9)*SS],
                           fill=(*H.AMBER_HI, int(a*0.42*lit)))
            # edges to next layer
            if li < len(layers)-1:
                nx, nn = layers[li+1]
                ny0 = cy - (nn-1)*step/2
                for j in range(nn):
                    sd.line([(lx+r)*SS, y*SS, (nx-r)*SS, (ny0+j*step)*SS],
                            fill=(*H.GRAY, int(a*0.16)), width=int(2*SS))

    H._text(sd, (cx, cy + 210), "edges → shapes → objects",
            H.font("medium", 27), (*H.CYAN, int(a*0.85)))


# ── 9. path planning (A*) ────────────────────────────────────────────────────
def astar_grid(bright, sharp, frame_num, cx, cy, alpha):
    """Search frontier expands, then the route snaps taut."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    cols, rows, cell = 9, 7, 56
    gx = cx - (cols-1)*cell/2
    gy = cy - (rows-1)*cell/2
    prog = ((frame_num / H.FRAMES) * 3.0) % 1.0
    walls = {(3, 1), (3, 2), (3, 3), (5, 3), (5, 4), (5, 5), (6, 1)}
    start, goal = (0, 3), (8, 3)

    for r in range(rows):
        for c in range(cols):
            x, y = gx + c*cell, gy + r*cell
            if (c, r) in walls:
                sd.rounded_rectangle([(x-22)*SS, (y-22)*SS, (x+22)*SS, (y+22)*SS], radius=7*SS,
                                     fill=(*H.GRAY, int(a*0.55)))
                continue
            d = (abs(c-start[0]) + abs(r-start[1])) / 13.0
            seen = prog*1.35 > d
            col = H.CYAN if seen else H.GRAY
            s = 5 if seen else 3
            sd.ellipse([(x-s)*SS, (y-s)*SS, (x+s)*SS, (y+s)*SS],
                       fill=(*col, int(a*(0.75 if seen else 0.28))))

    if prog > 0.72:
        f = H.clamp((prog-0.72)/0.28)
        route = [(0,3),(1,3),(2,3),(2,4),(2,5),(3,5),(4,5),(4,4),(4,3),(4,2),(5,2),(6,2),(7,2),(7,3),(8,3)]
        cut = max(2, int(len(route)*f))
        pts = [((gx+c*cell)*SS, (gy+r*cell)*SS) for c, r in route[:cut]]
        sd.line(pts, fill=(*H.AMBER, a), width=int(7*SS), joint="curve")
        bd.line(pts, fill=(*H.AMBER_HI, int(a*0.55)), width=int(14*SS), joint="curve")

    for (c, r), lab, col in ((start, "S", H.AMBER), (goal, "G", H.CYAN)):
        x, y = gx + c*cell, gy + r*cell
        sd.ellipse([(x-20)*SS, (y-20)*SS, (x+20)*SS, (y+20)*SS],
                   fill=(*col, a), outline=(*H.WHITE, a), width=int(3*SS))
        H._text(sd, (x, y), lab, H.font("bold", 24), (*H.INK, a))


# ── 10. torque vs speed ──────────────────────────────────────────────────────
def torque_graph(bright, sharp, frame_num, cx, cy, alpha):
    """The inverse trade-off line with a sliding operating point."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    Wd, Hg = 560, 300
    x0, y0 = cx - Wd/2, cy - Hg/2

    sd.line([x0*SS, (y0+Hg)*SS, (x0+Wd)*SS, (y0+Hg)*SS], fill=(*H.GRAY, int(a*0.55)), width=int(3*SS))
    sd.line([x0*SS, y0*SS, x0*SS, (y0+Hg)*SS], fill=(*H.GRAY, int(a*0.55)), width=int(3*SS))
    H._text(sd, (cx, y0 + Hg + 44), "speed", H.font("medium", 26), (*H.GRAY, int(a*0.9)))
    H._text(sd, (x0 - 60, cy), "torque", H.font("medium", 26), (*H.GRAY, int(a*0.9)))

    pts = [((x0 + Wd*u)*SS, (y0 + Hg*u)*SS) for u in [i/60 for i in range(61)]]
    sd.line(pts, fill=(*H.AMBER, a), width=int(5*SS))
    bd.line(pts, fill=(*H.AMBER_HI, int(a*0.5)), width=int(12*SS))

    u = 0.5 + 0.42*math.sin(frame_num/34.0)
    px, py = x0 + Wd*u, y0 + Hg*u
    sd.line([x0*SS, py*SS, px*SS, py*SS], fill=(*H.CYAN, int(a*0.45)), width=int(2*SS))
    sd.line([px*SS, (y0+Hg)*SS, px*SS, py*SS], fill=(*H.CYAN, int(a*0.45)), width=int(2*SS))
    sd.ellipse([(px-13)*SS, (py-13)*SS, (px+13)*SS, (py+13)*SS], fill=(*H.WHITE, a))
    bd.ellipse([(px-26)*SS, (py-26)*SS, (px+26)*SS, (py+26)*SS], fill=(*H.AMBER_HI, int(a*0.6)))
    H._text(sd, (cx, y0 - 42), "gears trade one for the other",
            H.font("medium", 26), (*H.CYAN, int(a*0.85)))


# ── 11. sensor fusion ────────────────────────────────────────────────────────
def sensor_fusion(bright, sharp, frame_num, cx, cy, alpha):
    """Three noisy sensor streams merging into one clean estimate."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    names = ["camera", "LiDAR", "IMU"]
    ys = [cy - 150, cy, cy + 150]
    fx = cx + 150

    for i, (nm, sy) in enumerate(zip(names, ys)):
        sx = cx - 230
        sd.rounded_rectangle([(sx-78)*SS, (sy-30)*SS, (sx+78)*SS, (sy+30)*SS], radius=14*SS,
                             fill=(*H.INK, a), outline=(*H.GRAY, a), width=int(3*SS))
        H._text(sd, (sx, sy), nm, H.font("medium", 24), (*H.WHITE, a))
        # noisy trace flowing toward the fusion node
        pts = []
        for k in range(46):
            u = k/45
            x = sx + 78 + (fx - 60 - sx - 78)*u
            noise = math.sin(frame_num/6.0 + k*0.7 + i*2.0) * 15*(1-u)
            y = sy + (cy - sy)*u + noise
            pts.append((x*SS, y*SS))
        sd.line(pts, fill=(*H.CYAN, int(a*0.65)), width=int(3*SS))
        pip = ((frame_num/40) + i*0.33) % 1.0
        k = int(pip*45)
        sd.ellipse([pts[k][0]-7*SS, pts[k][1]-7*SS, pts[k][0]+7*SS, pts[k][1]+7*SS],
                   fill=(*H.CYAN, a))

    sd.ellipse([(fx-52)*SS, (cy-52)*SS, (fx+52)*SS, (cy+52)*SS],
               fill=(*H.INK, a), outline=(*H.AMBER, a), width=int(5*SS))
    bd.ellipse([(fx-64)*SS, (cy-64)*SS, (fx+64)*SS, (cy+64)*SS], fill=(*H.AMBER, int(a*0.34)))
    H._text(sd, (fx, cy), "fuse", H.font("bold", 26), (*H.AMBER_HI, a))
    sd.line([(fx+52)*SS, cy*SS, (fx+170)*SS, cy*SS], fill=(*H.AMBER, a), width=int(5*SS))
    H._text(sd, (fx + 150, cy - 40), "one estimate", H.font("medium", 24), (*H.AMBER_HI, a))


# ── 12. end effector ─────────────────────────────────────────────────────────
def end_effector(bright, sharp, frame_num, cx, cy, alpha):
    """Gripper opening and closing on a part."""
    H = _ctx()
    from PIL import ImageDraw
    SS = H.SS
    sd = ImageDraw.Draw(sharp)
    bd = ImageDraw.Draw(bright)
    a = alpha
    grip = (math.sin(frame_num/22.0) + 1)/2      # 0 closed .. 1 open
    span = 34 + grip*82

    sd.line([cx*SS, (cy-190)*SS, cx*SS, (cy-70)*SS], fill=(*H.GRAY, a), width=int(11*SS))
    sd.rounded_rectangle([(cx-64)*SS, (cy-78)*SS, (cx+64)*SS, (cy-26)*SS], radius=12*SS,
                         fill=(*H.INK, a), outline=(*H.AMBER, a), width=int(4*SS))

    for s in (-1, 1):
        jx = cx + s*span
        sd.line([(cx + s*40)*SS, (cy-26)*SS, jx*SS, (cy+40)*SS], fill=(*H.AMBER, a), width=int(9*SS))
        sd.line([jx*SS, (cy+40)*SS, jx*SS, (cy+108)*SS], fill=(*H.AMBER, a), width=int(9*SS))
        pad = jx - s*13
        sd.rounded_rectangle([min(jx, pad)*SS, (cy+86)*SS, max(jx, pad)*SS, (cy+120)*SS],
                             radius=5*SS, fill=(*H.AMBER_HI, a))

    held = grip < 0.28
    bw = 46
    sd.rounded_rectangle([(cx-bw)*SS, (cy+72)*SS, (cx+bw)*SS, (cy+140)*SS], radius=10*SS,
                         fill=(*(H.CYAN if held else H.GRAY), int(a*(0.9 if held else 0.45))))
    if held:
        bd.rounded_rectangle([(cx-bw-9)*SS, (cy+63)*SS, (cx+bw+9)*SS, (cy+149)*SS], radius=14*SS,
                             fill=(*H.CYAN, int(a*0.4)))
    H._text(sd, (cx, cy + 210), "the business end", H.font("medium", 27), (*H.GRAY, int(a*0.85)))


# ── registry ─────────────────────────────────────────────────────────────────
REGISTRY = {
    "robot_arm":      robot_arm,
    "lidar_scan":     lidar_scan,
    "pid_graph":      pid_graph,
    "slam_map":       slam_map,
    "ros2_nodes":     ros2_nodes,
    "rl_learning":    rl_learning,
    "dof_diagram":    dof_diagram,
    "cnn_layers":     cnn_layers,
    "astar_grid":     astar_grid,
    "torque_graph":   torque_graph,
    "sensor_fusion":  sensor_fusion,
    "end_effector":   end_effector,
}


# Visuals that read better with the HUD rings behind them (organic/mechanical
# subjects rather than diagrams).
RINGS_BEHIND = {"robot_arm", "end_effector"}


def draw(topic, bright, sharp, frame_num, cx, cy, alpha):
    """Dispatch on topic['visuals']. Unknown/missing keys fall back to abstract
    HUD rings only -- never a concrete object that would misrepresent the topic."""
    H = _ctx()
    key = (topic or {}).get("visuals")
    fn = REGISTRY.get(key)
    if fn is None:
        H._hud_rings(bright, sharp, frame_num, cx, cy, alpha)
        return
    # Rings are a backdrop for the arm, not for diagrams -- overlaying them on a
    # point cloud or a graph just reads as noise, so only the arm keeps them.
    if key in RINGS_BEHIND:
        H._hud_rings(bright, sharp, frame_num, cx, cy, int(alpha*0.55))
    fn(bright, sharp, frame_num, cx, cy, alpha)
