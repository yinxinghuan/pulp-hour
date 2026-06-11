#!/usr/bin/env python3
"""
Pulp Hour — auto-drop the next cover.

Read covers.manifest.json, ask the platform LLM to write one new EC-Comics
cover that doesn't overlap with existing themes, render its art via the
platform gen-image transit, append to the manifest, and save the jpg.

Designed to run from GitHub Actions every 2 days (see
.github/workflows/auto-cover.yml). No secrets needed — both LLM and image
endpoints are public CORS-clean platform transits, reached with an Aigram
Origin spoof.

Failure modes (intentional — easier to debug than silent fallbacks):
* Network error → non-zero exit → workflow fails, the existing 7 keep
  serving until next cron tick. Sealed slot disappears only once the queue
  drains past the rolling head.
* LLM returns malformed JSON → script raises with the raw text printed so
  the workflow log shows what the model actually said.
* gen-image returns no url → script raises, workflow fails.
* Duplicate id (LLM picked an existing slug) → script raises; the workflow
  re-run on next cron tick gets a fresh roll.
"""

from __future__ import annotations

import io
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / 'src' / 'PulpHour' / 'data' / 'covers.manifest.json'
COVERS_DIR = ROOT / 'public' / 'covers'

CHAT_URL = 'https://chat.aiwaves.tech/aigram/api/game-chat'
IMAGE_URL = 'https://chat.aiwaves.tech/aigram/api/gen-image'
ORIGIN = 'https://aigram.app'
REFERER = 'https://aigram.app/'

# Locked at the script layer so the LLM can't drift the visual register
# from drop to drop. Every prompt picks up this suffix verbatim.
STYLE_SUFFIX = (
    'vintage 1960s American pulp horror comic book cover illustration, '
    'EC Comics era, heavy black ink outlines, Ben-Day halftone dot fill, '
    'dramatic high-contrast shadows, hand-drawn comic book style, '
    'no text, no letters, no logos, no typography'
)

REQUIRED_LOCALES = ['en', 'zh', 'ja', 'ko', 'es']

SYSTEM_PROMPT = """You are the editor-in-chief of Pulp Hour, a contemporary AI-narrative game styled after vintage 1960s EC Comics pulp horror. Every two days you drop one new cover into the newsstand. The covers share a tight aesthetic + tonal register that you must respect:

REGISTER — non-negotiable
- Setting is contemporary or near-past American (no fantasy, no period costume, no clearly speculative future).
- Protagonist works a small specific job, is the first-person POV.
- A second presence is courteous, knowing, and quietly wrong — not loud, not violent.
- The threat is precision, intimacy, recurrence, mistaken identity, or paperwork — never gore, jump scares, or open monstrosity.
- Tone matches Voyager-9, the all-night Operator, the tenant in 4B, the last-train stranger, the funeral parlor night shift, the 3:11 regular at the gas station, the grandfather's field notebook of a town not on any map.

DEDUP
- Do not reuse any existing id, setting, or central premise (the editor will hand you the back-catalogue).
- Pick a job + space the back-catalogue has not occupied.

OUTPUT — must be a single strict JSON object, no prose around it, no markdown fence:
{
  "id": "kebab-case-slug",                       // 2-3 short words, unique
  "title":    {"en":"…","zh":"…","ja":"…","ko":"…","es":"…"},  // 4-9 word pulp headline per locale
  "subtitle": {"en":"…","zh":"…","ja":"…","ko":"…","es":"…"},  // 3-7 word dek/category per locale
  "hook":     {"en":"…","zh":"…","ja":"…","ko":"…","es":"…"},  // 1-2 sentence opening hook per locale
  "persona":  "…",                                // English. 3-6 sentences. Describes Setting / Voice / Threat. Injected into the per-story LLM system prompt for this cover, so it must give the per-story LLM enough to invent 6 beats of branching narration.
  "ink":      "#RRGGBB",                          // hex matching the cover palette below
  "palette":  "lurid <two-or-three color words> spot colors",  // matches existing covers' palette style — see back-catalogue
  "composition": "…"                              // 1-3 sentences describing the single illustrated scene on the cover. Specific objects, lighting, focal silhouette. Will be combined with the style suffix and sent to gen-image.
}

LOCALES — title/subtitle/hook MUST be filled for ALL five locales (en/zh/ja/ko/es). Translate the meaning, do not transliterate. Hook stays under 220 characters in each locale."""


