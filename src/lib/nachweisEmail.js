// ─────────────────────────────────────────────────────────────────────────────
// Leistungsnachweis als E-Mail
//
// Der monatliche „Pull“-Moment aus CUSTOMER_STRATEGY.md: Der Kunde muss nicht
// ins Portal kommen — die Übersicht kommt zu ihm. Genau das verhindert den
// Jahresend-Schock (PFLEGEPLANUNG_KONZEPT.md, Kap. 2.3).
//
// E-Mail-HTML ist nicht Web-HTML: kein Flexbox, kein Grid, keine externen
// Stylesheets, kein <style> auf das man sich verlassen kann. Alles läuft über
// Tabellen und Inline-Styles, Breite auf 600 px begrenzt.
// ─────────────────────────────────────────────────────────────────────────────

import { formatStunden, formatDatum, formatProzent, nachweisAlsText } from './leistungsnachweis.js'

const GRUEN = '#047A3C'
const TEXT  = '#1a2b22'
const GRAU  = '#6b7280'
const LINIE = '#e5e7eb'

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Baut Betreff, HTML und Nur-Text-Fassung des Leistungsnachweises.
 *
 * @param {object} nachweis          Ergebnis aus buildLeistungsnachweis()
 * @param {object} [opts]
 * @param {string} [opts.kundeName]  Auftraggeber
 * @param {string} [opts.anrede]     z. B. „Sehr geehrte Frau Meier“
 * @param {string} [opts.zeitraumLabel] z. B. „Juli 2026“ oder „2026“
 * @param {string} [opts.absender]   Name der/des Absendenden für die Grußformel
 * @param {string} [opts.portalUrl]  Link ins Kundenportal
 * @returns {{betreff: string, html: string, text: string}}
 */
