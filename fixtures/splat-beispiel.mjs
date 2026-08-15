/**
 * Ein erzeugtes Splat-Feld nach KHR_gaussian_splatting — für Prüfstände.
 *
 * Warum eine eigene Datei: dieselben Dateien werden an zwei Stellen gebraucht.
 * Der Node-Prüfstand (`scripts/test-biome-splat.mjs`) prüft damit die
 * Annahmeprüfung, die Browserprüfung (`scripts/pruefe-splat-renderer.mjs`)
 * prüft damit die Shader. Zwei Baukästen würden auseinanderlaufen, und dann
 * prüfte jede Seite ein anderes Format.
 *
 * Die erzeugten Dateien sind gültige GLB-Container: Kopf, JSON-Abschnitt,
 * Binärabschnitt, alles auf vier Byte ausgerichtet.
 */
import { ERWEITERUNG, ATTRIBUT } from '../src/biome/splat.js'

const KOMP = {
  f32: { id: 5126, bytes: 4, setz: (dv, o, v) => dv.setFloat32(o, v, true) },
  i8: { id: 5120, bytes: 1, setz: (dv, o, v) => dv.setInt8(o, v) },
  u8: { id: 5121, bytes: 1, setz: (dv, o, v) => dv.setUint8(o, v) },
  i16: { id: 5122, bytes: 2, setz: (dv, o, v) => dv.setInt16(o, v, true) },
  u16: { id: 5123, bytes: 2, setz: (dv, o, v) => dv.setUint16(o, v, true) },
}

/**
 * Baut ein GLB aus einer Liste benannter Attribute.
 * Jedes Attribut: { name, werte: number[][], typ: 'VEC3'|'VEC4'|'SCALAR', komp, normalisiert }
 */
export function bauGlb(attribute, { modus = 0, ext = { kernel: 'ellipse', colorSpace: 'srgb_rec709_display' }, extensionsRequired = null, ohneExt = false, knoten = null } = {}) {
  const bufferViews = []
  const accessors = []
  const bloecke = []
  let versatz = 0

  for (const a of attribute) {
    const breite = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.typ]
    const komp = KOMP[a.komp || 'f32']
    const bytes = a.werte.length * breite * komp.bytes
    const auffuellen = (4 - (bytes % 4)) % 4
    const puffer = new ArrayBuffer(bytes + auffuellen)
    const dv = new DataView(puffer)
    let o = 0
    for (const eintrag of a.werte) {
      const zeile = breite === 1 ? [eintrag] : eintrag
      for (let k = 0; k < breite; k++) { komp.setz(dv, o, zeile[k]); o += komp.bytes }
    }
    bloecke.push(new Uint8Array(puffer))
    bufferViews.push({ buffer: 0, byteOffset: versatz, byteLength: bytes })
    accessors.push({
      bufferView: bufferViews.length - 1, componentType: komp.id,
      count: a.werte.length, type: a.typ,
      ...(a.normalisiert ? { normalized: true } : {}),
    })
    versatz += bytes + auffuellen
  }

  const binaer = new Uint8Array(versatz)
  let stelle = 0
  for (const b of bloecke) { binaer.set(b, stelle); stelle += b.length }

  const attributeJson = {}
  attribute.forEach((a, i) => { attributeJson[a.name] = i })

  const gltf = {
    asset: { version: '2.0' },
    extensionsUsed: [ERWEITERUNG],
    ...(extensionsRequired ? { extensionsRequired } : {}),
    buffers: [{ byteLength: versatz }],
    bufferViews,
    accessors,
    meshes: [{
      primitives: [{
        attributes: attributeJson,
        ...(modus === null ? {} : { mode: modus }),
        ...(ohneExt ? {} : { extensions: { [ERWEITERUNG]: ext } }),
      }],
    }],
    nodes: [{ mesh: 0, ...(knoten || {}) }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  }

  const jsonRoh = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonAuf = (4 - (jsonRoh.length % 4)) % 4
  const jsonLaenge = jsonRoh.length + jsonAuf
  const binAuf = (4 - (binaer.length % 4)) % 4
  const binLaenge = binaer.length + binAuf

  const gesamt = 12 + 8 + jsonLaenge + 8 + binLaenge
  const aus = new ArrayBuffer(gesamt)
  const dv = new DataView(aus)
  const bytes = new Uint8Array(aus)

  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, gesamt, true)
  dv.setUint32(12, jsonLaenge, true)
  dv.setUint32(16, 0x4e4f534a, true)
  bytes.set(jsonRoh, 20)
  for (let i = 0; i < jsonAuf; i++) bytes[20 + jsonRoh.length + i] = 0x20  // Leerzeichen
  const binKopf = 20 + jsonLaenge
  dv.setUint32(binKopf, binLaenge, true)
  dv.setUint32(binKopf + 4, 0x004e4942, true)
  bytes.set(binaer, binKopf + 8)

  return aus
}

/** Ein vollständiges, gültiges Feld aus n Splats. */
export function gueltigeAttribute(n = 3, zusatz = []) {
  const pos = [], rot = [], skala = [], deck = [], sh0 = []
  for (let i = 0; i < n; i++) {
    pos.push([i * 0.5, 1 + i, -1 - i * 0.25])
    rot.push([0, 0, 0, 1])
    skala.push([0.05, 0.04, 0.03])
    deck.push(0.8)
    sh0.push([1, 0, -1])
  }
  return [
    { name: ATTRIBUT.position, werte: pos, typ: 'VEC3' },
    { name: ATTRIBUT.rotation, werte: rot, typ: 'VEC4' },
    { name: ATTRIBUT.skala, werte: skala, typ: 'VEC3' },
    { name: ATTRIBUT.deckkraft, werte: deck, typ: 'SCALAR' },
    { name: ATTRIBUT.sh0, werte: sh0, typ: 'VEC3' },
    ...zusatz,
  ]
}