def run(cmd: list[str], *, input_: str | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        input=input_,
        capture_output=True,
        text=True,
        check=check,
    )


def curl_post_json(url: str, body: dict[str, Any], *, timeout: int = 180) -> dict[str, Any]:
    """POST JSON, return parsed JSON. Spoof Aigram Origin so the transit
    treats us like an in-platform iframe."""
    r = run([
        'curl', '-sS', '--max-time', str(timeout),
        '-X', 'POST', url,
        '-H', 'Content-Type: application/json',
        '-H', f'Origin: {ORIGIN}',
        '-H', f'Referer: {REFERER}',
        '-H', 'User-Agent: Mozilla/5.0 (pulp-hour-coverbot)',
        '--data-raw', json.dumps(body),
    ])
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f'non-JSON response from {url}: {r.stdout[:500]}') from e


def extract_json_object(text: str) -> dict[str, Any]:
    """Pull the first balanced {...} out of the model's response. The LLM
    sometimes wraps in ```json fences or adds a stray sentence; this is a
    brace-balanced extractor that tolerates both."""
    start = text.find('{')
    if start < 0:
        raise RuntimeError(f'no JSON object in LLM output: {text[:500]}')
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return json.loads(text[start:i + 1])
    raise RuntimeError(f'unbalanced braces in LLM output: {text[:500]}')


def build_user_prompt(manifest: list[dict[str, Any]]) -> str:
    """Tell the LLM what's already in the back-catalogue so it picks a
    non-overlapping job/space. We send id + en title + 1-line persona
    summary — enough for dedup, not so much we burn tokens."""
    lines = ['BACK-CATALOGUE (do not duplicate id, setting, or central premise):', '']
    for c in manifest:
        # Persona is multi-sentence; trim to the first sentence as a quick gist.
        persona_gist = re.split(r'(?<=[.!?])\s+', c.get('persona', '').strip())[0]
        lines.append(f'- id "{c["id"]}" — {c["title"]["en"]} — {persona_gist}')
    lines.extend([
        '',
        'Pick a fresh job + space, write the cover JSON now.',
    ])
    return '\n'.join(lines)


def generate_spec(manifest: list[dict[str, Any]], *, retries: int = 2) -> dict[str, Any]:
    user_prompt = build_user_prompt(manifest)
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = curl_post_json(CHAT_URL, {
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_prompt},
                ],
            })
            content = resp.get('choices', [{}])[0].get('message', {}).get('content', '')
            if not content:
                raise RuntimeError(f'empty LLM content: {resp}')
            spec = extract_json_object(content)
            validate_spec(spec, manifest)
            return spec
        except Exception as e:
            print(f'  ! attempt {attempt + 1} failed: {e}', file=sys.stderr)
            last_err = e
            if attempt < retries:
                time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'LLM never produced a valid spec after {retries + 1} tries: {last_err}')


def validate_spec(spec: dict[str, Any], manifest: list[dict[str, Any]]) -> None:
    required = ['id', 'title', 'subtitle', 'hook', 'persona', 'ink', 'palette', 'composition']
    missing = [k for k in required if k not in spec]
    if missing:
        raise RuntimeError(f'spec missing keys {missing}: {spec}')

    if not re.fullmatch(r'[a-z][a-z0-9-]{1,40}', spec['id']):
        raise RuntimeError(f'bad id slug {spec["id"]!r} — must be kebab-case')

    if any(c['id'] == spec['id'] for c in manifest):
        raise RuntimeError(f'duplicate id {spec["id"]!r}')

    for field in ('title', 'subtitle', 'hook'):
        loc = spec[field]
        if not isinstance(loc, dict):
            raise RuntimeError(f'spec.{field} must be object: {loc}')
        for code in REQUIRED_LOCALES:
            if not loc.get(code):
                raise RuntimeError(f'spec.{field}.{code} missing or empty')

    if not re.fullmatch(r'#[0-9A-Fa-f]{6}', spec['ink']):
        raise RuntimeError(f'bad ink hex {spec["ink"]!r}')


