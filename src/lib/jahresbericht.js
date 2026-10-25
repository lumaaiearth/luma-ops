// ─────────────────────────────────────────────────────────────────────────────
// Jahresbericht je Fläche (Arbeitsplan 5.3)
//
// Ein Dokument, das ein Auftraggeber am Jahresende bekommt: was ist die
// Fläche, was wurde dort getan, was steht darauf, was wurde gepflanzt.
// Der Leistungsnachweis (leistungsnachweis.js) bleibt das Detaildokument zu
// den Stunden — hier steht seine Summe neben Fläche, Bäumen und Pflanzung.
//
// Grundsatz wie überall in BIOME: nur, was im Datenbestand steht. Fehlt
// etwas, steht „nicht erfasst“ da — es wird nichts geschätzt oder ergänzt.
// Rein (keine DB, kein DOM); geprüft mit scripts/test-jahresbericht.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { geomMeasures } from './geo.js'
import { beeteInFlaeche } from './flaechenBezug.js'
import { formatStunden, formatProzent, formatDatum, MONATE_KURZ } from './leistungsnachweis.js'

const JOB_ART = {
  pflege: 'Pflege', baumpflege: 'Baumpflege', installation: 'Installation', beratung: 'Beratung',
  giessen: 'Gießen', maehen: 'Mähen', drohne: 'Drohne', sonstiges: 'Sonstiges',
}
const r1 = v => Math.round(v * 10) / 10
const imJahr = (d, jahr) => typeof d === 'string' && d.slice(0, 4) === String(jahr)

/**
 * @param {object} p
 * @param {{id,name,location?}} p.projekt
 * @param {{name?}} [p.kunde]
 * @param {number} p.jahr
 * @param {Array} [p.objekte]   map_features (alle; gefiltert wird hier)
 * @param {object} [p.nachweis] Ergebnis von buildLeistungsnachweis für Projekt + Jahr
 * @param {Array} [p.gaenge]    Pflegegänge der Pflegepläne dieses Jahres (Gänge tragen nur KW + Plan)
 * @param {Array} [p.einsaetze] jobs (alle; gefiltert wird hier)
 * @param {Array} [p.plaene]    pflanzplaene (alle; gefiltert wird hier)
 */
