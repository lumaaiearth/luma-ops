// ─────────────────────────────────────────────────────────────────────────────
// Pflege-Angebot: Text zum Kopieren und Druckansicht / PDF
//
// Beide Fassungen kommen aus derselben Quelle, damit kopierter Text und PDF
// nie voneinander abweichen. Reine Funktionen ohne Browserzugriff (bis auf
// druckeAngebot), geprüft mit scripts/test-angebot.mjs.
//
// Nach außen steht die Pauschale je Objekt, nicht die Stunden — Stunden sind
// interne Kalkulation (docs/PFLEGEPLANUNG_KONZEPT.md, Kap. 3 Punkt 6).
// ─────────────────────────────────────────────────────────────────────────────

export const ABRECHNUNG_TEXT = {
  monatlich: 'monatlich in gleichen Teilbeträgen',
  quartal: 'quartalsweise in gleichen Teilbeträgen',
  drittel: 'in drei gleichen Teilbeträgen (30.06. / 30.09. / 31.12.)',
  einmalig: 'nach Leistungserbringung',
}

export const ANBIETER = {
  name: 'LUMA — Lukas Steingässer & Malte Larsen GbR',
  anschrift: 'Schillerstr. 15, 16225 Eberswalde',
  web: 'luma-biome.de',
}

