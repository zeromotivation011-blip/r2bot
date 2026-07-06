#!/usr/bin/env python3
"""
R2BOT Daily Reel Generator
Generates 2 Instagram Reels per day from the topic bank using ElevenLabs voiceover.
Run manually or via scheduler.

Usage:
  python3 generate_daily_reels.py              # generate today's 2 reels
  python3 generate_daily_reels.py --topic slam # generate a specific topic
"""

import os, sys, math, json, datetime, subprocess, requests, argparse
from PIL import Image, ImageDraw, ImageFont

# ── Config ───────────────────────────────────────────────────────────────────
SCRIPT_DIR       = os.path.dirname(os.path.abspath(__file__))
TOPIC_BANK_PATH  = os.path.join(SCRIPT_DIR, "topic_bank.json")
OUTPUT_DIR       = SCRIPT_DIR
FRAMES_TEMP_DIR  = "/tmp/r2bot_frames"
ELEVENLABS_KEY   = os.getenv("ELEVENLABS_API_KEY", "sk_7b8f5ea80a2eb8cd518d9824229e4c052f1390828c0673f0")
VOICE_ID         = "pNInz6obpgDQGcFmaJgB"   # Adam — clear & authoritative
FPS, W, H        = 30, 1080, 1920
DURATION         = 20
FRAMES           = FPS * DURATION

# ── Brand Colors ─────────────────────────────────────────────────────────────
BG    = (6,   6,  14)
AMBER = (245,158, 11)
AMBER2= (255,180, 30)
WHITE = (255,255,255)
GRAY  = (140,140,160)
CYAN  = ( 80,200,240)
DIM   = ( 40, 40, 60)

# ── Fonts ─────────────────────────────────────────────────────────────────────
F_PATH = "/usr/share/fonts/truetype/google-fonts/"
def font(style, size):
    names = {"bold":"Poppins-Bold.ttf","medium":"Poppins-Medium.ttf","regular":"Poppins-Regular.ttf"}
    return ImageFont.truetype(F_PATH + names[style], size)

# ── Utilities ─────────────────────────────────────────────────────────────────
def ease_out(t):   return 1-(1-t)**3
def ease_in(t):    return t**3
def clamp(v,lo=0.,hi=1.): return max(lo,min(hi,v))
def prg(f,s,e):
    if f<=s: return 0.
    if f>=e: return 1.
    return (f-s)/(e-s)

def draw_grid(draw, alpha=10):
    for x in range(0,W,120):
        draw.line([(x,0),(x,H)], fill=(255,255,255,alpha), width=1)
    for y in range(0,H,120):
        draw.line([(0,y),(W,y)], fill=(255,255,255,alpha), width=1)

def draw_r2bot_logo(draw, x, y, size=40):
    f1 = font("bold", size)
    f2 = font("bold", int(size*0.8))
    draw.text((x,y), "R2", font=f1, fill=(*AMBER,255))
    bbox = draw.textbbox((0,0),"R2",font=f1)
    draw.text((x+bbox[2]+3,y+4), "BOT", font=f2, fill=(*WHITE,255))

def draw_robot_arm(img, frame_num, cx=540, cy=850, alpha=255):
    layer = Image.new("RGBA",(W,H),(0,0,0,0))
    ld = ImageDraw.Draw(layer)
    t = frame_num/FRAMES
    sh = math.radians(-60+40*math.sin(t*math.pi*2))
    el = math.radians(-120+60*math.sin(t*math.pi*2+1.2))
    L1,L2 = 250,190
    x1 = cx+L1*math.cos(sh);  y1 = cy+L1*math.sin(sh)
    x2 = x1+L2*math.cos(sh+el); y2 = y1+L2*math.sin(sh+el)
    a = alpha
    ld.line([(cx,cy),(x1,y1)], fill=(*AMBER,a), width=14)
    ld.line([(x1,y1),(x2,y2)], fill=(*AMBER,a), width=10)
    for jx,jy,r in [(cx,cy,28),(x1,y1,20),(x2,y2,14)]:
        ld.ellipse([jx-r,jy-r,jx+r,jy+r], fill=(255,200,50,a))
        ld.ellipse([jx-r+4,jy-r+4,jx+r-4,jy+r-4], fill=(30,20,0,a))
    pulse = 0.5+0.5*math.sin(frame_num*0.15)
    rr = int(20+12*pulse)
    ld.ellipse([x2-rr,y2-rr,x2+rr,y2+rr], outline=(*CYAN,int(200*pulse)), width=3)
    ld.ellipse([x2-8,y2-8,x2+8,y2+8], fill=(*CYAN,230))
    lf = font("medium",30)
    ld.text((cx+15,cy-15),"θ₁",font=lf,fill=(255,200,80,a))
    ld.text((int(x1)+10,int(y1)-10),"θ₂",font=lf,fill=(255,200,80,a))
    img.alpha_composite(layer)

