// ─────────────────────────────────────────────────────────────────────────────
// Leistungsnachweis als Druckansicht / PDF
//
// Gleiches Muster wie die bestehenden Reports in TimePage.jsx: HTML-String in
// ein neues Fenster schreiben und den Druckdialog öffnen — daraus erzeugt der
// Browser ein PDF. Keine zusätzliche Abhängigkeit, funktioniert auch mobil.
//
// Bewusst helles, neutrales Layout (nicht das dunkle App-Theme): Der Nachweis
// geht an Hausverwaltungen, Kommunen und Wohnungsgesellschaften und muss
// gedruckt wie ein sauberer Beleg aussehen.
// ─────────────────────────────────────────────────────────────────────────────

import { formatStunden, formatDatum, formatProzent, MONATE_KURZ } from './leistungsnachweis.js'

/** HTML-Escaping — Beschreibungen kommen aus Freitextfeldern. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const heute = () => new Date().toLocaleDateString('de-DE',
  { day: '2-digit', month: 'long', year: 'numeric' })

/**
 * Baut das vollständige HTML des Leistungsnachweises.
 * Getrennt von der Fensterlogik, damit die Ausgabe ohne Browser prüfbar ist
 * (siehe scripts/preview-nachweis.mjs).
 *
 * @param {object} nachweis  Ergebnis aus buildLeistungsnachweis()
 * @param {object} [opts]
 * @param {string} [opts.kundeName]   Auftraggeber (Kopfzeile)
 * @param {string} [opts.titel]       Überschrift
 * @param {boolean}[opts.mitFotos]    Fotostrecke mit ausgeben (Default: true)
 * @param {boolean}[opts.mitPlan]     Plan/Ist-Vergleich ausgeben (Default: true)
 * @param {boolean}[opts.autoPrint]   Druckdialog automatisch öffnen (Default: true)
 * @returns {string|null} HTML oder null, wenn kein gültiger Nachweis übergeben wurde
 */
