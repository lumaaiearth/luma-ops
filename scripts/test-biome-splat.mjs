// Prüft das Lesen und die Annahmeprüfung von KHR_gaussian_splatting.
//
// Der Schwerpunkt liegt nicht darauf, dass eine gute Datei durchkommt — das
// ist der leichte Teil. Geprüft wird, dass eine **falsche** Datei als falsch
// erkannt wird und nicht halb dargestellt: ein fehlendes Pflichtattribut, ein
// teilweise besetzter Grad der Kugelflächenfunktionen, ein nicht normalisiertes
// Quaternion, unterschiedlich lange Attribute. Jede dieser Dateien lässt sich
// öffnen und sieht auf den ersten Blick aus wie eine Aufnahme.
//
// Belegstelle für jede Regel: refs/standards/06-fernerkundung.md, FE-GS-23.
import assert from 'node:assert/strict'
import {
  ERWEITERUNG, ATTRIBUT, KERNEL, FARBRAUM, SH0_FAKTOR, SH_VERSATZ,
  leseGlb, findeSplatPrimitive, pruefeSplatPrimitive, dekodiereSplatfeld,
  ladeSplatGlb, diffusfarbe, knotenMatrix,
} from '../src/biome/splat.js'
import { baueKovarianzen, sortiereNachTiefe } from '../src/biome/splatRenderer.js'
import { bauGlb, gueltigeAttribute } from '../fixtures/splat-beispiel.mjs'

let geprueft = 0
function pruef(name, fn) {
  fn()
  geprueft++
  console.log(`  ok  ${name}`)
}

console.log('BIOME Splat-Format (KHR_gaussian_splatting)')

function berichtVon(glb) {
  const { json } = leseGlb(glb)
  return pruefeSplatPrimitive(json, json.meshes[0].primitives[0])
}

function hatFehler(bericht, regel) {
  return bericht.befunde.some(b => b.schwere === 'fehler' && b.regel === regel)
}

/* ── Eine gültige Aufnahme kommt durch ─────────────────────────────────── */

pruef('gültige Aufnahme wird gelesen und ist tragfähig', () => {
  const feld = ladeSplatGlb(bauGlb(gueltigeAttribute(4)))
  assert.equal(feld.anzahl, 4)
  assert.equal(feld.bericht.tragfaehig, true)
  assert.equal(feld.bericht.kernel, KERNEL.ellipse)
  assert.equal(feld.bericht.farbraum, FARBRAUM.srgb_rec709_display.id)
  assert.equal(feld.position.length, 12)
  assert.equal(feld.rotation.length, 16)
  assert.equal(feld.deckkraft.length, 4)
  assert.equal(feld.bericht.befunde.filter(b => b.schwere === 'fehler').length, 0)
})

pruef('Vorgabewerte für Projektion und Sortierung werden eingesetzt', () => {
  // Die Datei nennt beide nicht. Die Spezifikation sagt, was dann gilt —
  // das ist kein fehlender Wert, sondern ein belegter Vorgabewert.
  const b = berichtVon(bauGlb(gueltigeAttribute()))
  assert.equal(b.projektion, 'perspective')
  assert.equal(b.sortierung, 'cameraDistance')
})

pruef('Hülle der Mittelpunkte stimmt', () => {
  const feld = ladeSplatGlb(bauGlb(gueltigeAttribute(3)))
  assert.deepEqual([...feld.huelle.min], [0, 1, -1.5])
  assert.deepEqual([...feld.huelle.max], [1, 3, -1])
})

/* ── Die Farbformel ────────────────────────────────────────────────────── */

pruef('Diffusfarbe folgt der belegten Formel', () => {
  // Color_diffuse = SH_0,0 * 0.2820947917738781 + 0.5
  const [r, g, b] = diffusfarbe(1, 0, -1)
  assert.ok(Math.abs(r - (SH0_FAKTOR + SH_VERSATZ)) < 1e-9)
  assert.equal(g, SH_VERSATZ)
  assert.ok(Math.abs(b - (SH_VERSATZ - SH0_FAKTOR)) < 1e-9)
})