def next_release_iso(manifest: list[dict[str, Any]]) -> str:
    latest_ts = max(
        datetime.fromisoformat(c['releasedOn'].replace('Z', '+00:00'))
        for c in manifest
    )
    next_ts = latest_ts + timedelta(days=2)
    return next_ts.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def gen_image(prompt: str, *, retries: int = 2) -> str:
    """Returns the public CDN URL for the rendered jpg/webp."""
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            payload = curl_post_json(IMAGE_URL, {'prompt': prompt})
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
            print(f'  ! gen-image attempt {attempt + 1} failed: {e}', file=sys.stderr)
            last_err = e
            if attempt < retries:
                time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'gen-image never returned a url: {last_err}')


def download_as_jpg(url: str, dest: Path) -> None:
    """The transit returns .webp. Download and re-encode to .jpg so the
    runtime's <img> tags (which the manifest declares as .jpg) match."""
    raw_path = dest.with_suffix('.raw')
    run(['curl', '-sS', '-L', '--max-time', '120', '-o', str(raw_path), url])

    try:
        from PIL import Image  # type: ignore
    except ImportError as e:
        raise RuntimeError('Pillow not installed — `pip install Pillow`') from e

    with Image.open(raw_path) as im:
        # Convert RGBA / palette / etc to RGB before saving as JPEG.
        if im.mode != 'RGB':
            im = im.convert('RGB')
        im.save(dest, 'JPEG', quality=88)

    raw_path.unlink(missing_ok=True)


def main() -> int:
    manifest_text = MANIFEST_PATH.read_text(encoding='utf-8')
    manifest: list[dict[str, Any]] = json.loads(manifest_text)
    if not manifest:
        raise RuntimeError('manifest is empty — refuse to bootstrap from nothing')

    print(f'  · existing covers: {len(manifest)}', file=sys.stderr)

    print('  → asking LLM for next cover spec …', file=sys.stderr)
    spec = generate_spec(manifest)
    print(f'    LLM picked id "{spec["id"]}"', file=sys.stderr)

    release_iso = next_release_iso(manifest)
    print(f'    releasedOn = {release_iso}', file=sys.stderr)

    image_prompt = f'{spec["composition"]}, {spec["palette"]}, {STYLE_SUFFIX}'
    print('  → rendering cover art …', file=sys.stderr)
    image_url = gen_image(image_prompt)
    print(f'    url: {image_url}', file=sys.stderr)

    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    jpg_path = COVERS_DIR / f'{spec["id"]}.jpg'
    download_as_jpg(image_url, jpg_path)
    print(f'    saved → {jpg_path}', file=sys.stderr)

    new_entry = {
        'id': spec['id'],
        'releasedOn': release_iso,
        'title': spec['title'],
        'subtitle': spec['subtitle'],
        'hook': spec['hook'],
        'ink': spec['ink'],
        'imageUrl': f'/pulp-hour/covers/{spec["id"]}.jpg',
        'persona': spec['persona'],
    }
    manifest.append(new_entry)

    # Preserve trailing newline + 2-space indent to keep diffs minimal.
    out = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
    MANIFEST_PATH.write_text(out, encoding='utf-8')
    print(f'  → manifest now lists {len(manifest)} covers', file=sys.stderr)
    print(spec['id'])  # stdout so CI can capture the new id easily
    return 0


if __name__ == '__main__':
    sys.exit(main())