export function baueNachweisHtml(nachweis, opts = {}) {
  const {
    kundeName = '', titel = 'Leistungsnachweis',
    mitFotos = true, mitPlan = true, autoPrint = true,
  } = opts
  if (!nachweis || !nachweis.objekte) return null

  const { objekte, summe, monate, zeitraum } = nachweis

  const zeitraumText = zeitraum.von && zeitraum.bis
    ? `${formatDatum(zeitraum.von)} – ${formatDatum(zeitraum.bis)}`
    : (zeitraum.jahr ? String(zeitraum.jahr) : '')

  // ── Kopf-Kennzahlen ────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Erbrachte Leistung', wert: formatStunden(summe.stunden) },
    { label: 'Einsatztage',        wert: String(summe.einsatztage) },
    { label: 'Betreute Flächen',   wert: String(summe.objekte) },
  ]
  if (mitPlan && summe.sollStunden > 0) {
    kpis.push({ label: 'Jahresplanung', wert: formatStunden(summe.sollStunden) })
  }

  const kpiHtml = kpis.map(k => `
    <div class="kpi">
      <div class="kpi-v">${esc(k.wert)}</div>
      <div class="kpi-l">${esc(k.label)}</div>
    </div>`).join('')

  // ── Monatsverlauf als schlanke Balken ──────────────────────────────────────
  const maxMonat = Math.max(...monate.map(m => m.stunden), 1)
  const monatsHtml = monate.some(m => m.stunden > 0) ? `
    <div class="block">
      <h2>Verlauf über das Jahr</h2>
      <div class="months">
        ${monate.map((m, i) => `
          <div class="month">
            <div class="bar-wrap">
              <div class="bar" style="height:${Math.round((m.stunden / maxMonat) * 100)}%"></div>
            </div>
            <div class="m-l">${esc(MONATE_KURZ[i])}</div>
            <div class="m-v">${m.stunden > 0 ? esc(formatStunden(m.stunden, false)) : ''}</div>
          </div>`).join('')}
      </div>
    </div>` : ''

  // ── Plan/Ist je Fläche ─────────────────────────────────────────────────────
  const planHtml = (mitPlan && objekte.some(o => o.sollStunden > 0)) ? `
    <div class="block">
      <h2>Jahresplanung und Stand</h2>
      <table>
        <thead><tr>
          <th>Fläche</th><th class="r">Geplant</th><th class="r">Erbracht</th><th class="r">Stand</th>
        </tr></thead>
        <tbody>
          ${objekte.map(o => `
            <tr>
              <td>${esc(o.name)}</td>
              <td class="r">${o.sollStunden > 0 ? esc(formatStunden(o.sollStunden)) : '—'}</td>
              <td class="r">${esc(formatStunden(o.stunden))}</td>
              <td class="r">${esc(formatProzent(o.erfuellung))}</td>
            </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td><b>Gesamt</b></td>
          <td class="r"><b>${summe.sollStunden > 0 ? esc(formatStunden(summe.sollStunden)) : '—'}</b></td>
          <td class="r"><b>${esc(formatStunden(summe.stunden))}</b></td>
          <td class="r"><b>${esc(formatProzent(summe.erfuellung))}</b></td>
        </tr></tfoot>
      </table>
    </div>` : ''

  // ── Detail je Fläche ───────────────────────────────────────────────────────
  const objekteHtml = objekte.map(o => `
    <div class="block obj">
      <h2>${esc(o.name)}
        <span class="obj-sum">${esc(formatStunden(o.stunden))}${
          o.sollStunden > 0 ? ` von ${esc(formatStunden(o.sollStunden))} geplant` : ''}</span>
      </h2>
      ${o.ort ? `<div class="meta">${esc(o.ort)}</div>` : ''}
      <table>
        <thead><tr><th style="width:92px">Datum</th><th style="width:70px" class="r">Stunden</th><th>Ausgeführte Arbeiten</th></tr></thead>
        <tbody>
          ${[...o.termine].sort((a, b) => a.datum.localeCompare(b.datum)).map(t => `
            <tr>
              <td>${esc(formatDatum(t.datum))}</td>
              <td class="r">${esc(formatStunden(t.stunden))}</td>
              <td>${esc(t.leistungen) || '<span class="muted">—</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${(mitFotos && o.fotos.length) ? `
        <div class="fotos">
          ${o.fotos.slice(0, 12).map(f => `
            <figure>
              <img src="${esc(f.url)}" alt="" />
              ${f.datum ? `<figcaption>${esc(formatDatum(f.datum))}</figcaption>` : ''}
            </figure>`).join('')}
        </div>` : ''}
    </div>`).join('')

  const leer = objekte.length === 0
    ? `<div class="block"><p class="muted">Für den gewählten Zeitraum sind keine Leistungen erfasst.</p></div>`
    : ''

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8" />
  <title>${esc(titel)}${kundeName ? ' — ' + esc(kundeName) : ''}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
           color: #1a2b22; margin: 34px; font-size: 12px; line-height: 1.5; }
    .brand { font-size: 11px; letter-spacing: 0.24em; color: #08AA56; font-weight: 700; text-transform: uppercase; }
    h1 { font-size: 21px; margin: 8px 0 4px; letter-spacing: -0.01em; }
    h2 { font-size: 13px; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb;
         display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .meta { color: #6b7280; font-size: 11px; }
    .muted { color: #9ca3af; }
    .r { text-align: right; }
    .head-meta { margin-bottom: 22px; }

    .kpis { display: flex; gap: 10px; margin: 0 0 26px; }
    .kpi { flex: 1; border: 1px solid #d8e6dd; border-radius: 8px; padding: 12px 14px; background: #f6fbf8; }
    .kpi-v { font-size: 19px; font-weight: 700; color: #047A3C; line-height: 1.15; }
    .kpi-l { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.07em; color: #6b7280; margin-top: 4px; }

    .block { margin-bottom: 26px; page-break-inside: avoid; }
    .obj-sum { font-size: 11px; font-weight: 500; color: #047A3C; white-space: nowrap; }

    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 5px 8px; border-bottom: 2px solid #e5e7eb; font-size: 9.5px;
         text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
    td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tfoot td { border-top: 2px solid #e5e7eb; border-bottom: none; }

    .months { display: flex; gap: 4px; align-items: flex-end; }
    .month { flex: 1; text-align: center; }
    .bar-wrap { height: 54px; display: flex; align-items: flex-end; }
    .bar { width: 100%; background: #08AA56; border-radius: 3px 3px 0 0; min-height: 1px; }
    .m-l { font-size: 8.5px; color: #6b7280; margin-top: 3px; }
    .m-v { font-size: 8.5px; color: #047A3C; font-weight: 600; }

    .fotos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .fotos figure { margin: 0; width: 118px; }
    .fotos img { width: 118px; height: 88px; object-fit: cover; border-radius: 5px; border: 1px solid #e5e7eb; display: block; }
    .fotos figcaption { font-size: 8.5px; color: #6b7280; margin-top: 3px; text-align: center; }

    .foot { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb;
            color: #6b7280; font-size: 10px; }

    @media print {
      body { margin: 16px; }
      .kpi { background: #f6fbf8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style></head><body>
  <div class="brand">LUMA</div>
  <h1>${esc(titel)}</h1>
  <div class="head-meta">
    ${kundeName ? `<div class="meta"><b>${esc(kundeName)}</b></div>` : ''}
    ${zeitraumText ? `<div class="meta">Leistungszeitraum: ${esc(zeitraumText)}</div>` : ''}
    <div class="meta">Erstellt am ${esc(heute())}</div>
  </div>

  <div class="kpis">${kpiHtml}</div>
  ${planHtml}
  ${monatsHtml}
  ${objekteHtml}
  ${leer}

  <div class="foot">
    Dieser Nachweis wurde automatisch aus der Einsatz- und Zeitdokumentation von LUMA erstellt.<br />
    LUMA — naturnahe Grünflächen · luma-biome.de
  </div>
  ${autoPrint ? '<script>window.onload = () => window.print()</script>' : ''}
  </body></html>`

  return html
}

/**
 * Öffnet die Druckansicht des Leistungsnachweises in einem neuen Fenster.
 * @returns {boolean} false, wenn kein Nachweis vorliegt oder der Popup-Blocker greift
 */
export function druckeLeistungsnachweis(nachweis, opts = {}) {
  const html = baueNachweisHtml(nachweis, opts)
  if (!html) return false

  const w = window.open('', '_blank')
  if (!w) return false          // Popup-Blocker
  w.document.write(html)
  w.document.close()
  return true
}