export function baueNachweisEmail(nachweis, opts = {}) {
  const {
    kundeName = '', anrede = 'Guten Tag', zeitraumLabel = '',
    absender = 'Ihr LUMA-Team', portalUrl = 'https://luma-biome.de',
  } = opts
  const { objekte, summe, zeitraum } = nachweis

  const zeitraumText = zeitraumLabel || (zeitraum.von && zeitraum.bis
    ? `${formatDatum(zeitraum.von)} – ${formatDatum(zeitraum.bis)}`
    : String(zeitraum.jahr || ''))

  const betreff = `Leistungsnachweis ${zeitraumText}${kundeName ? ` — ${kundeName}` : ''}`.trim()

  const hatTexte = objekte.some(o => o.termine.some(t => t.leistungen))
  const zelle = `padding:7px 10px;border-bottom:1px solid ${LINIE};font-size:14px;color:${TEXT};vertical-align:top;`
  const kopf  = `padding:6px 10px;border-bottom:2px solid ${LINIE};font-size:11px;color:${GRAU};text-transform:uppercase;letter-spacing:0.05em;text-align:left;`

  // ── Kennzahlen ────────────────────────────────────────────────────────────
  const kpis = [
    ['Erbrachte Leistung', formatStunden(summe.stunden)],
    ['Einsatztage', String(summe.einsatztage)],
    ['Betreute Flächen', String(summe.objekte)],
  ]
  const kpiHtml = `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
    <tr>
      ${kpis.map(([l, v], i) => `${i > 0 ? '<td style="width:8px;"></td>' : ''}
      <td style="padding:12px 10px;background:#f6fbf8;border:1px solid #d8e6dd;border-radius:8px;text-align:center;">
        <div style="font-size:19px;font-weight:700;color:${GRUEN};line-height:1.2;">${esc(v)}</div>
        <div style="font-size:10px;color:${GRAU};text-transform:uppercase;letter-spacing:0.06em;padding-top:4px;">${esc(l)}</div>
      </td>`).join('')}
    </tr>
  </table>`

  // ── Plan/Ist ──────────────────────────────────────────────────────────────
  const planHtml = objekte.some(o => o.sollStunden > 0) ? `
  <p style="font-size:15px;font-weight:600;color:${TEXT};margin:26px 0 10px;">Jahresplanung und Stand</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <th style="${kopf}">Fläche</th>
      <th style="${kopf}text-align:right;">Geplant</th>
      <th style="${kopf}text-align:right;">Erbracht</th>
      <th style="${kopf}text-align:right;">Stand</th>
    </tr>
    ${objekte.map(o => `
    <tr>
      <td style="${zelle}">${esc(o.name)}</td>
      <td style="${zelle}text-align:right;">${o.sollStunden > 0 ? esc(formatStunden(o.sollStunden)) : '—'}</td>
      <td style="${zelle}text-align:right;">${esc(formatStunden(o.stunden))}</td>
      <td style="${zelle}text-align:right;">${esc(formatProzent(o.erfuellung))}</td>
    </tr>`).join('')}
    <tr>
      <td style="${zelle}font-weight:700;">Gesamt</td>
      <td style="${zelle}text-align:right;font-weight:700;">${summe.sollStunden > 0 ? esc(formatStunden(summe.sollStunden)) : '—'}</td>
      <td style="${zelle}text-align:right;font-weight:700;">${esc(formatStunden(summe.stunden))}</td>
      <td style="${zelle}text-align:right;font-weight:700;">${esc(formatProzent(summe.erfuellung))}</td>
    </tr>
  </table>` : ''

  // ── Detail je Fläche ──────────────────────────────────────────────────────
  const objekteHtml = objekte.map(o => `
  <p style="font-size:15px;font-weight:600;color:${TEXT};margin:26px 0 4px;">
    ${esc(o.name)}
    <span style="font-size:13px;font-weight:400;color:${GRUEN};">
      — ${esc(formatStunden(o.stunden))}${o.sollStunden > 0 ? ` von ${esc(formatStunden(o.sollStunden))} geplant` : ''}
    </span>
  </p>
  ${o.termine.length ? `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <th style="${kopf}width:90px;">Datum</th>
      <th style="${kopf}text-align:right;width:70px;">Stunden</th>
      ${hatTexte ? `<th style="${kopf}">Ausgeführte Arbeiten</th>` : ''}
    </tr>
    ${[...o.termine].sort((a, b) => a.datum.localeCompare(b.datum)).map(t => `
    <tr>
      <td style="${zelle}white-space:nowrap;">${esc(formatDatum(t.datum))}</td>
      <td style="${zelle}text-align:right;white-space:nowrap;">${esc(formatStunden(t.stunden))}</td>
      ${hatTexte ? `<td style="${zelle}">${esc(t.leistungen) || '—'}</td>` : ''}
    </tr>`).join('')}
  </table>`
  : `<p style="font-size:14px;color:${GRAU};margin:0;">In diesem Zeitraum wurden hier keine Stunden erfasst.</p>`}`).join('')

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(betreff)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f5;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td>
          <div style="font-size:11px;letter-spacing:0.24em;color:${GRUEN};font-weight:700;text-transform:uppercase;">LUMA</div>
          <h1 style="font-size:21px;color:${TEXT};margin:8px 0 4px;">Leistungsnachweis ${esc(zeitraumText)}</h1>
          ${kundeName ? `<div style="font-size:13px;color:${GRAU};">${esc(kundeName)}</div>` : ''}

          <p style="font-size:15px;color:${TEXT};line-height:1.6;margin:22px 0;">
            ${esc(anrede)},<br /><br />
            hier ist die Übersicht der Arbeiten, die wir im Zeitraum
            ${esc(zeitraumText)} auf Ihren Flächen ausgeführt haben.
          </p>

          ${kpiHtml}
          ${planHtml}
          ${objekteHtml}

          <p style="font-size:15px;color:${TEXT};line-height:1.6;margin:28px 0 0;">
            Alle Einsätze finden Sie jederzeit auch in Ihrem Portal:<br />
            <a href="${esc(portalUrl)}" style="color:${GRUEN};">${esc(portalUrl)}</a>
          </p>
          <p style="font-size:15px;color:${TEXT};line-height:1.6;margin:18px 0 0;">
            Wenn etwas unklar ist oder Sie etwas anders wünschen, antworten Sie
            einfach auf diese E-Mail.
          </p>
          <p style="font-size:15px;color:${TEXT};line-height:1.6;margin:18px 0 0;">
            Mit freundlichen Grüßen<br />${esc(absender)}
          </p>

          <div style="margin-top:30px;padding-top:14px;border-top:1px solid ${LINIE};font-size:11px;color:${GRAU};line-height:1.5;">
            Dieser Nachweis wurde automatisch aus der Einsatz- und Zeitdokumentation erstellt.<br />
            LUMA — naturnahe Grünflächen · <a href="${esc(portalUrl)}" style="color:${GRAU};">luma-biome.de</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = nachweisAlsText(nachweis, {
    kundeName,
    titel: `Leistungsnachweis ${zeitraumText}`,
  })

  return { betreff, html, text }
}
