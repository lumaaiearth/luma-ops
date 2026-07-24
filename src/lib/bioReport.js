// Biodiversitäts-Report — bewertet einen Pflanzplan ökologisch und liefert
// belastbare Kennzahlen für Förderanträge, Nachhaltigkeitsberichte (CSRD/ESRS E4)
// und die Kundenkommunikation.
//
// Alle Kennzahlen leiten sich AUSSCHLIESSLICH aus den Artdaten in plants.js ab
// (nektar/pollen 1–5, bluete_monate, heimisch, raupenfutter_arten, spezialisten,
// assoziierte_arten, Bestäubergruppen) — keine erfundenen Werte, keine externen
// Aufrufe. Reproduzierbar: gleicher Plan → gleicher Report.
//
// Methodik-Hinweis für den Report: Die Gewichtungen sind ein transparentes,
// nachvollziehbares Punktemodell (kein zertifizierter Standard). Es bildet die
// gängigen fachlichen Kriterien naturnaher Pflanzungen ab: durchgehende Tracht,
// heimischer Anteil, Spezialisten-/Raupenfutterangebot, Strukturvielfalt und
// Winterstruktur.

export const REPORT_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10]   // Vegetationszeit
export const HAUPTFLUGZEIT = [4, 5, 6, 7, 8, 9]          // Kernzeit der Bestäuber
const MONTH_ABBR = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
export const monthName = m => MONTH_ABBR[m - 1] || '?'

const POLLI = [
  { key: 'bienen', label: 'Wildbienen' },
  { key: 'tagfalter', label: 'Tagfalter' },
  { key: 'nachtfalter', label: 'Nachtfalter' },
  { key: 'kaefer', label: 'Käfer' },
  { key: 'voegel', label: 'Vögel' },
]

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const r1 = v => Math.round(v * 10) / 10

// Blütenangebot einer Art in einem Monat, gewichtet nach Individuenzahl und
// Futterwert (Nektar + Pollen). Dient als relativer Trachtindex.
function forageValue(p) {
  return ((p.nektar || 0) + (p.pollen || 0)) / 2
}

