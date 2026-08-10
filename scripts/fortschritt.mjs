// Baut die Fortschrittsseite des Gauntlet-Loops.
//
//   npm run fortschritt   →  fortschritt/index.html
//
// Quellen: jobs/*.md (JSON-Block), verdikte/verdikte.jsonl, .gate-status.json.
// Die Seite zeigt, was wirklich abgelegt ist. Wo nichts abgelegt ist, steht
// „noch keine Runde" — nicht 0 und kein grüner Haken.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const AUS = join(ROOT, 'fortschritt')

const WELLEN = [
  { nr: 1, name: 'Bäume' },
  { nr: 2, name: 'Boden und Vegetation' },
  { nr: 3, name: 'Fauna und Habitat' },
  { nr: 4, name: 'Klima, Sensorik und Fernerkundung' },
  { nr: 5, name: 'Wirkung und Bericht' },
]

const PERSONEN = {
  crew: 'LUMA-Crew im Feld',
  skt: 'SKT-Kontrolleur',
  amt: 'Bezirksamt Grünflächen',
  esg: 'ESG-Verantwortliche',
  facility: 'Facility-Seite',
  analyst: 'LUMA-Analyst',
}

const BAR_NAMEN = {
  methode: 'Methode',
  produkt: 'Produkt',
  funktionsluecke: 'Funktionslücke',
  aufgabe: 'Aufgabe',
  recht: 'Recht',
  daten: 'Daten',
  wirkung: 'Wirkung',
  fernerkundung: 'Fernerkundung',
  zugaenglichkeit: 'Zugänglichkeit',
}

/* ── Einlesen ───────────────────────────────────────────────────────────── */

function jobsLesen() {
  const dir = join(ROOT, 'jobs')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => {
      const text = readFileSync(join(dir, f), 'utf8')
      const m = text.match(/```json\s*([\s\S]*?)```/)
      if (!m) return null
      try {
        const job = JSON.parse(m[1])
        job._datei = `jobs/${f}`
        job._titel = text.match(/^#\s+\S+\s+—\s+(.+)$/m)?.[1] ?? job.id
        return job
      } catch (e) {
        console.error(`  ! ${f}: JSON-Block nicht lesbar — ${e.message}`)
        return null
      }
    })
    .filter(Boolean)
}

function verdikteLesen() {
  const p = join(ROOT, 'verdikte', 'verdikte.jsonl')
  if (!existsSync(p)) return []
  return readFileSync(p, 'utf8')
    .split('\n')
    .map(z => z.trim())
    .filter(z => z && !z.startsWith('//'))
    .map((z, i) => {
      try { return JSON.parse(z) } catch (e) {
        console.error(`  ! verdikte.jsonl Zeile ${i + 1}: ${e.message}`)
        return null
      }
    })
    .filter(Boolean)
}

function gateLesen() {
  const p = join(ROOT, '.gate-status.json')
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null }
}