# ── Generic reel renderer (3-part structure: hook → concept → CTA) ───────────
def render_frame(frame_num, topic):
    img = Image.new("RGBA",(W,H),(*BG,255))
    draw = ImageDraw.Draw(img)
    draw_grid(draw)

    # Logo always visible
    if frame_num > 10:
        logo_a = clamp(prg(frame_num,10,40))
        layer = Image.new("RGBA",(W,H),(0,0,0,0))
        ld2 = ImageDraw.Draw(layer)
        draw_r2bot_logo(ld2,60,80,40)
        arr = __import__('numpy').array(layer.split()[3])
        layer.putalpha(Image.fromarray((arr*logo_a).astype('uint8')))
        img.alpha_composite(layer)
        draw = ImageDraw.Draw(img)

    # Section 1: HOOK  (0-3s, frames 0-90)
    if frame_num < 90:
        p = ease_out(prg(frame_num,0,45))
        hook = topic["hook"]
        words = hook.split()
        mid = len(words)//2
        line1 = " ".join(words[:mid])
        line2 = " ".join(words[mid:])
        fh = font("bold",80)
        slide = int(30*(1-p))
        draw.text((W//2,500+slide), line1, font=fh,
                  fill=(*WHITE,int(255*p)), anchor="mm")
        draw.text((W//2,600+slide), line2, font=fh,
                  fill=(*WHITE,int(255*p)), anchor="mm")
        p2 = ease_out(prg(frame_num,30,85))
        bar_w = int(700*p2*p)
        draw.rectangle([(W//2-bar_w//2,660),(W//2+bar_w//2,666)],
                        fill=(*AMBER,int(220*p2)))

    # Section 2: CONCEPT (3-15s, frames 90-450)
    elif frame_num < 450:
        local = frame_num-90
        p_in = ease_out(prg(local,0,40))
        p_out = ease_in(prg(local,320,360))
        alpha = clamp(p_in-p_out)

        # Title
        ft = font("bold",64)
        draw.text((W//2,220), topic["title"], font=ft,
                  fill=(*AMBER,int(255*alpha)), anchor="mm")
        bar_p = ease_out(prg(local,5,50))
        bw = int(500*bar_p*alpha)
        draw.rectangle([(W//2-bw//2,260),(W//2+bw//2,266)],
                        fill=(*AMBER,int(200*alpha)))

        # Robot arm animation (always shown as visual anchor)
        arm_a = int(255*alpha)
        if arm_a > 0:
            draw_robot_arm(img, frame_num, cx=540, cy=820, alpha=arm_a)
            draw = ImageDraw.Draw(img)

        # Curiosity angle text
        p_sub = ease_out(prg(local,40,100))
        angle = topic["curiosity_angle"]
        fs = font("regular",38)
        # Word wrap to 2 lines
        words = angle.split()
        mid = len(words)//2
        draw.text((W//2,1200), " ".join(words[:mid]), font=fs,
                  fill=(*CYAN,int(220*p_sub*alpha)), anchor="mm")
        draw.text((W//2,1255), " ".join(words[mid:]), font=fs,
                  fill=(*CYAN,int(220*p_sub*alpha)), anchor="mm")

    # Section 3: CTA (15-20s, frames 450-600)
    else:
        local = frame_num-450
        p = ease_out(prg(local,0,40))
        out = ease_in(prg(local,100,150))
        alpha = clamp(p-out)

        # Amber block
        cta_layer = Image.new("RGBA",(W,H),(0,0,0,0))
        cd = ImageDraw.Draw(cta_layer)
        bh = int(340*p)
        cd.rectangle([0,(H-bh)//2,W,(H+bh)//2], fill=(*AMBER,int(235*p)))
        img.alpha_composite(cta_layer)
        draw = ImageDraw.Draw(img)

        p2 = ease_out(prg(local,10,45))
        draw.text((W//2,H//2-80), "Follow", font=font("bold",80),
                  fill=(*BG,int(255*p2)), anchor="mm")
        draw.text((W//2,H//2+20), "R2BOT", font=font("bold",110),
                  fill=(*BG,int(255*p2)), anchor="mm")
        if local>25:
            p3 = ease_out(prg(local,25,60))
            draw.text((W//2,H//2+130), "Zero → Robotics Engineer",
                      font=font("regular",38), fill=(40,30,0,int(220*p3)), anchor="mm")

        # Hashtags
        if local>50:
            ph = ease_out(prg(local,50,90))
            tags = " ".join(topic["tags"][:3])
            draw.text((W//2,H//2+210), tags,
                      font=font("regular",30), fill=(60,45,5,int(180*ph)), anchor="mm")

    return img.convert("RGB")

# ── Generate Audio ────────────────────────────────────────────────────────────
def generate_audio(script, output_path):
    print("  🎙  Generating voiceover...")
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers={"xi-api-key": ELEVENLABS_KEY, "Content-Type":"application/json"},
        json={
            "text": script,
            "model_id": "eleven_turbo_v2_5",
            "voice_settings": {
                "stability": 0.55, "similarity_boost": 0.85,
                "style": 0.3, "use_speaker_boost": True
            }
        }
    )
    if r.status_code == 200:
        open(output_path,"wb").write(r.content)
        print(f"  ✓ Audio: {len(r.content)//1024}KB → {output_path}")
        return True
    print(f"  ✗ ElevenLabs {r.status_code}: {r.text[:200]}")
    return False

# ── Render + Encode ───────────────────────────────────────────────────────────
def render_and_encode(topic, silent_path):
    import numpy
    os.makedirs(FRAMES_TEMP_DIR, exist_ok=True)
    print(f"  🎬  Rendering {FRAMES} frames...")
    for i in range(FRAMES):
        if i % 60 == 0: print(f"     {i}/{FRAMES} ({i//FPS}s)")
        render_frame(i, topic).save(f"{FRAMES_TEMP_DIR}/f{i:04d}.png")
    print("  ✓ Frames done")
    subprocess.run([
        "ffmpeg","-y","-framerate",str(FPS),
        "-i",f"{FRAMES_TEMP_DIR}/f%04d.png",
        "-c:v","libx264","-pix_fmt","yuv420p","-crf","18","-preset","fast",
        silent_path
    ], check=True, capture_output=True)
    print(f"  ✓ Silent video: {silent_path}")

def combine_av(silent, audio, final):
    subprocess.run([
        "ffmpeg","-y","-i",silent,"-i",audio,
        "-c:v","copy","-c:a","aac","-shortest",final
    ], check=True, capture_output=True)
    size = os.path.getsize(final)//1024
    print(f"  ✓ Final reel: {final} ({size}KB)")

# ── Main ──────────────────────────────────────────────────────────────────────
def generate_reel(topic, reel_index=1):
    date_str = datetime.date.today().strftime("%Y%m%d")
    slug = topic["id"]
    prefix = f"reel_{date_str}_{reel_index:02d}_{slug}"

    audio_path  = os.path.join(OUTPUT_DIR, f"{prefix}_audio.mp3")
    silent_path = os.path.join(OUTPUT_DIR, f"{prefix}_silent.mp4")
    final_path  = os.path.join(OUTPUT_DIR, f"{prefix}.mp4")

    print(f"\n{'='*60}")
    print(f"  Reel #{reel_index} — {topic['title']}")
    print(f"  Hook: {topic['hook'][:60]}...")
    print(f"{'='*60}")

    ok = generate_audio(topic["script"], audio_path)
    render_and_encode(topic, silent_path)
    if ok:
        combine_av(silent_path, audio_path, final_path)
    else:
        import shutil; shutil.copy(silent_path, final_path)

    # Write caption file
    caption_path = os.path.join(OUTPUT_DIR, f"{prefix}_caption.txt")
    caption = f"""{topic['hook']}

{topic['curiosity_angle']}

✅ Follow @r2bot.in to learn robotics from zero to job-ready.
🔗 Free courses + AI mentor at r2bot.in

{chr(10).join(topic['tags'])}
#robotics #engineering #STEM #learnrobotics #r2bot
"""
    open(caption_path,"w").write(caption)
    print(f"  ✓ Caption: {caption_path}")
    return final_path, caption_path

# ── High-quality renderer override ───────────────────────────────────────────
# hq_render supersamples + adds glow/bloom/particles/spring motion. If it fails
# to import for any reason, we transparently fall back to the basic renderer.
try:
    import hq_render as _HQ
    render_frame = _HQ.render_frame            # used by render_and_encode + _chunk_driver
    print("  ✨ Using high-quality renderer (hq_render)")
except Exception as _e:                        # pragma: no cover
    print(f"  ⚠️  hq_render unavailable ({_e}); using basic renderer")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", help="Topic ID from topic_bank.json (optional)")
    parser.add_argument("--count", type=int, default=2, help="Number of reels to generate (default: 2)")
    args = parser.parse_args()

    with open(TOPIC_BANK_PATH) as f:
        bank = json.load(f)
    topics = bank["topics"]

    # Track which topics have been used
    log_path = os.path.join(OUTPUT_DIR, "reel_log.json")
    log = json.load(open(log_path)) if os.path.exists(log_path) else {"used": []}

    if args.topic:
        selected = [t for t in topics if t["id"] == args.topic]
        if not selected:
            print(f"Topic '{args.topic}' not found. Available: {[t['id'] for t in topics]}")
            sys.exit(1)
        to_generate = selected[:args.count]
    else:
        # Pick topics not yet used (cycle through)
        unused = [t for t in topics if t["id"] not in log["used"]]
        if len(unused) < args.count:
            print("  ♻️  All topics used — resetting cycle")
            log["used"] = []
            unused = topics
        to_generate = unused[:args.count]

    results = []
    for i, topic in enumerate(to_generate, 1):
        video, caption = generate_reel(topic, reel_index=i)
        results.append({"topic": topic["id"], "video": video, "caption": caption})
        log["used"].append(topic["id"])

    # Save log
    json.dump(log, open(log_path,"w"), indent=2)

    print(f"\n✅  {len(results)} reel(s) generated:")
    for r in results:
        print(f"  📱 {r['video']}")
        print(f"  📝 {r['caption']}")

if __name__ == "__main__":
    main()
