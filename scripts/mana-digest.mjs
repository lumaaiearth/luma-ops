#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// MANA™ RADAR — Wochen-Mail (sonntags)
//
// Schickt eine kompakte Übersicht aller offenen, bewerteten Ausschreibungen
// (Frist noch nicht abgelaufen, nicht verworfen/abgegeben) nach Score sortiert
// an MANA_DIGEST_TO (Standard info@luma.earth).
//
// Aufruf:
//   node scripts/mana-digest.mjs [--dry-run] [--min=45]
//
// Env:
//   SUPABASE_SERVICE_KEY   service_role Key
//   MAIL_ACCESS            SMTP-Zugang: "passwort" (Absender = info@luma.earth),
//                          "user:passwort" oder JSON {"user","pass","host","port"}
//   MANA_DIGEST_TO         optional, Empfänger
//
// Abhängigkeit (nicht committen): npm i --no-save nodemailer
// ════════════════════════════════════════════════════════════════════════════

import { writeFileSync } from 'node:fs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eqwoyfsfyohtcibithak.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const TO = process.env.MANA_DIGEST_TO || 'info@luma.earth'
const APP = 'https://luma-biome.de/mana'

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/)
  return m ? [m[1], m[2] ?? true] : [a, true]
}))
const DRY = !!args['dry-run']
const MIN = args.min ? parseInt(args.min, 10) : 45

function fail(msg) { console.error(`✗ ${msg}`); process.exit(1) }
if (!SERVICE_KEY) fail('SUPABASE_SERVICE_KEY fehlt')

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const trunc = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '')

function parseMailAccess(raw) {
  const v = (raw || '').trim()
  if (!v) return null
  if (v.startsWith('{')) {
    const c = JSON.parse(v)
    return { host: c.host || 'smtp.strato.de', port: Number(c.port || 465), user: c.user || 'info@luma.earth', pass: c.pass || c.password }
  }
  // Freitext: Zeilen "Bezeichnung: Wert" oder einfach Werte, getrennt durch Zeilen/Leerzeichen/Doppelpunkt
  const cfg = {}
  const rest = []
  for (const line of v.split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
    const lab = line.match(/^(user(name)?|benutzer(name)?|login|e-?mail|adresse|absender|pass(wort|word)?|kennwort|pw|host|server|smtp(-?server)?|port)\s*[:=]\s*(.+)$/i)
    if (lab) {
      const k = lab[1].toLowerCase(), val = lab[lab.length - 1].trim()
      if (/^(pass|kennwort|pw)/.test(k)) cfg.pass = val
      else if (/^(host|server|smtp)/.test(k)) cfg.host = val
      else if (k === 'port') cfg.port = val
      else cfg.user = val
    } else rest.push(...line.split(/\s+/))
  }
  for (let tok of rest) {
    if (!cfg.user && /^[^@\s:;]+@[^@\s:;]+$/.test(tok.replace(/[:;]$/, ''))) { cfg.user = tok.replace(/[:;]$/, ''); continue }
    if (!cfg.user && /^[^@\s:;]+@[^@\s:;]+[:;]/.test(tok)) { const i = tok.search(/[:;]/, tok.indexOf('@')); cfg.user = tok.slice(0, i); tok = tok.slice(i + 1); if (!tok) continue }
    if (!cfg.host && /^(smtp|imap|mail)\.[a-z0-9.-]+\.[a-z]{2,}$/i.test(tok)) { cfg.host = tok; continue }
    if (!cfg.port && /^\d{2,4}$/.test(tok)) { cfg.port = tok; continue }
    if (!cfg.pass) cfg.pass = tok
  }
  let host = cfg.host || 'smtp.strato.de'
  if (/^imap\./i.test(host)) host = host.replace(/^imap\./i, 'smtp.')
  return { host, port: Number(cfg.port || 465) === 993 ? 465 : Number(cfg.port || 465), user: cfg.user || 'info@luma.earth', pass: cfg.pass }
}

async function loadRows() {
  const now = new Date().toISOString()
  const q = 'mana_ausschreibungen?select=id,titel,auftraggeber,ort,bundesland,frist_angebot,url,score,score_begruendung,eckdaten,status,created_at,quelle'
    + `&status=in.(neu,interessant,in_bearbeitung)&score=gte.${MIN}`
    + `&or=(frist_angebot.gte.${now},frist_angebot.is.null)&order=score.desc&limit=40`
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
  if (!res.ok) throw new Error(`Supabase: ${res.status} ${await res.text()}`)
  return res.json()
}

