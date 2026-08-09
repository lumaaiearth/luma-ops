// Prüft die BIOME-Darstellungsregeln.
//
// Der Schwerpunkt liegt nicht auf hübscher Formatierung, sondern auf den
// harten Regeln: eine fehlende Zahl darf nie als 0 herauskommen, ein fehlendes
// Datum nie durch ein anderes ersetzt werden, ein abgeleiteter Wert nie ohne
// Kennzeichnung dastehen.
import assert from 'node:assert/strict'
import {
  FEHLT, NICHT_ERHOBEN, KENNZEICHNUNG,
  istFehlend, zahl, mitEinheit, prozent, datum, datumZeit,
  koordinate, messwert, kennzeichnung, anzahl, zeitraum,
} from '../src/biome/format.js'

let geprueft = 0
function pruef(name, fn) {
  fn()
  geprueft++
  console.log(`  ok  ${name}`)
}

console.log('BIOME Darstellungsregeln')

/* ── Fehlende Werte werden nie zu Null ─────────────────────────────────── */

pruef('null wird nicht zu 0', () => {
  assert.equal(zahl(null), FEHLT)
  assert.equal(zahl(undefined), FEHLT)
  assert.equal(mitEinheit(null, 'cm'), FEHLT)
  assert.equal(prozent(null), FEHLT)
  // Und ganz ausdrücklich: nirgends taucht eine 0 auf.
  for (const t of [zahl(null), mitEinheit(null, 'cm'), prozent(null)]) {
    assert.ok(!/\d/.test(t), `fehlender Wert enthält eine Ziffer: ${t}`)
  }
})

pruef('echte 0 bleibt 0', () => {
  assert.equal(zahl(0), '0')
  assert.equal(mitEinheit(0, 'Stück'), '0 Stück')
})

pruef('NaN und leerer String gelten als fehlend', () => {
  assert.equal(zahl(NaN), FEHLT)
  assert.equal(zahl(''), FEHLT)
  assert.equal(zahl(Infinity), FEHLT)
  assert.ok(istFehlend('   '))
  assert.ok(!istFehlend(0))
  assert.ok(!istFehlend(false))
})

/* ── Zahlen, Einheiten, Prozent ────────────────────────────────────────── */

pruef('deutsches Dezimalkomma und Tausenderpunkt', () => {
  assert.equal(zahl(1234.5, { nachkomma: 1 }), '1.234,5')
  assert.equal(zahl(85), '85')
})

pruef('Zahl und Einheit hängen zusammen', () => {
  assert.equal(mitEinheit(85, 'cm'), '85 cm')
  assert.equal(prozent(37), '37 %')
})

/* ── Datum ─────────────────────────────────────────────────────────────── */

pruef('Datum als TT.MM.JJJJ', () => {
  assert.equal(datum('2026-08-09'), '09.08.2026')
  assert.equal(datum(new Date(2026, 0, 3)), '03.01.2026')
})

pruef('fehlendes Datum wird nicht ersetzt', () => {
  assert.equal(datum(null), FEHLT)
  assert.equal(datum(''), FEHLT)
  assert.equal(datum('kein Datum'), FEHLT)
  assert.equal(datumZeit(null), FEHLT)
  // Insbesondere nicht durch heute.
  assert.notEqual(datum(null), datum(new Date()))
})

pruef('Zeitraum lässt ein offenes Ende offen', () => {
  assert.equal(zeitraum('2026-01-01', null), 'seit 01.01.2026')
  assert.equal(zeitraum(null, '2026-12-31'), 'bis 31.12.2026')
  assert.equal(zeitraum(null, null), FEHLT)
})

/* ── Koordinaten ───────────────────────────────────────────────────────── */

pruef('Koordinate nennt immer ihr Bezugssystem', () => {
  const t = koordinate({ lat: 52.51630, lng: 13.37770 })
  assert.ok(t.includes('EPSG:4326'), t)
  assert.ok(t.includes('52,51630'), t)
  assert.ok(t.includes('N'), t)
  assert.ok(t.includes('O'), t)
})

pruef('Koordinate zeigt Lagegenauigkeit, wenn bekannt', () => {
  const t = koordinate({ lat: 52.5, lng: 13.4 }, { genauigkeitM: 4 })
  assert.ok(t.includes('4 m'), t)
  assert.equal(koordinate(null), FEHLT)
})

/* ── Messwerte tragen ihre Messhöhe ────────────────────────────────────── */

pruef('Stammumfang zeigt die Messhöhe am Wert', () => {
  assert.equal(
    messwert({ wert: 85, einheit: 'cm', messhoeheCm: 100 }),
    '85 cm (in 100 cm Höhe)',
  )
  assert.equal(messwert({ wert: null, einheit: 'cm', messhoeheCm: 100 }), FEHLT)
})

/* ── Abgeleitete Werte sind gekennzeichnet ─────────────────────────────── */

pruef('jede Kennzeichnung hat Kurz- und Langtext', () => {
  for (const art of Object.keys(KENNZEICHNUNG)) {
    const k = kennzeichnung(/** @type {any} */ (art))
    assert.ok(k.kurz.length > 0 && k.lang.length > 10, art)
  }
  assert.throws(() => kennzeichnung(/** @type {any} */ ('erfunden')))
})

/* ── Null gezählt ist nicht dasselbe wie nicht gezählt ─────────────────── */

pruef('nicht erhoben unterscheidet sich von null gezählt', () => {
  assert.equal(anzahl(0, { erhoben: true, einzahl: 'Baum', mehrzahl: 'Bäume' }), '0 Bäume')
  assert.equal(anzahl(0, { erhoben: false, einzahl: 'Baum', mehrzahl: 'Bäume' }), NICHT_ERHOBEN)
  assert.equal(anzahl(null, { erhoben: true, einzahl: 'Baum', mehrzahl: 'Bäume' }), FEHLT)
  assert.equal(anzahl(1, { erhoben: true, einzahl: 'Baum', mehrzahl: 'Bäume' }), '1 Baum')
})

console.log(`\n${geprueft} Prüfungen grün.`)