function standardsZaehlen() {
  const dir = join(ROOT, 'refs', 'standards')
  if (!existsSync(dir)) return { dateien: 0, eintraege: 0, luecken: 0 }
  const dateien = readdirSync(dir).filter(f => f.endsWith('.md'))
  let eintraege = 0, luecken = 0
  for (const f of dateien) {
    const t = readFileSync(join(dir, f), 'utf8')
    eintraege += (t.match(/^### /gm) || []).length
    const nz = t.split(/^## Nicht zugänglich/m)[1]
    if (nz) luecken += (nz.split(/^## /m)[0].match(/^\|\s+[^-|\s]/gm) || []).length
  }
  return { dateien: dateien.length, eintraege, luecken }
}

/* ── Auswerten ──────────────────────────────────────────────────────────── */

function jobStand(job, verdikte) {
  const eigene = verdikte.filter(v => v.job === job.id).sort((a, b) => a.runde - b.runde)
  const runde = eigene.length ? Math.max(...eigene.map(v => v.runde)) : 0
  const letzte = eigene.filter(v => v.runde === runde)
  const gewonnen = letzte.length > 0 && letzte.every(v => v.verdikt === 'unser')

  // Eingefroren: dreimal in Folge alle Bars gewonnen.
  let serie = 0
  for (let r = runde; r >= 1; r--) {
    const dieser = eigene.filter(v => v.runde === r)
    if (dieser.length && dieser.every(v => v.verdikt === 'unser')) serie++
    else break
  }
  const dr = eigene.some(v => v.verdikt === 'diminishing_returns')

  return {
    runde,
    letzte,
    gewonnen,
    serie,
    eingefroren: serie >= 3 || dr,
    grund: dr ? 'diminishing returns' : serie >= 3 ? 'dreimal in Folge gewonnen' : null,
    luecke: [...eigene].reverse().find(v => v.luecke)?.luecke || null,
    budget_ist: letzte.find(v => v.budget_ist)?.budget_ist || null,
    screenshots: [...eigene].reverse().find(v => v.screenshot?.length)?.screenshot || [],
    tokens: eigene.reduce((s, v) => s + (v.tokens_geschaetzt || 0), 0),
  }
}

/* ── Ausgabe ────────────────────────────────────────────────────────────── */

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function budgetZeile(soll, ist) {
  if (!soll) return '<span class="leer">kein Budget hinterlegt</span>'
  const teile = []
  for (const [k, einheit] of [['klicks', ''], ['sekunden', ' s']]) {
    if (soll[k] == null) continue
    const i = ist?.[k]
    const ok = i != null && i <= soll[k]
    teile.push(
      `<span class="budget ${i == null ? 'offen' : ok ? 'gut' : 'schlecht'}">` +
      `${i == null ? '—' : i}${einheit} / ${soll[k]}${einheit} ${k === 'klicks' ? 'Klicks' : ''}</span>`,
    )
  }
  return teile.join(' ')
}

function jobKarte(job, stand) {
  const bars = (job.bars || []).map(b => {
    const v = stand.letzte.find(x => x.bar === b)
    const kl = !v ? 'offen' : v.verdikt === 'unser' ? 'gut' : v.verdikt === 'blockiert' ? 'blockiert' : 'schlecht'
    return `<span class="bar ${kl}">${esc(BAR_NAMEN[b] || b)}</span>`
  }).join('')

  const zustand = stand.eingefroren ? 'eingefroren'
    : stand.runde === 0 ? 'nicht gestartet'
      : stand.gewonnen ? `gewonnen (${stand.serie}×)` : 'offen'
  const zustandKl = stand.eingefroren ? 'frost' : stand.runde === 0 ? 'offen' : stand.gewonnen ? 'gut' : 'schlecht'

  const shots = stand.screenshots.length
    ? `<div class="shots">${stand.screenshots.map(s => `<code>${esc(s)}</code>`).join('')}</div>`
    : ''

  return `
<article class="job">
  <header>
    <h3>${esc(job._titel || job.id)}</h3>
    <span class="zustand ${zustandKl}">${esc(zustand)}</span>
  </header>
  <div class="meta">
    <span class="persona">${esc(PERSONEN[job.persona] || job.persona)}${job.veto ? ' · Veto' : ''}</span>
    <span class="runde">Runde ${stand.runde || '—'}</span>
    <span class="geraet">${esc(job.geraet || '')}</span>
  </div>
  <p class="aufgabe">${esc(job.aufgabe)}</p>
  <div class="bars">${bars}</div>
  <div class="zeile"><span class="k">Budget</span> ${budgetZeile(job.budget, stand.budget_ist)}</div>
  <div class="zeile"><span class="k">Größte Lücke</span>
    ${stand.luecke ? `<span class="luecke">${esc(stand.luecke)}</span>` : '<span class="leer">noch keine Runde gefahren</span>'}</div>
  ${stand.grund ? `<div class="zeile"><span class="k">Eingefroren</span> ${esc(stand.grund)}</div>` : ''}
  ${shots}
</article>`
}

function seite({ jobs, verdikte, gate, standards, jetzt }) {
  const gesamtTokens = verdikte.reduce((s, v) => s + (v.tokens_geschaetzt || 0), 0)
  const wellen = WELLEN.map(w => {
    const jw = jobs.filter(j => j.welle === w.nr)
    if (!jw.length) {
      return `<section class="welle"><h2>Welle ${w.nr} · ${esc(w.name)}</h2>
        <p class="leer">Noch keine Jobs definiert.</p></section>`
    }
    const karten = jw.map(j => jobKarte(j, jobStand(j, verdikte))).join('')
    const fertig = jw.filter(j => jobStand(j, verdikte).eingefroren).length
    return `<section class="welle">
      <h2>Welle ${w.nr} · ${esc(w.name)} <span class="zaehler">${fertig}/${jw.length} eingefroren</span></h2>
      ${karten}
    </section>`
  }).join('')

  const gateZeilen = gate?.schritte?.length
    ? gate.schritte.map(s => `<li class="${s.status}"><span>${esc(s.name)}</span><b>${esc(s.status)}</b></li>`).join('')
    : '<li class="offen"><span>Merge-Gate noch nicht gelaufen</span><b>—</b></li>'

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>BIOME 2.0 — Gauntlet Loop</title>
<style>
  :root {
    --bg:#EEEDE9; --fg:#14171A; --muted:#6B7075; --linie:#D6D4CE;
    --karte:#FFFFFF; --mint:#22EAA7; --gut:#166534; --schlecht:#9A3412;
    --frost:#1E40AF; --offen:#6B7075;
    /* Space Mono und Space Grotesk sind die LUMA-Schriften. Als Artefakt
       veröffentlicht liegen sie nicht vor — Schrift-CDNs sind gesperrt —,
       deshalb ist die Ersatzkette bewusst gesetzt und nicht dem Zufall
       überlassen: eine humanistische Grotesk und eine Monospace mit
       gleichmäßiger Ziffernbreite. */
    --mono:'Space Mono',ui-monospace,'SF Mono',SFMono-Regular,'DejaVu Sans Mono',Menlo,monospace;
    --sans:'Space Grotesk',system-ui,-apple-system,'Segoe UI','DejaVu Sans',sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg:#111315; --fg:#ECEAE5; --muted:#9AA0A6; --linie:#2A2E31;
      --karte:#191C1F; --gut:#4ADE80; --schlecht:#FB923C; --frost:#93C5FD; --offen:#9AA0A6;
    }
  }
  :root[data-theme="dark"] {
    --bg:#111315; --fg:#ECEAE5; --muted:#9AA0A6; --linie:#2A2E31;
    --karte:#191C1F; --gut:#4ADE80; --schlecht:#FB923C; --frost:#93C5FD; --offen:#9AA0A6;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font-family:var(--sans);
         font-variant-numeric:tabular-nums;
         font-size:15px; line-height:1.5; -webkit-text-size-adjust:100%; }
  .huelle { max-width:900px; margin:0 auto; padding:20px 16px 64px;
            padding-left:max(16px,env(safe-area-inset-left));
            padding-right:max(16px,env(safe-area-inset-right)); }
  h1 { font-size:20px; margin:0 0 4px; letter-spacing:-0.01em; }
  h2 { font-size:15px; margin:28px 0 10px; display:flex; flex-wrap:wrap; gap:8px;
       align-items:baseline; border-bottom:1px solid var(--linie); padding-bottom:6px; }
  h3 { font-size:15px; margin:0; font-weight:600; }
  .stand { font-family:var(--mono); font-size:11px; color:var(--muted); margin:0 0 18px; }
  .kacheln { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:8px; margin-bottom:8px; }
  .kachel { background:var(--karte); border:1px solid var(--linie); border-radius:10px; padding:10px 12px; }
  .kachel .wert { font-family:var(--mono); font-size:19px; font-weight:700; }
  .kachel .titel { font-family:var(--mono); font-size:9px; letter-spacing:.09em;
                   text-transform:uppercase; color:var(--muted); }
  .job { background:var(--karte); border:1px solid var(--linie); border-radius:12px;
         padding:14px; margin-bottom:10px; }
  .job header { display:flex; gap:10px; align-items:flex-start; justify-content:space-between; }
  .meta { display:flex; flex-wrap:wrap; gap:10px; font-family:var(--mono); font-size:10px;
          color:var(--muted); margin:6px 0 8px; text-transform:uppercase; letter-spacing:.06em; }
  .aufgabe { margin:0 0 10px; color:var(--fg); }
  .bars { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px; }
  .bar, .zustand, .budget { font-family:var(--mono); font-size:10px; font-weight:700;
        padding:3px 8px; border-radius:11px; border:1px solid var(--linie); white-space:nowrap; }
  .gut { color:var(--gut); border-color:currentColor; }
  .schlecht { color:var(--schlecht); border-color:currentColor; }
  .frost { color:var(--frost); border-color:currentColor; }
  .offen, .blockiert { color:var(--offen); }
  .zeile { display:flex; flex-wrap:wrap; gap:8px; align-items:baseline; padding:5px 0;
           border-top:1px dashed var(--linie); }
  .zeile .k { font-family:var(--mono); font-size:9px; letter-spacing:.08em;
              text-transform:uppercase; color:var(--muted); min-width:92px; }
  .luecke { flex:1; min-width:200px; }
  .leer { color:var(--muted); font-style:italic; }
  .zaehler { font-family:var(--mono); font-size:10px; color:var(--muted); font-weight:400; }
  .shots { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .shots code { font-family:var(--mono); font-size:10px; color:var(--muted);
                background:color-mix(in srgb, var(--fg) 5%, transparent);
                padding:2px 6px; border-radius:5px; word-break:break-all; }
  ul.gate { list-style:none; padding:0; margin:0; }
  ul.gate li { display:flex; justify-content:space-between; gap:10px; padding:7px 0;
               border-bottom:1px solid var(--linie); font-size:14px; }
  ul.gate li b { font-family:var(--mono); font-size:11px; }
  ul.gate li.gruen b { color:var(--gut); }
  ul.gate li.rot b { color:var(--schlecht); }
  :focus-visible { outline:2px solid var(--fg); outline-offset:2px; }
  @media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
  footer { margin-top:32px; font-family:var(--mono); font-size:10px; color:var(--muted); }
  @media (max-width:480px) {
    .zeile .k { min-width:100%; }
    .job header { flex-direction:column; gap:4px; }
  }
</style>
</head>
<body>
<div class="huelle">
  <h1>BIOME 2.0 — Gauntlet Loop</h1>
  <p class="stand">Stand ${esc(jetzt)} · ${jobs.length} Jobs · ${verdikte.length} Verdikte abgelegt</p>

  <div class="kacheln">
    <div class="kachel"><div class="titel">Standards belegt</div><div class="wert">${standards.eintraege}</div></div>
    <div class="kachel"><div class="titel">Bekannte Lücken</div><div class="wert">${standards.luecken}</div></div>
    <div class="kachel"><div class="titel">Runden gesamt</div><div class="wert">${verdikte.length}</div></div>
    <div class="kachel"><div class="titel">Tokens geschätzt</div><div class="wert">${gesamtTokens ? Math.round(gesamtTokens / 1000) + 'k' : '—'}</div></div>
  </div>

  ${wellen}

  <section class="welle">
    <h2>Merge-Gate</h2>
    <ul class="gate">${gateZeilen}</ul>
    ${gate?.zeit ? `<p class="stand">zuletzt ${esc(gate.zeit)}</p>` : ''}
  </section>

  <footer>
    Erzeugt von scripts/fortschritt.mjs aus jobs/, verdikte/verdikte.jsonl und
    .gate-status.json. Wo nichts abgelegt ist, steht das auch so da.
  </footer>
</div>
</body>
</html>
`
}

/* ── Lauf ───────────────────────────────────────────────────────────────── */

const jobs = jobsLesen()
const verdikte = verdikteLesen()
const gate = gateLesen()
const standards = standardsZaehlen()
const jetzt = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })

mkdirSync(AUS, { recursive: true })
writeFileSync(join(AUS, 'index.html'), seite({ jobs, verdikte, gate, standards, jetzt }))

console.log(`fortschritt/index.html geschrieben — ${jobs.length} Jobs, ${verdikte.length} Verdikte, ${standards.eintraege} Standardeinträge`)
