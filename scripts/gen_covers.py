#!/usr/bin/env python3
"""
Pulp Hour — generate the 4 cached magazine covers.

Procedural Riso-style art: flat color fields, clean silhouettes, *light*
halftone (texture, not noise), paper grain. 768×1024 (3:4 portrait).

Saved to public/covers/.
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

# ── Output ────────────────────────────────────────────────────────────────

HERE = os.path.dirname(__file__)
OUT  = os.path.normpath(os.path.join(HERE, '..', 'public', 'covers'))
os.makedirs(OUT, exist_ok=True)

W, H = 768, 1024

# ── Palette ───────────────────────────────────────────────────────────────

CREAM  = (244, 239, 224)
PAPER  = (251, 247, 233)
PAPER_DEEP = (236, 227, 202)
CHARC  = (26, 26, 26)
COBALT = (30, 79, 184)
TOMATO = (229, 75, 60)
PURPLE = (122, 63, 184)
FOREST = (59, 122, 106)
WARM   = (240, 180, 90)


# ── Halftone overlay (light, only over the art panel) ─────────────────────

def halftone_panel(rect, color, density=0.10, dot=2, seed=0, size=(W, H)):
    """Light halftone overlay confined to a rect (x0, y0, x1, y1)."""
    rng = random.Random(seed)
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = rect
    cell = 9
    for y in range(y0, y1, cell):
        for x in range(x0, x1, cell):
            if rng.random() > density:
                continue
            r = rng.randint(1, dot)
            ox = rng.randint(-1, 1)
            oy = rng.randint(-1, 1)
            a = rng.randint(80, 170)
            d.ellipse(
                [x + ox - r, y + oy - r, x + ox + r, y + oy + r],
                fill=(*color, a),
            )
    return layer.filter(ImageFilter.GaussianBlur(0.4))


def paper_grain(size, seed=0, count=4000):
    rng = random.Random(seed)
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = size
    for _ in range(count):
        x = rng.randint(0, w - 1)
        y = rng.randint(0, h - 1)
        a = rng.randint(6, 14)
        d.point((x, y), fill=(70, 50, 24, a))
    return layer


def vignette(size, strength=0.38):
    """Soft corner darkening."""
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    w, h = size
    cx, cy = w / 2, h / 2
    max_d = math.hypot(cx, cy)
    px = layer.load()
    for y in range(h):
        for x in range(w):
            dist = math.hypot(x - cx, y - cy) / max_d
            a = int(255 * strength * max(0, (dist - 0.6)) ** 1.4)
            if a:
                px[x, y] = (16, 12, 6, min(220, a))
    return layer


def blend(base, overlay):
    return Image.alpha_composite(base.convert('RGBA'), overlay)


# ── Layout: shared structure ─────────────────────────────────────────────

ART_TOP   = 0
ART_BOT   = int(H * 0.62)   # main art panel
TEXT_TOP  = ART_BOT          # cleaner zone for text overlay
TEXT_BOT  = H


def text_zone_wash(img, ink, density=0.18, seed=0):
    """Light wash over the bottom text zone — a low halftone of the cover ink."""
    overlay = halftone_panel(
        (0, TEXT_TOP, W, TEXT_BOT), ink, density=density, dot=2, seed=seed,
    )
    return blend(img, overlay)


# ── Cover 1: Operator (cobalt) ──────────────────────────────────────────

def cover_operator():
    img = Image.new('RGBA', (W, H), (*PAPER, 255))
    d = ImageDraw.Draw(img)

    # Top art panel — flat cobalt
    d.rectangle([0, ART_TOP, W, ART_BOT], fill=COBALT)

    # Tomato disk behind the receiver — pulled center-right
    sun_cx, sun_cy = int(W * 0.55), int(H * 0.34)
    d.ellipse(
        [sun_cx - 220, sun_cy - 220, sun_cx + 220, sun_cy + 220],
        fill=TOMATO,
    )

    # Phone cord — sinuous from top-left
    cord_pts = []
    for t in range(48):
        x = int(W * 0.18 + math.sin(t * 0.45) * 32)
        y = int(t * 8)
        cord_pts.append((x, y))
    for i in range(1, len(cord_pts)):
        d.line([cord_pts[i - 1], cord_pts[i]], fill=CHARC, width=6)

    # Receiver silhouette — diagonal, cleanly readable on cobalt+tomato
    cx, cy = int(W * 0.55), int(H * 0.40)
    receiver = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(receiver)
    L = 360
    th = 64
    rd.rectangle([cx - L // 2, cy - th // 2, cx + L // 2, cy + th // 2], fill=CHARC)
    rd.ellipse([cx - L // 2 - 70, cy - 78, cx - L // 2 + 28, cy + 78], fill=CHARC)
    rd.ellipse([cx + L // 2 - 28, cy - 78, cx + L // 2 + 70, cy + 78], fill=CHARC)
    receiver = receiver.rotate(-24, resample=Image.BICUBIC, center=(cx, cy))
    img.alpha_composite(receiver)

    # Light cobalt halftone over the art panel only (texture, no noise)
    img = blend(img, halftone_panel((0, ART_TOP, W, ART_BOT), CHARC, density=0.06, dot=2, seed=1))
    img = blend(img, halftone_panel((0, ART_TOP, W, ART_BOT), TOMATO, density=0.05, dot=2, seed=2))
    # Bottom text zone — light cobalt wash for tying typography to the art
    img = text_zone_wash(img, COBALT, density=0.15, seed=3)
    img = blend(img, paper_grain((W, H), seed=4))
    img = blend(img, vignette((W, H), 0.35))
    return img


# ── Cover 2: Tenant in 4B (purple) — chair backlit by lamp ──────────────

def cover_tenant():
    img = Image.new('RGBA', (W, H), (*PAPER, 255))
    d = ImageDraw.Draw(img)

    # Wall — warm paper-deep
    d.rectangle([0, 0, W, H], fill=PAPER_DEEP)

    # Doorway frame — dark purple-black wood
    door_x = int(W * 0.22)
    door_w = int(W * 0.56)
    door_y = int(H * 0.10)
    door_h = int(H * 0.78)
    frame_thickness = 18
    # Outer frame
    d.rectangle(
        [door_x - frame_thickness, door_y - frame_thickness,
         door_x + door_w + frame_thickness, door_y + door_h],
        fill=(40, 28, 50),
    )
    # Inside — warm light from inside (sodium / lamp through chair)
    inside = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    idr = ImageDraw.Draw(inside)
    # Gradient — bright warm top → deeper purple bottom
    for i in range(door_h):
        t = i / door_h
        # warm core at top fading to PURPLE
        c1 = WARM
        c2 = (44, 22, 70)
        f = t ** 0.8
        color = tuple(int(c1[k] * (1 - f) + c2[k] * f) for k in range(3))
        idr.line(
            [door_x, door_y + i, door_x + door_w, door_y + i],
            fill=color,
        )
    img.alpha_composite(inside)

    # Chair silhouette — back-to-viewer, centered in doorway
    chair = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(chair)
    cx = int(W * 0.50)
    cy = int(H * 0.74)
    # Tall slatted backrest
    cd.rectangle([cx - 60, cy - 220, cx + 60, cy - 40], fill=CHARC)
    # Top crest rail
    cd.rectangle([cx - 75, cy - 232, cx + 75, cy - 210], fill=CHARC)
    # Slats — cut through with warm light
    for sx in (cx - 30, cx, cx + 30):
        cd.rectangle([sx - 4, cy - 220, sx + 4, cy - 40], fill=(0, 0, 0, 0))
    # Seat
    cd.rectangle([cx - 90, cy - 50, cx + 90, cy], fill=CHARC)
    # Legs
    cd.rectangle([cx - 84, cy, cx - 70, cy + 110], fill=CHARC)
    cd.rectangle([cx + 70, cy, cx + 84, cy + 110], fill=CHARC)
    img.alpha_composite(chair)

    # Small key on the floor — tomato
    kx, ky = int(W * 0.66), int(H * 0.92)
    d.ellipse([kx - 14, ky - 14, kx + 14, ky + 14], outline=TOMATO, width=6)
    d.rectangle([kx + 6, ky - 4, kx + 50, ky + 4], fill=TOMATO)
    d.rectangle([kx + 40, ky - 4, kx + 46, ky + 14], fill=TOMATO)

    # Light purple halftone breathing through the doorway only
    img = blend(img, halftone_panel(
        (door_x, door_y, door_x + door_w, door_y + door_h),
        PURPLE, density=0.10, dot=2, seed=11,
    ))
    # Bottom text zone wash
    img = text_zone_wash(img, PURPLE, density=0.14, seed=12)
    img = blend(img, paper_grain((W, H), seed=13))
    img = blend(img, vignette((W, H), 0.40))
    return img


# ── Cover 3: Voyager 9 (forest + cobalt) ────────────────────────────────

def cover_voyager():
    # Top art = deep space, bottom text zone = cream paper (mood-flip)
    img = Image.new('RGBA', (W, H), (*PAPER, 255))
    d = ImageDraw.Draw(img)

    # Deep space top
    d.rectangle([0, 0, W, ART_BOT], fill=(8, 12, 28))

    # Starfield
    rng = random.Random(31)
    for _ in range(160):
        x = rng.randint(0, W)
        y = rng.randint(0, ART_BOT - 4)
        r = rng.choice([1, 1, 1, 2])
        c = rng.choice([(245, 240, 210), (230, 220, 180), (200, 220, 245)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=c)

    # Crescent planet at bottom-left of art panel
    px, py, pr = int(W * 0.10), int(ART_BOT - 10), 380
    # Full disk in deep forest
    d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=FOREST)
    # Terminator: cream highlight on upper-left edge
    hl = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.ellipse([px - pr - 50, py - pr - 50, px + pr - 90, py + pr - 90],
               fill=(150, 200, 170, 110))
    img.alpha_composite(hl)

    # Voyager probe — top-right
    probe_x, probe_y = int(W * 0.72), int(H * 0.22)
    # Dish (cream)
    d.ellipse([probe_x - 90, probe_y - 90, probe_x + 90, probe_y + 90], fill=CREAM)
    d.ellipse([probe_x - 56, probe_y - 56, probe_x + 56, probe_y + 56], fill=(8, 12, 28))
    d.ellipse([probe_x - 10, probe_y - 10, probe_x + 10, probe_y + 10], fill=TOMATO)
    # Boom + body
    d.line([probe_x + 60, probe_y + 70, probe_x + 170, probe_y + 200], fill=CREAM, width=5)
    d.rectangle([probe_x + 162, probe_y + 192, probe_x + 218, probe_y + 248], fill=CREAM)
    # Solar panel wing
    d.polygon(
        [(probe_x + 218, probe_y + 192),
         (probe_x + 308, probe_y + 154),
         (probe_x + 322, probe_y + 232),
         (probe_x + 220, probe_y + 246)],
        fill=COBALT,
    )

    # Transmission — short dashed line down toward planet
    for i in range(40):
        t = i / 40
        x = int(probe_x - 40 - t * 160)
        y = int(probe_y + 110 + t * 220)
        r = 2 if i % 2 else 3
        d.ellipse([x - r, y - r, x + r, y + r], fill=TOMATO)

    # Subtle tomato halftone on the space panel
    img = blend(img, halftone_panel((0, 0, W, ART_BOT), TOMATO, density=0.05, dot=2, seed=21))
    # Bottom text zone — cream paper with cobalt wash
    img = text_zone_wash(img, COBALT, density=0.16, seed=22)
    img = blend(img, paper_grain((W, H), seed=23))
    img = blend(img, vignette((W, H), 0.40))
    return img


# ── Cover 4: Last Train Home (tomato) ────────────────────────────────────

def cover_last_train():
    img = Image.new('RGBA', (W, H), (*PAPER, 255))
    d = ImageDraw.Draw(img)

    # Top art panel = subway car interior, looking out window
    d.rectangle([0, 0, W, ART_BOT], fill=(26, 18, 14))

    # Window opening — big rectangle, glowing tomato sodium light inside
    win_pad = 50
    win_top = 70
    win_bot = ART_BOT - 80
    win_l, win_r = win_pad, W - win_pad

    # Tunnel glow inside window — radial-ish tomato
    win = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(win)
    # Fill with deep brown-red
    wd.rectangle([win_l, win_top, win_r, win_bot], fill=(70, 26, 16))
    # Add bright horizontal core
    core_y = (win_top + win_bot) // 2
    for i in range(win_top, win_bot):
        dist_from_core = abs(i - core_y) / ((win_bot - win_top) / 2)
        f = max(0, 1 - dist_from_core ** 1.2)
        c = (
            int(70 + (245 - 70) * f),
            int(26 + (150 - 26) * f),
            int(16 + (60 - 16) * f),
            255,
        )
        wd.line([win_l + 4, i, win_r - 4, i], fill=c)
    img.alpha_composite(win)

    # Window mullion — single horizontal bar across middle
    d.line([win_l, core_y, win_r, core_y], fill=(8, 6, 4), width=6)

    # Window frame (visible chrome border)
    d.rectangle([win_l - 6, win_top - 6, win_r + 6, win_bot + 6], outline=(190, 180, 160), width=4)

    # Two silhouettes seen in the reflection of the window — heads + shoulders
    silh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(silh)
    # Left figure — smaller, further away
    lhx, lhy = int(W * 0.30), int(core_y + 80)
    sd.ellipse([lhx - 38, lhy - 38, lhx + 38, lhy + 38], fill=CHARC)
    sd.polygon(
        [(lhx - 70, lhy + 30), (lhx + 70, lhy + 30),
         (lhx + 90, win_bot), (lhx - 90, win_bot)],
        fill=CHARC,
    )
    # Right figure — closer, tilted toward left
    rhx, rhy = int(W * 0.66), int(core_y + 30)
    sd.ellipse([rhx - 50, rhy - 50, rhx + 50, rhy + 50], fill=CHARC)
    sd.polygon(
        [(rhx - 90, rhy + 40), (rhx + 90, rhy + 40),
         (rhx + 120, win_bot), (rhx - 120, win_bot)],
        fill=CHARC,
    )
    img.alpha_composite(silh)

    # Cabin floor strip below window
    d.rectangle([0, ART_BOT - 24, W, ART_BOT], fill=(40, 28, 22))

    # Tomato halftone over window only — faint
    img = blend(img, halftone_panel(
        (win_l, win_top, win_r, win_bot), CHARC, density=0.10, dot=2, seed=41,
    ))
    # Bottom text zone — tomato wash
    img = text_zone_wash(img, TOMATO, density=0.18, seed=42)
    img = blend(img, paper_grain((W, H), seed=43))
    img = blend(img, vignette((W, H), 0.38))
    return img


# ── Run ─────────────────────────────────────────────────────────────────

COVERS = [
    ('operator',   cover_operator),
    ('tenant',     cover_tenant),
    ('voyager',    cover_voyager),
    ('last-train', cover_last_train),
]


def main():
    for slug, fn in COVERS:
        img = fn().convert('RGB')
        out = os.path.join(OUT, f'{slug}.jpg')
        img.save(out, 'JPEG', quality=86)
        print(f'  → {out}')


if __name__ == '__main__':
    main()