export function eur(n) {
  return `${(Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function datum(iso) {
  // TT.MM.JJJJ — ohne Optionen schreibt de-DE „1.1.2027".
  return iso
    ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
}

function abrechnungText(offer) {
  return ABRECHNUNG_TEXT[offer.abrechnung] || offer.abrechnung || ''
}

const SCHLUSS = [
  'Grundlage ist der mit Ihnen abgestimmte Pflegeplan. Zusätzliche Leistungen außerhalb des beschriebenen Umfangs führen wir nur nach vorheriger Beauftragung aus; sie werden per Kurzangebot bzw. nach Aufwand gesondert berechnet. Materialien (Pflanzen, Mulch, Erde u. Ä.) werden zu marktüblichen Preisen gegen Beleg gesondert in Rechnung gestellt. An- und Abfahrt sind in der Pauschale enthalten.',
  'Umfang und Pauschale werden jährlich auf Basis der dokumentierten Einsätze gemeinsam überprüft und bei Bedarf angepasst.',
]

/** Angebot als Fließtext (zum Einfügen ins Rechnungstool oder in eine Mail). */
export function offerText(offer) {
  const lines = []
  lines.push('Sehr geehrte Damen und Herren,')
  lines.push('')
  lines.push(`vielen Dank für Ihr Vertrauen. Gerne unterbreiten wir Ihnen unser Angebot für die Pflege der folgenden Standorte im Leistungszeitraum ${datum(offer.zeitraum_von)} – ${datum(offer.zeitraum_bis)}:`)
  lines.push('')
  for (const pos of offer.positionen || []) {
    lines.push(`• ${pos.beschreibung} — Jahrespauschale ${eur(pos.betrag)} netto`)
    if (pos.lv) lines.push(pos.lv)
    lines.push('')
  }
  lines.push(`Gesamtsumme: ${eur(offer.summe_netto)} netto zzgl. gesetzlicher USt. Die Abrechnung erfolgt ${abrechnungText(offer)}.`)
  lines.push('')
  for (const s of SCHLUSS) { lines.push(s); lines.push('') }
  lines.push('Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.')
  lines.push('Wir bedanken uns herzlich für Ihr Vertrauen.')
  return lines.join('\n')
}

/** HTML-Escaping — Titel und Leistungstexte kommen aus Freitextfeldern. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** LV-Text („  – Rasenmahd: monatlich …") in Listenpunkte zerlegen. */
function lvPunkte(lv) {
  return String(lv || '').split('\n').map((z) => z.replace(/^\s*[–-]\s*/, '').trim()).filter(Boolean)
}

/**
 * Druckfertiges HTML des Angebots. Enthält keine internen Stunden und keinen
 * Stundensatz.
 * @param {object} offer  Zeile aus `angebote`
 * @param {object} [opts]
 * @param {string} [opts.kundeName]
 * @param {boolean}[opts.autoPrint]  Druckdialog beim Laden öffnen (Default: true)
 */
export function baueAngebotHtml(offer, opts = {}) {
  const { kundeName = '', autoPrint = true } = opts
  if (!offer) return null
  const pos = offer.positionen || []
  const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  const posHtml = pos.map((p, i) => {
    const punkte = lvPunkte(p.lv)
    return `
    <tr class="pos">
      <td class="nr">${i + 1}</td>
      <td>
        <div class="pos-t">${esc(p.beschreibung)}</div>
        ${punkte.length ? `<ul>${punkte.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </td>
      <td class="r">${esc(eur(p.betrag))}</td>
    </tr>`
  }).join('')

  return `<!doctype html><html lang="de"><head><meta charset="utf-8" />
  <title>${esc(offer.angebotsnummer || 'Angebot')}${kundeName ? ' — ' + esc(kundeName) : ''}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
           color: #1a2b22; margin: 40px; font-size: 12px; line-height: 1.55; }
    .brand { font-size: 11px; letter-spacing: 0.24em; color: #08AA56; font-weight: 700; text-transform: uppercase; }
    .kopf { display: flex; justify-content: space-between; gap: 24px; margin: 18px 0 28px; }
    .kopf .meta { color: #6b7280; font-size: 11px; }
    h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.01em; }
    p { margin: 0 0 10px; max-width: 70ch; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0; }
    th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; font-size: 9.5px;
         text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
    td { padding: 9px 8px; border-bottom: 1px solid #f0f2f1; vertical-align: top; }
    td.nr { width: 28px; color: #6b7280; }
    .r { text-align: right; white-space: nowrap; }
    .pos-t { font-weight: 600; }
    ul { margin: 4px 0 0; padding-left: 16px; color: #374151; }
    li { margin: 1px 0; }
    tfoot td { border-top: 2px solid #e5e7eb; border-bottom: none; font-weight: 700; }
    .pos { page-break-inside: avoid; }
    .foot { margin-top: 34px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 10px; }
    @media print { body { margin: 18px; } }
  </style></head><body>
  <div class="brand">LUMA</div>
  <div class="kopf">
    <div>
      <h1>Angebot Gartenpflege</h1>
      ${kundeName ? `<div><b>${esc(kundeName)}</b></div>` : ''}
    </div>
    <div class="meta" style="text-align:right">
      ${offer.angebotsnummer ? `<div>Angebot <b>${esc(offer.angebotsnummer)}</b></div>` : ''}
      <div>Datum ${esc(heute)}</div>
      <div>Leistungszeitraum ${esc(datum(offer.zeitraum_von))} – ${esc(datum(offer.zeitraum_bis))}</div>
    </div>
  </div>

  <p>Sehr geehrte Damen und Herren,</p>
  <p>vielen Dank für Ihr Vertrauen. Gerne unterbreiten wir Ihnen unser Angebot für die Pflege der folgenden Standorte.</p>

  <table>
    <thead><tr><th></th><th>Objekt und Leistungsverzeichnis</th><th class="r">Jahrespauschale netto</th></tr></thead>
    <tbody>${posHtml}</tbody>
    <tfoot><tr><td></td><td>Gesamtsumme netto</td><td class="r">${esc(eur(offer.summe_netto))}</td></tr></tfoot>
  </table>

  <p>Alle Beträge zzgl. gesetzlicher Umsatzsteuer. Die Abrechnung erfolgt ${esc(abrechnungText(offer))}.</p>
  ${SCHLUSS.map((s) => `<p>${esc(s)}</p>`).join('')}
  <p>Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.</p>

  <div class="foot">${esc(ANBIETER.name)} · ${esc(ANBIETER.anschrift)} · ${esc(ANBIETER.web)}</div>
  ${autoPrint ? '<script>window.onload = () => window.print()</script>' : ''}
  </body></html>`
}

/** Öffnet die Druckansicht. false, wenn der Popup-Blocker greift. */
export function druckeAngebot(offer, opts = {}) {
  const html = baueAngebotHtml(offer, opts)
  if (!html) return false
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  return true
}