pruef('Diffusfarbe wird auf 0 bis 1 geklemmt', () => {
  const [hoch] = diffusfarbe(99, 0, 0)
  const [tief] = diffusfarbe(-99, 0, 0)
  assert.equal(hoch, 1)
  assert.equal(tief, 0)
})

/* ── Ohne Erweiterung ist es kein Splat-Feld ───────────────────────────── */

pruef('Primitiv ohne Erweiterung wird abgewiesen', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(), { ohneExt: true }))
  assert.equal(b.tragfaehig, false)
  assert.ok(hatFehler(b, 'erweiterung'))
})

pruef('Datei ohne Splat-Primitiv wirft eine benannte Meldung', () => {
  assert.throws(
    () => ladeSplatGlb(bauGlb(gueltigeAttribute(), { ohneExt: true })),
    /kein Primitiv mit der Erweiterung/,
  )
})

/* ── Primitivtyp ───────────────────────────────────────────────────────── */

pruef('Primitivtyp muss POINTS sein', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(), { modus: 4 }))
  assert.equal(b.tragfaehig, false)
  assert.ok(hatFehler(b, 'modus'))
})

pruef('fehlendes mode gilt als TRIANGLES und ist damit falsch', () => {
  // Der glTF-Vorgabewert ist 4. Ein fehlendes mode ist deshalb nicht
  // „unbestimmt", sondern ein Fehler — sonst käme ein Dreiecksnetz als
  // Splat-Feld durch.
  const b = berichtVon(bauGlb(gueltigeAttribute(), { modus: null }))
  assert.equal(b.tragfaehig, false)
  assert.ok(hatFehler(b, 'modus'))
  assert.ok(b.befunde.some(x => /Vorgabewert ist TRIANGLES/.test(x.text)))
})

/* ── Pflichteigenschaften der Erweiterung ──────────────────────────────── */

pruef('fehlender kernel ist ein Fehler', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(), { ext: { colorSpace: 'srgb_rec709_display' } }))
  assert.ok(hatFehler(b, 'kernel'))
})

pruef('fehlender colorSpace ist ein Fehler', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(), { ext: { kernel: 'ellipse' } }))
  assert.ok(hatFehler(b, 'farbraum'))
})

pruef('unbekannter Kernel wird nicht als Ellipse gerendert', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(), { ext: { kernel: 'customShape', colorSpace: 'srgb_rec709_display' } }))
  assert.equal(b.tragfaehig, false)
  assert.ok(hatFehler(b, 'kernel'))
})

pruef('unbekannter Farbraum wird abgewiesen', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(), { ext: { kernel: 'ellipse', colorSpace: 'acescg' } }))
  assert.ok(hatFehler(b, 'farbraum'))
})

pruef('verlangte Fremderweiterung sperrt die Darstellung', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(), { extensionsRequired: ['KHR_gaussian_splatting_compression_xyz'] }))
  assert.equal(b.tragfaehig, false)
  assert.ok(hatFehler(b, 'erweiterung_noetig'))
})

/* ── Pflichtattribute ──────────────────────────────────────────────────── */

for (const [beschriftung, name] of [
  ['Position', ATTRIBUT.position],
  ['Rotation', ATTRIBUT.rotation],
  ['Skala', ATTRIBUT.skala],
  ['Deckkraft', ATTRIBUT.deckkraft],
  ['SH Grad 0', ATTRIBUT.sh0],
]) {
  pruef(`fehlendes Pflichtattribut ${beschriftung} wird erkannt`, () => {
    const b = berichtVon(bauGlb(gueltigeAttribute().filter(a => a.name !== name)))
    assert.equal(b.tragfaehig, false)
    assert.ok(b.befunde.some(x => x.regel === 'attribut' && x.text.includes(name)))
  })
}

/* ── Typen der Attribute ───────────────────────────────────────────────── */

