// LUMA Ops — Orthomosaik-Kacheln nach Supabase Storage hochladen
//
// Lädt einen gdal2tiles-Ausgabeordner (Struktur {z}/{x}/{y}.png) in den
// öffentlichen Bucket `drone-tiles` unter  <projectId>/<slug>/…
//
// Nutzung:
//   SUPABASE_SERVICE_KEY=<service-role-key> \
//   node scripts/upload-tiles.mjs <tiles-ordner> <projectId> <slug>
//
// Den service_role-Key findest du im Supabase-Dashboard:
//   Project Settings → API → service_role (secret). NICHT ins Repo committen!
//
// Danach in der App: Karte → Projekt → „🗺️ Orthomosaik" → gleiches Kürzel +
// Bounds (aus gdalinfo) + den hier ausgegebenen Zoom-Bereich eintragen.

import { readdir, stat, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const SUPABASE_URL = 'https://eqwoyfsfyohtcibithak.supabase.co'
const BUCKET = 'drone-tiles'
const CONCURRENCY = 12

const [dir, projectId, rawSlug] = process.argv.slice(2)
const KEY = process.env.SUPABASE_SERVICE_KEY

// Identisch zur slugify() in der App (MapPage.jsx), damit Upload-Pfad und
// das in der App eingetragene Kürzel garantiert übereinstimmen.
function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}
const slug = slugify(rawSlug)

if (!dir || !projectId || !slug) {
  console.error('Nutzung: node scripts/upload-tiles.mjs <tiles-ordner> <projectId> <slug>')
  process.exit(1)
}
if (slug !== rawSlug) console.log(`Kürzel normalisiert: "${rawSlug}" → "${slug}"`)
if (!KEY) {
  console.error('Fehlt: Umgebungsvariable SUPABASE_SERVICE_KEY (service_role-Key aus dem Supabase-Dashboard)')
  process.exit(1)
}

const CTYPE = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', xml: 'application/xml' }

async function walk(root, base = root, acc = []) {
  for (const name of await readdir(root)) {
    const p = join(root, name)
    const s = await stat(p)
    if (s.isDirectory()) await walk(p, base, acc)
    else acc.push(p)
  }
  return acc
}

async function uploadOne(localPath, base) {
  const rel = relative(base, localPath).split(sep).join('/')
  const ext = rel.split('.').pop().toLowerCase()
  const dest = `${projectId}/${slug}/${rel}`
  const body = await readFile(localPath)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${dest}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': CTYPE[ext] || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body,
  })
  if (!res.ok) throw new Error(`${res.status} ${dest}: ${await res.text()}`)
}

async function pool(items, worker, size) {
  let i = 0, done = 0
  async function run() {
    while (i < items.length) {
      const idx = i++
      await worker(items[idx])
      if (++done % 50 === 0 || done === items.length) process.stdout.write(`\r  ${done}/${items.length} Kacheln…`)
    }
  }
  await Promise.all(Array.from({ length: size }, run))
}

const files = await walk(dir)
if (!files.length) { console.error('Keine Dateien in', dir); process.exit(1) }

// Zoomstufen aus den obersten numerischen Ordnernamen ableiten (Info fürs App-Formular)
const zooms = (await readdir(dir)).map(Number).filter(n => Number.isInteger(n))
const minZoom = zooms.length ? Math.min(...zooms) : '?'
const maxZoom = zooms.length ? Math.max(...zooms) : '?'

console.log(`Lade ${files.length} Dateien → ${BUCKET}/${projectId}/${slug}/ …`)
await pool(files, f => uploadOne(f, dir), CONCURRENCY)

console.log('\n\n✓ Fertig. In der App eintragen:')
console.log(`  Kürzel:    ${slug}`)
console.log(`  Min Zoom:  ${minZoom}`)
console.log(`  Max Zoom:  ${maxZoom}`)
console.log(`  Kachel-URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${projectId}/${slug}/{z}/{x}/{y}.png`)
console.log('  Bounds (Süd/West/Nord/Ost) via:  gdalinfo -json orthophoto.tif  → "wgs84Extent"')
