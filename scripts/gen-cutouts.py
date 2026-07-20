#!/usr/bin/env python3
# Erzeugt freigestellte Pflanzen-Sprites (transparenter Hintergrund) für die
# 2D-Beet-Ansicht. Quelle: wiki_img aus plants.js oder Wikipedia-REST-Lead-Bild.
# Hintergrund via rembg (u2net) entfernt, auf Höhe<=320px verkleinert, als WebP
# nach public/cutouts/<id>.webp gespeichert. Manifest: public/cutouts/index.json.
#
# Aufruf: python3 scripts/gen-cutouts.py            (alle fehlenden)
#         python3 scripts/gen-cutouts.py --force    (alle neu)
import json, os, io, sys, time, urllib.parse
import requests
from PIL import Image
from rembg import remove, new_session

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'cutouts')
os.makedirs(OUT, exist_ok=True)
PLANTS = json.load(open(os.environ.get('PLANTS_JSON', '/tmp/plants_export.json')))
FORCE = '--force' in sys.argv
sess = new_session('u2net')
# Wikimedia verlangt einen aussagekräftigen User-Agent mit Kontakt und drosselt
# schnelle Anfragen (HTTP 429). Daher Session + Retry-Backoff + kleine Pause.
HTTP = requests.Session()
HTTP.headers.update({'User-Agent': 'LumaBiome/1.0 (https://luma-biome.de; kontakt@luma.earth) florales-cutouts'})
DELAY = float(os.environ.get('CUTOUT_DELAY', '0.6'))

def get(url, want_json=False):
    for attempt in range(5):
        try:
            r = HTTP.get(url, timeout=30)
            if r.status_code == 429:
                wait = 2 ** attempt
                time.sleep(wait); continue
            if not r.ok:
                return None
            ct = r.headers.get('content-type', '')
            if want_json:
                return r.json()
            if 'image' not in ct or 'svg' in ct:   # nur echte Rasterbilder
                return None
            return r.content
        except Exception:
            time.sleep(1 + attempt)
    return None

def wiki_lead(latin):
    title = urllib.parse.quote((latin or '').replace(' ', '_'))
    for lang in ('de', 'en'):
        d = get(f'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}', want_json=True)
        if d:
            u = (d.get('originalimage') or {}).get('source') or (d.get('thumbnail') or {}).get('source')
            if u and not u.lower().endswith('.svg'):
                return u
    return None

manifest = {}
ok = skip = fail = 0
for i, p in enumerate(PLANTS):
    pid = p['id']
    dst = os.path.join(OUT, pid + '.webp')
    if os.path.exists(dst) and not FORCE:
        manifest[pid] = True; skip += 1; continue
    url = p.get('wiki') or wiki_lead(p.get('latin'))
    time.sleep(DELAY)
    raw = get(url) if url else None
    if not raw and p.get('wiki'):
        # hinterlegtes wiki_img tot (404) → Wikipedia-Lead-Bild versuchen
        alt = wiki_lead(p.get('latin')); time.sleep(DELAY)
        if alt:
            raw = get(alt)
    if not raw:
        manifest[pid] = False; fail += 1; print(f'[{i+1}/{len(PLANTS)}] {pid}: kein Bild'); continue
    try:
        img = Image.open(io.BytesIO(raw)).convert('RGBA')
        cut = remove(img, session=sess)
        # auf max. Höhe 320 verkleinern
        w, h = cut.size
        if h > 320:
            cut = cut.resize((max(1, round(w * 320 / h)), 320), Image.LANCZOS)
        # auf sichtbare Pixel zuschneiden (Alpha-Bounding-Box)
        bbox = cut.getbbox()
        if bbox:
            cut = cut.crop(bbox)
        cut.save(dst, 'WEBP', quality=82, method=4)
        manifest[pid] = True; ok += 1
        if (i + 1) % 20 == 0:
            print(f'[{i+1}/{len(PLANTS)}] ok={ok} skip={skip} fail={fail}')
    except Exception as e:
        manifest[pid] = False; fail += 1; print(f'[{i+1}/{len(PLANTS)}] {pid}: FAIL {e}')

json.dump(manifest, open(os.path.join(OUT, 'index.json'), 'w'))
print(f'FERTIG: ok={ok} skip={skip} fail={fail} → {OUT}')