pruef('nicht normalisiertes ganzzahliges Quaternion wird abgewiesen', () => {
  // Ohne diese Prüfung liest BIOME Quaternionen mit Beträgen um 30.000 und
  // stellt Rauschen dar, das aussieht wie eine kaputte Aufnahme.
  const attr = gueltigeAttribute()
  const rot = attr.find(a => a.name === ATTRIBUT.rotation)
  rot.komp = 'i16'
  rot.werte = rot.werte.map(() => [0, 0, 0, 32767])
  const b = berichtVon(bauGlb(attr))
  assert.equal(b.tragfaehig, false)
  assert.ok(b.befunde.some(x => /nicht als normalisiert/.test(x.text)))
})

pruef('normalisiertes ganzzahliges Quaternion wird entquantisiert', () => {
  const attr = gueltigeAttribute(2)
  const rot = attr.find(a => a.name === ATTRIBUT.rotation)
  rot.komp = 'i16'
  rot.normalisiert = true
  rot.werte = rot.werte.map(() => [0, 0, 0, 32767])
  const deck = attr.find(a => a.name === ATTRIBUT.deckkraft)
  deck.komp = 'u16'
  deck.normalisiert = true
  deck.werte = deck.werte.map(() => 65535)

  const feld = ladeSplatGlb(bauGlb(attr))
  assert.ok(Math.abs(feld.rotation[3] - 1) < 1e-4, `w war ${feld.rotation[3]}`)
  assert.ok(Math.abs(feld.deckkraft[0] - 1) < 1e-4)
})

pruef('falscher Akzessortyp wird erkannt', () => {
  const attr = gueltigeAttribute()
  const pos = attr.find(a => a.name === ATTRIBUT.position)
  pos.typ = 'VEC4'
  pos.werte = pos.werte.map(v => [...v, 0])
  const b = berichtVon(bauGlb(attr))
  assert.ok(hatFehler(b, 'akzessor'))
})

pruef('Kugelflächenfunktionen dürfen nicht ganzzahlig sein', () => {
  const attr = gueltigeAttribute()
  const sh = attr.find(a => a.name === ATTRIBUT.sh0)
  sh.komp = 'u8'
  sh.werte = sh.werte.map(() => [128, 128, 128])
  const b = berichtVon(bauGlb(attr))
  assert.ok(hatFehler(b, 'akzessor'))
})

/* ── Gleiche Länge ─────────────────────────────────────────────────────── */

pruef('unterschiedlich lange Attribute werden erkannt', () => {
  const attr = gueltigeAttribute(4)
  const deck = attr.find(a => a.name === ATTRIBUT.deckkraft)
  deck.werte = deck.werte.slice(0, 3)
  const b = berichtVon(bauGlb(attr))
  assert.equal(b.tragfaehig, false)
  assert.ok(hatFehler(b, 'laenge'))
})

/* ── Kugelflächenfunktionen: Vollständigkeit ───────────────────────────── */

function shAttribut(grad, koeffizient, n = 3) {
  return {
    name: `${ERWEITERUNG}:SH_DEGREE_${grad}_COEF_${koeffizient}`,
    werte: Array.from({ length: n }, () => [0.1, 0.1, 0.1]),
    typ: 'VEC3',
  }
}

pruef('vollständiger Grad 1 wird angenommen und gemeldet', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(3, [shAttribut(1, 0), shAttribut(1, 1), shAttribut(1, 2)])))
  assert.equal(b.tragfaehig, true)
  assert.equal(b.shGrad, 1)
  // BIOME stellt Grad 0 dar — und sagt das, statt es zu verschweigen.
  assert.ok(b.befunde.some(x => x.regel === 'kugelflaeche_grad'))
})

pruef('teilweise besetzter Grad 1 ist unzulässig', () => {
  const b = berichtVon(bauGlb(gueltigeAttribute(3, [shAttribut(1, 0), shAttribut(1, 1)])))
  assert.equal(b.tragfaehig, false)
  assert.ok(b.befunde.some(x => x.regel === 'kugelflaeche' && /teilweise besetzt/.test(x.text)))
})

