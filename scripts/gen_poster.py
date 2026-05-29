#!/usr/bin/env python3
"""Pulp Hour poster — 1080×1080 for /Users/yin/code/games/games/posters/.

Composition: 2×2 mini-grid of the 4 cached covers tilted slightly like a
fanned magazine display, with a centered PULP HOUR wordmark + tagline.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(__file__)
COVERS_DIR = os.path.normpath(os.path.join(HERE, '..', 'public', 'covers'))
OUT_PROJECT = os.path.normpath(os.path.join(HERE, '..', 'public', 'poster.png'))
OUT_GAMES   = '/Users/yin/code/games/games/posters/pulp-hour.png'

W = 1080
CREAM  = (244, 239, 224)
PAPER  = (251, 247, 233)
CHARC  = (26, 26, 26)
COBALT = (30, 79, 184)
TOMATO = (229, 75, 60)


def load_font(size, *names):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


F_HEAD = '/System/Library/Fonts/Supplemental/Impact.ttf'
F_ITAL = '/System/Library/Fonts/Supplemental/Georgia Italic.ttf'
F_MONO = '/System/Library/Fonts/Supplemental/Courier New Bold.ttf'


def draw_fan():
    canvas = Image.new('RGBA', (W, W), (*CREAM, 255))
    d = ImageDraw.Draw(canvas)

    # Light radial wash behind the fan
    wash = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse([W * 0.05, W * 0.05, W * 0.95, W * 0.95], fill=(*PAPER, 255))
    canvas = Image.alpha_composite(canvas, wash.filter(ImageFilter.GaussianBlur(80)))

    # Place 4 covers tilted, in fanned order
    covers = [
        ('voyager',     -16, (0.20, 0.60), 0.40),
        ('last-train',   -6, (0.36, 0.52), 0.42),
        ('tenant',        6, (0.52, 0.52), 0.42),
        ('operator',     16, (0.68, 0.60), 0.40),
    ]
    for slug, rot, (cx_frac, cy_frac), scale in covers:
        img = Image.open(os.path.join(COVERS_DIR, f'{slug}.jpg')).convert('RGBA')
        target_w = int(W * scale)
        target_h = int(target_w * 4 / 3)
        img = img.resize((target_w, target_h), Image.LANCZOS)
        # Drop shadow
        shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rectangle([0, 0, target_w, target_h], fill=(0, 0, 0, 90))
        shadow = shadow.filter(ImageFilter.GaussianBlur(14))
        shadow_r = shadow.rotate(rot, resample=Image.BICUBIC, expand=True)
        img_r = img.rotate(rot, resample=Image.BICUBIC, expand=True)
        sx = int(W * cx_frac - shadow_r.size[0] / 2) + 12
        sy = int(W * cy_frac - shadow_r.size[1] / 2) + 18
        ix = int(W * cx_frac - img_r.size[0] / 2)
        iy = int(W * cy_frac - img_r.size[1] / 2)
        canvas.alpha_composite(shadow_r, (sx, sy))
        canvas.alpha_composite(img_r, (ix, iy))

    # Need a fresh draw object since the canvas was alpha-composited above
    d = ImageDraw.Draw(canvas)

    # Wordmark at top — Impact, big, cobalt
    big = load_font(200, F_HEAD)
    title = 'PULP HOUR'
    tw = d.textlength(title, font=big)
    d.text(((W - tw) / 2 + 5, 70 + 5), title, font=big, fill=(0, 0, 0, 80))
    d.text(((W - tw) / 2,     70),     title, font=big, fill=COBALT)

    # Tagline — Georgia italic
    sub = load_font(42, F_ITAL)
    tag = 'Six beats. One sitting. One night.'
    tw2 = d.textlength(tag, font=sub)
    d.text(((W - tw2) / 2, 280), tag, font=sub, fill=CHARC)

    # Bottom strip — Courier kicker + tomato underline
    kick = load_font(30, F_MONO)
    kicker = 'A 6-BEAT NOIR · ALTERU AFTER DARK'
    kw = d.textlength(kicker, font=kick)
    d.text(((W - kw) / 2, W - 100), kicker, font=kick, fill=COBALT)
    d.rectangle([(W - kw) / 2, W - 60, (W + kw) / 2, W - 54], fill=TOMATO)

    return canvas


def main():
    img = draw_fan().convert('RGB')
    os.makedirs(os.path.dirname(OUT_GAMES), exist_ok=True)
    img.save(OUT_PROJECT, 'PNG')
    img.save(OUT_GAMES, 'PNG')
    print(f'  → {OUT_PROJECT}')
    print(f'  → {OUT_GAMES}')


if __name__ == '__main__':
    main()