export function buildBioReport(plan = [], { area_m2 = null, site = null } = {}) {
  const arten = plan.filter(p => (p.count || 0) > 0)
  const individuen = arten.reduce((s, p) => s + p.count, 0)
  if (!arten.length) return null

  // ── Monatsverlauf: Trachtangebot & Bestäuberversorgung ───────────────────
  const monthly = REPORT_MONTHS.map(m => {
    const bl = arten.filter(p => (p.bluete_monate || []).includes(m))
    const index = bl.reduce((s, p) => s + p.count * forageValue(p), 0)
    const gruppen = Object.fromEntries(POLLI.map(g => [g.key, bl.filter(p => p[g.key]).length]))
    return { monat: m, name: monthName(m), arten: bl.length, individuen: bl.reduce((s, p) => s + p.count, 0), index: Math.round(index), gruppen }
  })
  const maxIndex = Math.max(1, ...monthly.map(m => m.index))
  monthly.forEach(m => { m.rel = m.index / maxIndex })

  // Trachtlücken: Monate der Hauptflugzeit ohne bzw. mit sehr schwachem Angebot
  const luecken = monthly
    .filter(m => HAUPTFLUGZEIT.includes(m.monat) && m.rel < 0.18)
    .map(m => ({ monat: m.monat, name: m.name, arten: m.arten, kritisch: m.arten === 0 }))

  // Versorgungslücken je Bestäubergruppe (nur Gruppen, die überhaupt bedient werden)
  const gruppenLuecken = POLLI
    .filter(g => arten.some(p => p[g.key]))
    .map(g => ({
      ...g,
      arten: arten.filter(p => p[g.key]).length,
      luecken: HAUPTFLUGZEIT.filter(m => !arten.some(p => p[g.key] && (p.bluete_monate || []).includes(m))).map(monthName),
    }))

  // ── Spezialisten (oligolektische Wildbienen) & Raupenfutter ──────────────
  const spezialisten = [...new Set(arten.flatMap(p => p.spezialisten || []))].sort((a, b) => a.localeCompare(b, 'de'))
  const raupenArten = [...new Set(arten.flatMap(p => p.raupenfutter_arten || []))].sort((a, b) => a.localeCompare(b, 'de'))
  const raupenPflanzen = arten.filter(p => p.raupenfutter)
  // Ø assoziierte Arten (naturaDB): wie viele Tierarten die Pflanzen im Schnitt tragen
  const withAssoc = arten.filter(p => p.assoziierte_arten > 0)
  const assocAvg = withAssoc.length ? Math.round(withAssoc.reduce((s, p) => s + p.assoziierte_arten, 0) / withAssoc.length) : null
  const topAssoc = [...withAssoc].sort((a, b) => b.assoziierte_arten - a.assoziierte_arten).slice(0, 5)

  // ── Struktur ─────────────────────────────────────────────────────────────
  const heimischArten = arten.filter(p => p.heimisch).length
  const heimischInd = arten.filter(p => p.heimisch).reduce((s, p) => s + p.count, 0)
  const heimischPct = Math.round(100 * heimischInd / Math.max(1, individuen))

  const lebensformen = {
    stauden: arten.filter(p => p.type === 'staude').length,
    graeser: arten.filter(p => p.type === 'gras').length,
    gehoelze: arten.filter(p => p.type === 'strauch' || p.type === 'baum').length,
    zweijaehrig: arten.filter(p => p.type === 'zweijährig' || p.type === 'einjährig').length,
    geophyten: arten.filter(p => p.funktion === 'Zw').length,
  }
  const lebensformKlassen = Object.values(lebensformen).filter(v => v > 0).length
  // Höhenschichten: bodennah / mittel / hoch / Gehölzhöhe
  const schichten = new Set(arten.map(p => {
    const h = p.hoehe?.[1] ?? 50
    return h < 25 ? 'boden' : h < 60 ? 'mittel' : h < 120 ? 'hoch' : 'gerüst'
  }))
  const dichte = area_m2 ? r1(individuen / area_m2) : null

  // Winterstruktur: Samenstände (blüht & wird stehen gelassen) + Gräser + Gehölze
  const samenstaende = arten.filter(p => (p.bluete_monate || []).some(m => m >= 7)).length
  const winterStruktur = samenstaende + lebensformen.graeser * 2 + lebensformen.gehoelze * 2

  // ── Teilbewertungen (transparentes Punktemodell, Summe = 100) ────────────
  // 1) Trachtkontinuität (30) — durchgehendes Angebot über die Hauptflugzeit
  const versorgteMonate = HAUPTFLUGZEIT.filter(m => {
    const mm = monthly.find(x => x.monat === m)
    return mm && mm.rel >= 0.18
  }).length
  const fruehjahr = monthly.find(m => m.monat === 3 || m.monat === 4)?.arten > 0 ? 1 : 0
  const spaet = monthly.find(m => m.monat === 9)?.arten > 0 ? 1 : 0
  const sTracht = clamp(24 * versorgteMonate / HAUPTFLUGZEIT.length + 3 * fruehjahr + 3 * spaet, 0, 30)

  // 2) Heimischer Anteil (20) — heimische Arten tragen deutlich mehr Fauna
  const sHeimisch = clamp(heimischPct / 100 * 20, 0, 20)

  // 3) Spezialisten & Raupenfutter (20)
  const sSpezial = clamp(
    clamp(spezialisten.length / 12, 0, 1) * 10 +
    clamp(raupenArten.length / 15, 0, 1) * 6 +
    clamp(raupenPflanzen.length / Math.max(3, arten.length * 0.3), 0, 1) * 4,
    0, 20,
  )

  // 4) Struktur- & Artenvielfalt (20)
  const artenZiel = area_m2 ? clamp(Math.sqrt(area_m2) * 2.2, 5, 25) : 12
  const sStruktur = clamp(
    clamp(arten.length / artenZiel, 0, 1) * 9 +
    (lebensformKlassen / 5) * 6 +
    (schichten.size / 4) * 5,
    0, 20,
  )

  // 5) Winterstruktur & Ganzjährigkeit (10)
  const sWinter = clamp(clamp(winterStruktur / Math.max(6, arten.length), 0, 1) * 10, 0, 10)

  const teil = [
    { key: 'tracht', label: 'Trachtkontinuität', punkte: r1(sTracht), max: 30, hinweis: `${versorgteMonate}/${HAUPTFLUGZEIT.length} Monate der Hauptflugzeit versorgt` },
    { key: 'heimisch', label: 'Heimischer Anteil', punkte: r1(sHeimisch), max: 20, hinweis: `${heimischPct} % der Pflanzen heimisch (${heimischArten}/${arten.length} Arten)` },
    { key: 'spezial', label: 'Spezialisten & Raupenfutter', punkte: r1(sSpezial), max: 20, hinweis: `${spezialisten.length} Spezialisten-Wildbienen, ${raupenArten.length} Falterarten` },
    { key: 'struktur', label: 'Struktur- & Artenvielfalt', punkte: r1(sStruktur), max: 20, hinweis: `${arten.length} Arten, ${lebensformKlassen} Lebensformen, ${schichten.size} Höhenschichten` },
    { key: 'winter', label: 'Winterstruktur', punkte: r1(sWinter), max: 10, hinweis: `${samenstaende} Arten mit Samenständen als Überwinterungsstruktur` },
  ]
  const score = Math.round(teil.reduce((s, t) => s + t.punkte, 0))
  const stufe = score >= 80 ? { label: 'sehr hoch', farbe: '#047A3C' }
    : score >= 65 ? { label: 'hoch', farbe: '#10b981' }
      : score >= 50 ? { label: 'mittel', farbe: '#d97706' }
        : { label: 'ausbaufähig', farbe: '#dc2626' }

  // ── Konkrete Empfehlungen ────────────────────────────────────────────────
  const empfehlungen = []
  luecken.forEach(l => {
    empfehlungen.push({
      prio: l.kritisch ? 'hoch' : 'mittel',
      text: l.kritisch
        ? `Trachtlücke im ${l.name}: keine blühende Art im Plan. Passende Art für diesen Monat ergänzen.`
        : `Schwaches Blütenangebot im ${l.name} (nur ${l.arten} Art(en)). Zusätzliche Art für diesen Monat einplanen.`,
    })
  })
  // Gruppenlücken nur nennen, soweit sie NICHT schon durch eine allgemeine
  // Trachtlücke im selben Monat abgedeckt sind — sonst dreifach dieselbe Aussage.
  const lueckenMonate = new Set(luecken.map(l => l.name))
  gruppenLuecken
    .map(g => ({ ...g, eigen: g.luecken.filter(m => !lueckenMonate.has(m)) }))
    .filter(g => g.eigen.length >= 2)
    .sort((a, b) => b.eigen.length - a.eigen.length)
    .slice(0, 2)
    .forEach(g => {
      empfehlungen.push({ prio: 'mittel', text: `${g.label}: keine Nahrung im ${g.eigen.join(', ')}. Gezielt Art für diese Gruppe und Monate ergänzen.` })
    })
  if (heimischPct < 60) empfehlungen.push({ prio: 'hoch', text: `Heimischer Anteil bei ${heimischPct} %. Heimische Wildstauden tragen ein Vielfaches an Insektenarten — Anteil auf mindestens 70 % erhöhen.` })
  if (!lebensformen.geophyten) empfehlungen.push({ prio: 'mittel', text: 'Keine Zwiebelgeophyten im Plan. Frühblüher (z. B. Krokus, Wildtulpe, Traubenhyazinthe) schließen die Lücke im zeitigen Frühjahr.' })
  if (!lebensformen.graeser) empfehlungen.push({ prio: 'niedrig', text: 'Keine Gräser im Plan. Gräser geben Struktur, Winteraspekt und Eiablageplätze für Insekten.' })
  if (raupenPflanzen.length < Math.max(2, arten.length * 0.2)) empfehlungen.push({ prio: 'hoch', text: 'Wenig Raupenfutterpflanzen. Falter brauchen Futterpflanzen für die Raupen, nicht nur Nektar für die Falter selbst.' })
  if (dichte != null && dichte < 5) empfehlungen.push({ prio: 'mittel', text: `Pflanzdichte bei ${dichte} Pflanzen/m². Unter 5/m² bleiben Lücken offen — der Beikrautdruck und damit der Pflegeaufwand steigt.` })
  if (dichte != null && dichte > 14) empfehlungen.push({ prio: 'niedrig', text: `Pflanzdichte bei ${dichte} Pflanzen/m² — sehr dicht. Konkurrenzschwache Arten können verdrängt werden.` })
  if (arten.length < 8) empfehlungen.push({ prio: 'mittel', text: `Nur ${arten.length} Arten. Artenreichere Pflanzungen sind stabiler und versorgen mehr Bestäubergruppen.` })

  return {
    score, stufe, teil, monthly, luecken, gruppenLuecken,
    kennzahlen: {
      arten: arten.length, individuen, area_m2, dichte,
      heimischArten, heimischPct,
      spezialisten: spezialisten.length, raupenArten: raupenArten.length,
      raupenPflanzen: raupenPflanzen.length,
      lebensformKlassen, schichten: schichten.size, assocAvg,
      nektarSchnitt: r1(arten.reduce((s, p) => s + (p.nektar || 0), 0) / arten.length),
      pollenSchnitt: r1(arten.reduce((s, p) => s + (p.pollen || 0), 0) / arten.length),
    },
    lebensformen, spezialistenListe: spezialisten, raupenListe: raupenArten, topAssoc,
    // Nach Priorität sortiert und begrenzt — ein Report mit 10 Hinweisen wird nicht gelesen.
    empfehlungen: empfehlungen
      .sort((a, b) => ({ hoch: 0, mittel: 1, niedrig: 2 }[a.prio] - { hoch: 0, mittel: 1, niedrig: 2 }[b.prio]))
      .slice(0, 6),
    site,
    methodik: 'Punkteverteilung — Trachtkontinuität 30, heimischer Anteil 20, Spezialisten & Raupenfutter 20, Struktur- & Artenvielfalt 20, Winterstruktur 10.',
  }
}

