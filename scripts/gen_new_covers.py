#!/usr/bin/env python3
"""
Pulp Hour — generate the 3 new EC-Comics-style covers added in the rolling
schedule (funeral-parlor, highway-curve, field-notebook).

Uses the runtime transit at chat.aiwaves.tech/aigram/api/gen-image with the
Aigram Origin spoof so offline calls go through the same path the in-game
client uses. No procedural ref image — composition is encoded in the
text prompt so the cadence (1 new cover every 2 days) is sustainable
without writing bespoke PIL art per theme.
"""
import os
import sys
import time
import json
import subprocess
import urllib.request

HERE = os.path.dirname(__file__)
OUT  = os.path.normpath(os.path.join(HERE, '..', 'public', 'covers'))
os.makedirs(OUT, exist_ok=True)

TRANSIT_URL = 'https://chat.aiwaves.tech/aigram/api/gen-image'
ORIGIN = 'https://aigram.app'
REFERER = 'https://aigram.app/'

# Shared EC-Comics style suffix — every prompt ends with this to keep the
# rack visually consistent with the four existing covers.
STYLE_SUFFIX = (
    'vintage 1960s American pulp horror comic book cover illustration, '
    'EC Comics era, heavy black ink outlines, Ben-Day halftone dot fill, '
    'dramatic high-contrast shadows, hand-drawn comic book style, '
    'no text, no letters, no logos, no typography'
)

COVERS = [
    {
        'slug': 'funeral-parlor',
        'palette': 'muted bottle green and bone cream and deep ink black',
        'composition': (
            'a vanity mirror in a funeral parlor prep room at night, '
            'open eyeshadow palettes and lipstick tubes lined along the counter, '
            'a half-glimpsed pale figure reflected in the mirror watching the viewer, '
            'a single tasseled lamp casting a long shadow across the counter, '
            'mortician\'s tools laid out on a folded white cloth, '
            'quiet cosmetic dread atmosphere'
        ),
    },
    {
        'slug': 'highway-curve',
        'palette': 'sodium orange canopy light and deep night blue-black and cream',
        'composition': (
            'a 24-hour gas station on a state-highway curve at 3 a.m., '
            'fluorescent canopy hum and yellow pump island lit against country dark, '
            'a lone customer in a brimmed hat standing at the doorway holding a pack of cigarettes, '
            'graveyard-shift cashier figure behind glass under flickering tube light, '
            'an empty highway curving away into the night beyond the pumps, '
            'recurrence horror atmosphere'
        ),
    },
    {
        'slug': 'field-notebook',
        'palette': 'sepia leather and oxblood ink and cream parchment and lamp-amber',
        'composition': (
            'an open leather USGS field notebook on a dark wooden desk, '
            'pages dense with handwritten survey lines and a hand-drawn map of a town, '
            'a single brass oil lamp casting amber light over the pages, '
            'a rolled paper map at the desk edge, a brass compass beside it, '
            'window behind the desk showing a country night with no town visible, '
            'cartographic document horror atmosphere'
        ),
    },
]


def gen_cover(spec, retries=2):
    prompt = f"{spec['composition']}, lurid {spec['palette']} spot colors, {STYLE_SUFFIX}"
    body = json.dumps({'prompt': prompt})
    for attempt in range(retries + 1):
        try:
            r = subprocess.run(
                [
                    'curl', '-sS', '--max-time', '180',
                    '-X', 'POST', TRANSIT_URL,
                    '-H', 'Content-Type: application/json',
                    '-H', f'Origin: {ORIGIN}',
                    '-H', f'Referer: {REFERER}',
                    '-H', 'User-Agent: Mozilla/5.0 (Macintosh; pulp-hour-coverbot)',
                    '--data-raw', body,
                ],
                capture_output=True, text=True, check=True,
            )
            payload = json.loads(r.stdout)
            url = (
                payload.get('url')
                or payload.get('image_url')
                or payload.get('data', {}).get('url')
                or payload.get('data', {}).get('image_url')
            )
            if not url:
                raise RuntimeError(f'no image url in response: {payload}')
            return url
        except Exception as e:
            print(f'  ! attempt {attempt + 1} failed: {e}', file=sys.stderr)
            if attempt == retries:
                raise
            time.sleep(3 * (attempt + 1))


def download(url, dest):
    subprocess.run(['curl', '-sS', '-L', '--max-time', '120', '-o', dest, url], check=True)


def main():
    for spec in COVERS:
        dest = os.path.join(OUT, f'{spec["slug"]}.jpg')
        if os.path.exists(dest) and '--force' not in sys.argv:
            print(f'  · skip {spec["slug"]} (exists)')
            continue
        print(f'  → gen {spec["slug"]} …')
        url = gen_cover(spec)
        print(f'    url: {url}')
        download(url, dest)
        print(f'    saved → {dest}')


if __name__ == '__main__':
    main()