function fristText(iso) {
  if (!iso) return { text: 'Frist offen', urgent: false }
  const d = new Date(iso)
  const days = Math.ceil((d - Date.now()) / 86400e3)
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' })
  return { text: `${date} (${days} T)`, urgent: days <= 7 }
}

function render(rows) {
  const weekAgo = Date.now() - 7 * 86400e3
  const neu = rows.filter(r => new Date(r.created_at) >= weekAgo).length
  const bieten = rows.filter(r => r.eckdaten?.empfehlung === 'bieten').length
  const color = s => (s >= 70 ? '#2f7d4f' : s >= 55 ? '#b7791f' : '#8a8a8a')

  const items = rows.map(r => {
    const e = r.eckdaten || {}
    const f = fristText(r.frist_angebot)
    const meta = [r.auftraggeber, r.ort || r.bundesland, e.volumen_geschaetzt].filter(Boolean).map(x => esc(trunc(x, 50))).join(' · ')
    const isNew = new Date(r.created_at) >= weekAgo
    return `<tr><td style="padding:8px 10px 8px 0;vertical-align:top;width:34px">
<div style="font:600 15px/1 system-ui,sans-serif;color:${color(r.score)}">${r.score}</div></td>
<td style="padding:8px 0;vertical-align:top;font:13px/1.45 system-ui,sans-serif;color:#222">
<a href="${esc(r.url || APP)}" style="color:#1a1a1a;font-weight:600;text-decoration:none">${esc(trunc(r.titel, 110))}</a>${isNew ? ' <span style="font-size:11px;color:#2f7d4f">neu</span>' : ''}<br>
<span style="color:#666">${meta}</span><br>
<span style="color:${f.urgent ? '#c0392b' : '#666'}">${esc(f.text)}</span> · <span style="color:#444">${esc(trunc(r.score_begruendung, 160))}</span>
</td></tr>`
  }).join('\n')

  const html = `<!doctype html><html><body style="margin:0;padding:16px;background:#fff">
<div style="max-width:680px;font:13px/1.5 system-ui,sans-serif;color:#222">
<div style="font-size:16px;font-weight:600;margin-bottom:2px">MANA · Ausschreibungen Berlin/Brandenburg</div>
<div style="color:#666;margin-bottom:12px">${rows.length} offen · ${neu} neu diese Woche · ${bieten} mit Empfehlung „bieten“ · sortiert nach Lukrativität</div>
${rows.length ? `<table style="border-collapse:collapse;width:100%">${items}</table>` : '<p>Diese Woche keine passenden offenen Ausschreibungen.</p>'}
<div style="color:#999;font-size:11px;margin-top:14px">Score 0–100 (Passung × Lukrativität). Details, Status und Anschreiben-Entwurf: <a href="${APP}" style="color:#999">${APP}</a></div>
</div></body></html>`

  const text = rows.map(r => `[${r.score}] ${r.titel}\n  ${[r.auftraggeber, r.ort || r.bundesland].filter(Boolean).join(' · ')} · ${fristText(r.frist_angebot).text}\n  ${r.score_begruendung || ''}\n  ${r.url || ''}`).join('\n\n')
    + `\n\nDetails: ${APP}`
  return { html, text, subject: `MANA · ${rows.length} Ausschreibungen${neu ? ` (${neu} neu)` : ''} · KW ${isoWeek(new Date())}` }
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400e3 + 1) / 7)
}

async function main() {
  const rows = await loadRows()
  const mail = render(rows)
  console.log(`${mail.subject}`)
  if (DRY) {
    writeFileSync('mana-digest-preview.html', mail.html)
    console.log('DRY-RUN — Vorschau in mana-digest-preview.html')
    return
  }
  const cfg = parseMailAccess(process.env.MAIL_ACCESS)
  if (!cfg) fail('MAIL_ACCESS fehlt')
  console.log(`  SMTP ${cfg.host}:${cfg.port} · Benutzer ${cfg.user} · Passwortlänge ${cfg.pass?.length ?? 0} · Zeilen im Eintrag ${process.env.MAIL_ACCESS.trim().split(/\r?\n/).length}`)
  const { default: nodemailer } = await import('nodemailer')
  const transport = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.port === 465, auth: { user: cfg.user, pass: cfg.pass } })
  await transport.sendMail({ from: `MANA · LUMA <${cfg.user}>`, to: TO, subject: mail.subject, text: mail.text, html: mail.html })
  console.log(`✓ Mail an ${TO} gesendet (${rows.length} Ausschreibungen, Absender ${cfg.user})`)
}

main().catch(e => fail(e.stack || e.message))