export function baueJahresbericht({ projekt, kunde = null, jahr, objekte = [], nachweis = null, gaenge = [], einsaetze = [], plaene = [], heute = new Date() }) {
  const eigene = objekte.filter(f => f.project_id === projekt.id)

  // ── Fläche (aus der Karte) ────────────────────────────────────────────────
  const flaechen = eigene.filter(f => f.feature_type === 'area')
  const beete = eigene.filter(f => f.feature_type === 'bed')
  const baeume = eigene.filter(f => f.feature_type === 'tree')
  const linien = eigene.filter(f => f.feature_type === 'line')
  const m2 = f => geomMeasures(f.geometry)?.area_m2 || 0
  const projektflaecheM2 = flaechen.reduce((s, f) => s + m2(f), 0)
  const beeteM2 = beete.reduce((s, f) => s + m2(f), 0)
  const beeteInnen = new Set(flaechen.flatMap(f => beeteInFlaeche(f, eigene)?.beete.map(b => b.id) || []))
  const flaeche = eigene.length ? {
    projektflaecheM2: Math.round(projektflaecheM2),
    beete: beete.length,
    beeteM2: Math.round(beeteM2),
    anteilBepflanzt: projektflaecheM2 > 0 ? r1(beeteM2 / projektflaecheM2 * 100) : null,
    beeteAusserhalb: flaechen.length ? beete.filter(b => !beeteInnen.has(b.id)).length : 0,
    baeume: baeume.length,
    wegeM: Math.round(linien.reduce((s, f) => s + (geomMeasures(f.geometry)?.length_m || 0), 0)),
  } : null

  // ── Pflege (Pflegeplan + Zeiterfassung) ──────────────────────────────────
  const gJahr = gaenge
  const zaehl = st => gJahr.filter(g => g.status === st).length
  const obj = nachweis?.objekte?.find(o => o.projectId === projekt.id) || null
  const pflege = {
    gaengeGesamt: gJahr.filter(g => g.status !== 'entfallen').length,
    gaengeErledigt: zaehl('erledigt'),
    gaengeEntfallen: zaehl('entfallen'),
    gaengeOffen: gJahr.filter(g => g.status !== 'erledigt' && g.status !== 'entfallen').length,
    stundenIst: obj?.stunden ?? 0,
    stundenSoll: obj?.sollStunden ?? 0,
    erfuellung: obj?.erfuellung ?? null,
    einsatztage: obj?.einsatztage ?? 0,
    monate: nachweis?.monate || MONATE_KURZ.map((label, i) => ({ monat: i, label, stunden: 0 })),
  }

  // ── Einsätze ─────────────────────────────────────────────────────────────
  const jJahr = einsaetze.filter(j => j.project_id === projekt.id && imJahr(j.date, jahr))
  const nachArt = new Map()
  for (const j of jJahr) nachArt.set(j.job_type || 'sonstiges', (nachArt.get(j.job_type || 'sonstiges') || 0) + 1)
  const einsatzListe = {
    gesamt: jJahr.length,
    erledigt: jJahr.filter(j => j.status === 'done').length,
    nachArt: [...nachArt.entries()].map(([art, n]) => ({ art: JOB_ART[art] || art, n })).sort((a, b) => b.n - a.n),
  }

  // ── Bäume (Kartenbestand) ────────────────────────────────────────────────
  const kontrolliert = baeume.filter(b => imJahr(b.properties?.letzte_kontrolle, jahr))
  const baumTeil = baeume.length ? {
    anzahl: baeume.length,
    kontrolliert: kontrolliert.length,
    ohneKontrolle: baeume.length - kontrolliert.length,
    arten: [...new Set(baeume.map(b => b.properties?.baumart_deutsch || b.properties?.baumart_latein).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')),
  } : null

  // ── Pflanzung (Pflanzpläne) ──────────────────────────────────────────────
  const pp = plaene.filter(p => p.projekt_id === projekt.id)
  const pflanzung = pp.map(p => {
    const pos = (p.positionen || []).filter(x => (x.count || 0) > 0)
    const pflanzen = pos.reduce((s, x) => s + x.count, 0)
    const heimisch = pos.filter(x => x.heimisch).reduce((s, x) => s + x.count, 0)
    const monate = [...new Set(pos.flatMap(x => x.bluete_monate || []))].sort((a, b) => a - b)
    return {
      titel: p.titel || 'Pflanzplan', status: p.status || null,
      arten: pos.length, pflanzen,
      heimischPct: pflanzen ? Math.round(heimisch / pflanzen * 100) : null,
      bluehMonate: monate.map(m => MONATE_KURZ[m - 1]).filter(Boolean),
      habitate: (p.habitate || []).reduce((s, h) => s + (h.count || 1), 0),
      flaecheM2: p.flaeche_m2 ? Math.round(p.flaeche_m2) : null,
    }
  })

  return {
    kopf: {
      projekt: projekt.name || projekt.id, ort: projekt.location || '', kunde: kunde?.name || '',
      jahr, stand: heute.toISOString().slice(0, 10),
    },
    flaeche, pflege, einsaetze: einsatzListe, baeume: baumTeil, pflanzung,
    fotos: (obj?.fotos || []).slice(0, 6),
    fotosGesamt: obj?.fotos?.length || 0,
  }
}

// ── HTML (Druckansicht → PDF) ───────────────────────────────────────────────

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
const zahl = n => Number(n || 0).toLocaleString('de-DE')
const FEHLT = '<span class="fehlt">nicht erfasst</span>'

/** Vollständiges HTML; `autoPrint` öffnet den Druckdialog. */
export function jahresberichtHtml(b, { autoPrint = true } = {}) {
  const k = b.kopf
  const zeile = (l, v) => `<tr><th>${esc(l)}</th><td>${v}</td></tr>`
  const maxH = Math.max(1, ...b.pflege.monate.map(m => m.stunden))
  const balken = b.pflege.monate.map(m => `
    <div class="balken"><div class="b" style="height:${Math.round(m.stunden / maxH * 70)}px"></div>
    <div class="w">${m.stunden ? esc(formatStunden(m.stunden, false)) : ''}</div><div class="l">${esc(m.label)}</div></div>`).join('')

  const flaeche = b.flaeche ? `<table>
      ${zeile('Projektfläche', b.flaeche.projektflaecheM2 ? `${zahl(b.flaeche.projektflaecheM2)} m²` : FEHLT)}
      ${zeile('Beete', `${zahl(b.flaeche.beete)}${b.flaeche.beeteM2 ? ` · ${zahl(b.flaeche.beeteM2)} m²` : ''}${b.flaeche.anteilBepflanzt != null ? ` · ${String(b.flaeche.anteilBepflanzt).replace('.', ',')} % der Fläche` : ''}`)}
      ${b.flaeche.beeteAusserhalb ? zeile('Hinweis', `${b.flaeche.beeteAusserhalb} Beet(e) liegen außerhalb der gezeichneten Projektfläche`) : ''}
      ${zeile('Bäume', zahl(b.flaeche.baeume))}
      ${b.flaeche.wegeM ? zeile('Wege, Kanten', `${zahl(b.flaeche.wegeM)} m`) : ''}
    </table>` : `<p>${FEHLT} — für diese Fläche ist in der Karte nichts gezeichnet.</p>`

  const p = b.pflege
  const pflege = `<table>
      ${zeile('Pflegegänge', p.gaengeGesamt ? `${zahl(p.gaengeErledigt)} von ${zahl(p.gaengeGesamt)} erledigt${p.gaengeOffen ? `, ${zahl(p.gaengeOffen)} offen` : ''}${p.gaengeEntfallen ? `, ${zahl(p.gaengeEntfallen)} entfallen` : ''}` : FEHLT)}
      ${zeile('Arbeitsstunden', `${esc(formatStunden(p.stundenIst))}${p.stundenSoll ? ` von ${esc(formatStunden(p.stundenSoll))} geplant (${esc(formatProzent(p.erfuellung))})` : ''}`)}
      ${zeile('Einsatztage', zahl(p.einsatztage))}
    </table>
    <div class="monate">${balken}</div>`

  const e = b.einsaetze
  const einsaetze = e.gesamt
    ? `<p>${zahl(e.gesamt)} Einsätze, davon ${zahl(e.erledigt)} abgeschlossen: ${e.nachArt.map(a => `${esc(a.art)} ${zahl(a.n)}`).join(' · ')}</p>`
    : `<p>${FEHLT}</p>`

  const baeume = b.baeume ? `<table>
      ${zeile('Bäume im Bestand', zahl(b.baeume.anzahl))}
      ${zeile(`Kontrolle dokumentiert ${k.jahr}`, `${zahl(b.baeume.kontrolliert)} von ${zahl(b.baeume.anzahl)}`)}
      ${b.baeume.arten.length ? zeile('Arten', esc(b.baeume.arten.join(', '))) : ''}
    </table>
    <p class="klein">Gezählt sind dokumentierte Kontrollen. Das ist keine Aussage darüber, ob eine Kontrolle fällig war — das hängt von Zustand, Entwicklungsphase und Sicherheitserwartung je Baum ab.</p>`
    : `<p>Keine Bäume in der Karte erfasst.</p>`

  const pflanzung = b.pflanzung.length ? b.pflanzung.map(x => `<table>
      ${zeile('Pflanzplan', `${esc(x.titel)}${x.flaecheM2 ? ` · ${zahl(x.flaecheM2)} m²` : ''}`)}
      ${zeile('Pflanzen', `${zahl(x.pflanzen)} in ${zahl(x.arten)} Arten${x.heimischPct != null ? ` · ${x.heimischPct} % heimisch` : ''}`)}
      ${zeile('Blühmonate', x.bluehMonate.length ? esc(x.bluehMonate.join(', ')) : FEHLT)}
      ${x.habitate ? zeile('Habitatelemente', zahl(x.habitate)) : ''}
    </table>`).join('') : `<p>Kein Pflanzplan hinterlegt.</p>`

  const fotos = b.fotos.length ? `<div class="fotos">${b.fotos.map(f => `<figure><img src="${esc(f.url)}" alt=""><figcaption>${esc(formatDatum(f.datum))}</figcaption></figure>`).join('')}</div>
    ${b.fotosGesamt > b.fotos.length ? `<p class="klein">${zahl(b.fotos.length)} von ${zahl(b.fotosGesamt)} Fotos — alle im Leistungsnachweis.</p>` : ''}` : ''

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Jahresbericht ${esc(k.jahr)} – ${esc(k.projekt)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1f1c; font-size: 11pt; line-height: 1.45; margin: 0; }
  header { border-bottom: 2px solid #0b8043; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 20pt; margin: 0; } .sub { color: #5b6660; font-size: 10pt; }
  h2 { font-size: 12.5pt; margin: 18px 0 6px; color: #0b8043; break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 6px; }
  th { text-align: left; font-weight: 500; color: #5b6660; width: 38%; padding: 3px 8px 3px 0; vertical-align: top; }
  td { padding: 3px 0; }
  .fehlt { color: #8a948e; font-style: italic; }
  .klein { font-size: 9pt; color: #5b6660; }
  .monate { display: flex; gap: 4px; align-items: flex-end; height: 104px; margin: 8px 0 2px; }
  .balken { flex: 1; text-align: center; font-size: 8pt; color: #5b6660; display: flex; flex-direction: column; justify-content: flex-end; }
  .b { background: #0b8043; border-radius: 2px 2px 0 0; min-height: 1px; }
  .fotos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  figure { margin: 0; } figure img { width: 100%; height: 120px; object-fit: cover; border-radius: 3px; }
  figcaption { font-size: 8pt; color: #5b6660; }
  footer { margin-top: 22px; border-top: 1px solid #d4dbd6; padding-top: 6px; font-size: 8.5pt; color: #5b6660; }
  section { break-inside: avoid; }
</style></head><body>
<header>
  <h1>Jahresbericht ${esc(k.jahr)}</h1>
  <div class="sub">${esc(k.projekt)}${k.ort ? ` · ${esc(k.ort)}` : ''}${k.kunde ? ` · für ${esc(k.kunde)}` : ''}</div>
</header>
<section><h2>Die Fläche</h2>${flaeche}</section>
<section><h2>Pflege ${esc(k.jahr)}</h2>${pflege}</section>
<section><h2>Einsätze</h2>${einsaetze}</section>
<section><h2>Bäume</h2>${baeume}</section>
<section><h2>Pflanzung</h2>${pflanzung}</section>
${fotos ? `<section><h2>Eindrücke</h2>${fotos}</section>` : ''}
<footer>Stand ${esc(formatDatum(k.stand))} · Grundlage: Zeiterfassung, Pflegeplan, Einsätze und Kartendaten in LUMA Ops.
Angaben, die nicht erfasst sind, sind als solche gekennzeichnet — nichts ist geschätzt. Die Stunden im Einzelnen stehen im Leistungsnachweis ${esc(k.jahr)}.</footer>
${autoPrint ? '<script>window.addEventListener("load", () => setTimeout(() => window.print(), 300))</script>' : ''}
</body></html>`
}

/** Öffnet die Druckansicht (Fotos signiert). false bei Popup-Blocker. */
export function druckeJahresbericht(bericht) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write('<!doctype html><meta charset="utf-8"><p style="font-family:sans-serif;padding:24px">Jahresbericht wird vorbereitet …</p>')
  import('./speicherUrl.js')
    .then(({ signiereAlle }) => signiereAlle(bericht.fotos.map(f => f.url)))
    .then(urls => ({ ...bericht, fotos: bericht.fotos.map((f, i) => ({ ...f, url: urls[i] })) }))
    .catch(() => bericht)
    .then(b => { w.document.open(); w.document.write(jahresberichtHtml(b)); w.document.close() })
  return true
}