pruef('Grad 2 ohne Grad 1 ist unzulässig', () => {
  const grad2 = [0, 1, 2, 3, 4].map(k => shAttribut(2, k))
  const b = berichtVon(bauGlb(gueltigeAttribute(3, grad2)))
  assert.equal(b.tragfaehig, false)
  assert.ok(b.befunde.some(x => x.regel === 'kugelflaeche' && /niedrigerer Grad/.test(x.text)))
})

pruef('Grad 3 vollständig über Grad 1 und 2 wird angenommen', () => {
  const alle = [
    ...[0, 1, 2].map(k => shAttribut(1, k)),
    ...[0, 1, 2, 3, 4].map(k => shAttribut(2, k)),
    ...[0, 1, 2, 3, 4, 5, 6].map(k => shAttribut(3, k)),
  ]
  const b = berichtVon(bauGlb(gueltigeAttribute(3, alle)))
  assert.equal(b.tragfaehig, true)
  assert.equal(b.shGrad, 3)
})

/* ── Wertebereiche: gemeldet, nicht zurechtgebogen ─────────────────────── */

pruef('negative Skalen und Deckkraft außerhalb werden gemeldet, nicht geklemmt', () => {
  const attr = gueltigeAttribute(2)
  attr.find(a => a.name === ATTRIBUT.skala).werte = [[-0.1, 0.2, 0.3], [0.1, 0.2, 0.3]]
  attr.find(a => a.name === ATTRIBUT.deckkraft).werte = [1.4, 0.5]
  const feld = ladeSplatGlb(bauGlb(attr))
  assert.ok(feld.bericht.befunde.some(b => b.regel === 'skala_negativ'))
  assert.ok(feld.bericht.befunde.some(b => b.regel === 'deckkraft_ausserhalb'))
  // Nicht zurechtgebogen: der Wert steht so in der Datei und bleibt so.
  assert.ok(Math.abs(feld.skala[0] - -0.1) < 1e-6)
  assert.ok(Math.abs(feld.deckkraft[0] - 1.4) < 1e-6)
})

pruef('leere Aufnahme ist kein Ladefehler', () => {
  const feld = ladeSplatGlb(bauGlb(gueltigeAttribute(0)))
  assert.equal(feld.anzahl, 0)
  assert.equal(feld.bericht.tragfaehig, true)
  assert.ok(feld.bericht.befunde.some(b => b.regel === 'leer'))
})

/* ── Container ─────────────────────────────────────────────────────────── */

pruef('Nicht-GLB wird mit klarer Meldung abgewiesen', () => {
  const kaputt = new TextEncoder().encode('Das hier ist kein GLB, sondern Text.').buffer
  assert.throws(() => leseGlb(kaputt), /GLB-Kennung/)
})

pruef('zu kurze Datei wird abgewiesen', () => {
  assert.throws(() => leseGlb(new ArrayBuffer(4)), /zu kurz/)
})

pruef('mehrere Splat-Primitive werden gemeldet', () => {
  const glb = bauGlb(gueltigeAttribute(2))
  const { json, binaer } = leseGlb(glb)
  json.meshes[0].primitives.push(JSON.parse(JSON.stringify(json.meshes[0].primitives[0])))
  const treffer = findeSplatPrimitive(json)
  assert.equal(treffer.length, 2)
  const feld = dekodiereSplatfeld(json, treffer[0].primitiv, binaer)
  assert.equal(feld.anzahl, 2)
})