// Passende Arten aus dem Katalog, die eine Trachtlücke schließen würden.
// candidates: bereits nach Standort gefilterte Artenliste.
export function gapCandidates(report, candidates = [], plan = [], limit = 4) {
  if (!report?.luecken?.length) return []
  const drin = new Set(plan.map(p => p.id))
  // Gehölze nur vorschlagen, wenn der Plan ohnehin schon welche enthält —
  // sonst landen Bäume als „Lückenschließer" in einem Staudenbeet.
  const hatGehoelz = plan.some(p => p.type === 'strauch' || p.type === 'baum')
  const passendeHoehe = Math.max(...plan.map(p => p.hoehe?.[1] ?? 50), 60) * 1.6

  const rang = (c, monat) => {
    let s = 0
    if (c.heimisch) s += 3
    s += forageValue(c)                                   // Nektar/Pollen 0–5
    if (monat <= 5 && c.funktion === 'Zw') s += 3          // Frühjahr: Geophyten ideal
    if ((c.assoziierte_arten || 0) > 40) s += 1
    if ((c.hoehe?.[1] ?? 50) > passendeHoehe) s -= 2       // sprengt den Maßstab
    return s
  }
  return report.luecken.map(l => ({
    monat: l.monat, name: l.name,
    arten: candidates
      .filter(c => !drin.has(c.id) && (c.bluete_monate || []).includes(l.monat))
      .filter(c => hatGehoelz || (c.type !== 'baum' && c.type !== 'strauch'))
      .sort((a, b) => rang(b, l.monat) - rang(a, l.monat))
      .slice(0, limit),
  })).filter(g => g.arten.length)
}