pruef('byteStride wird berücksichtigt', () => {
  // Verschachtelte Attribute sind in echten Exporten der Normalfall. Wer den
  // Schritt ignoriert, liest die Nachbarwerte und bekommt ein Feld, das
  // plausibel aussieht und falsch ist.
  const glb = bauGlb(gueltigeAttribute(2))
  const { json, binaer } = leseGlb(glb)

  // Position und ein Füllwert verschachtelt: 3 Floats Position, 1 Float Rest.
  const daten = new Float32Array([7, 8, 9, 999, 10, 11, 12, 999])
  const roh = new Uint8Array(daten.buffer)
  const neuBinaer = new Uint8Array(binaer.length + roh.length)
  neuBinaer.set(binaer, 0)
  neuBinaer.set(roh, binaer.length)

  json.bufferViews.push({ buffer: 0, byteOffset: binaer.length, byteLength: roh.length, byteStride: 16 })
  json.accessors.push({ bufferView: json.bufferViews.length - 1, componentType: 5126, count: 2, type: 'VEC3' })
  json.meshes[0].primitives[0].attributes[ATTRIBUT.position] = json.accessors.length - 1

  const feld = dekodiereSplatfeld(json, json.meshes[0].primitives[0], neuBinaer)
  assert.deepEqual([...feld.position], [7, 8, 9, 10, 11, 12])
})

pruef('dünn besetzte Akzessoren werden nicht geraten', () => {
  const glb = bauGlb(gueltigeAttribute(2))
  const { json, binaer } = leseGlb(glb)
  json.accessors[0].sparse = { count: 1, indices: {}, values: {} }
  assert.throws(
    () => dekodiereSplatfeld(json, json.meshes[0].primitives[0], binaer),
    /dünn besetzt/,
  )
})

/* ── Knotenmatrix ──────────────────────────────────────────────────────── */

pruef('ohne Knotentransformation bleibt matrix3 leer', () => {
  const feld = ladeSplatGlb(bauGlb(gueltigeAttribute(2)))
  assert.equal(feld.matrix3, null)
})

pruef('Verschiebung am Knoten wirkt auf die Mittelpunkte', () => {
  const feld = ladeSplatGlb(bauGlb(gueltigeAttribute(2), { knoten: { translation: [10, 0, 0] } }))
  // Erster Splat lag bei (0, 1, -1).
  assert.ok(Math.abs(feld.position[0] - 10) < 1e-5)
  assert.ok(Math.abs(feld.position[1] - 1) < 1e-5)
  assert.deepEqual([...feld.huelle.min], [10, 1, -1.25])
})

pruef('Drehung am Knoten wirkt auf Mittelpunkte und bleibt für die Kovarianz erhalten', () => {
  // 90° um die x-Achse: (0, 1, -1) wird zu (0, 1, 1).
  const s = Math.sin(Math.PI / 4)
  const feld = ladeSplatGlb(bauGlb(gueltigeAttribute(1), { knoten: { rotation: [s, 0, 0, s] } }))
  assert.ok(Math.abs(feld.position[0] - 0) < 1e-5)
  assert.ok(Math.abs(feld.position[1] - 1) < 1e-5)
  assert.ok(Math.abs(feld.position[2] - 1) < 1e-5, `z war ${feld.position[2]}`)
  // Die Drehung muss auch bei der Kovarianz ankommen, sonst liegen die
  // Gaußfunktionen richtig und sind falsch orientiert.
  assert.ok(feld.matrix3 instanceof Float32Array)
})

pruef('gespiegelte Knotenmatrix wird abgewiesen', () => {
  // Negative Skalierung auf einer Achse: die Spezifikation nennt die
  // Darstellung dafür ausdrücklich undefiniert.
  assert.throws(
    () => ladeSplatGlb(bauGlb(gueltigeAttribute(2), { knoten: { scale: [1, -1, 1] } })),
    /Spiegelung/,
  )
})

pruef('Knotenmatrix mit Nullspalte wird abgewiesen', () => {
  assert.throws(
    () => ladeSplatGlb(bauGlb(gueltigeAttribute(2), { knoten: { scale: [1, 0, 1] } })),
    /Länge null|nicht in Drehung/,
  )
})

pruef('verschachtelte Knoten multiplizieren sich auf', () => {
  const glb = bauGlb(gueltigeAttribute(1))
  const { json, binaer } = leseGlb(glb)
  // Wurzel verschiebt um 5, Kind um 3 — zusammen 8.
  json.nodes = [
    { children: [1], translation: [5, 0, 0] },
    { mesh: 0, translation: [3, 0, 0] },
  ]
  json.scenes = [{ nodes: [0] }]
  const feld = dekodiereSplatfeld(json, json.meshes[0].primitives[0], binaer, {
    matrix: knotenMatrix(json, 0),
  })
  assert.ok(Math.abs(feld.position[0] - 8) < 1e-5, `x war ${feld.position[0]}`)
})

/* ── Kovarianz und Sortierung des Renderers ────────────────────────────── */

pruef('Kovarianz einer achsparallelen Gaußfunktion ist die quadrierte Skala', () => {
  // Einheitsquaternion, keine Drehung: Σ = diag(sx², sy², sz²).
  const rot = new Float32Array([0, 0, 0, 1])
  const skala = new Float32Array([2, 3, 4])
  const { kov0, kov1 } = baueKovarianzen(rot, skala, 1, null)
  assert.ok(Math.abs(kov0[0] - 4) < 1e-5)   // Sxx
  assert.ok(Math.abs(kov0[1] - 0) < 1e-5)   // Sxy
  assert.ok(Math.abs(kov0[2] - 0) < 1e-5)   // Sxz
  assert.ok(Math.abs(kov0[3] - 9) < 1e-5)   // Syy
  assert.ok(Math.abs(kov1[0] - 0) < 1e-5)   // Syz
  assert.ok(Math.abs(kov1[1] - 16) < 1e-5)  // Szz
})

pruef('Kovarianz bleibt symmetrisch und positiv unter Drehung', () => {
  const w = Math.sqrt(0.5)
  const rot = new Float32Array([w, 0, 0, w])   // 90° um x
  const skala = new Float32Array([1, 2, 3])
  const { kov0, kov1 } = baueKovarianzen(rot, skala, 1, null)
  // Nach 90° um x tauschen y und z ihre Rollen: Syy = 9, Szz = 4.
  assert.ok(Math.abs(kov0[0] - 1) < 1e-4, `Sxx war ${kov0[0]}`)
  assert.ok(Math.abs(kov0[3] - 9) < 1e-4, `Syy war ${kov0[3]}`)
  assert.ok(Math.abs(kov1[1] - 4) < 1e-4, `Szz war ${kov1[1]}`)
  // Die Spur ist drehinvariant.
  assert.ok(Math.abs(kov0[0] + kov0[3] + kov1[1] - (1 + 4 + 9)) < 1e-4)
})

pruef('Sortierung liefert die entferntesten Gaußfunktionen zuerst', () => {
  // Vier Splats auf der z-Achse, Kamera blickt aus dem Ursprung nach −z.
  const anzahl = 4
  const mittel = new Float32Array(anzahl * 4)
  const tiefen = [-1, -8, -3, -5]
  for (let i = 0; i < anzahl; i++) mittel[i * 4 + 2] = tiefen[i]
  const ansicht = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  const ziel = new Uint32Array(anzahl)
  sortiereNachTiefe(mittel, anzahl, ansicht, ziel, {
    tiefen: new Float32Array(anzahl), zaehler: new Uint32Array(65536),
  })
  // Erwartet: von hinten (z = −8) nach vorn (z = −1).
  assert.deepEqual([...ziel].map(i => tiefen[i]), [-8, -5, -3, -1])
})

pruef('Sortierung kommt mit einer einzigen Tiefe zurecht', () => {
  const anzahl = 3
  const mittel = new Float32Array(anzahl * 4)
  for (let i = 0; i < anzahl; i++) mittel[i * 4 + 2] = -2
  const ansicht = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  const ziel = new Uint32Array(anzahl)
  sortiereNachTiefe(mittel, anzahl, ansicht, ziel, {
    tiefen: new Float32Array(anzahl), zaehler: new Uint32Array(65536),
  })
  assert.deepEqual([...ziel].sort(), [0, 1, 2])
})

console.log(`\n${geprueft} Prüfungen bestanden.`)
