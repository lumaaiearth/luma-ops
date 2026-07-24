// Pflegeplan mit Zeitansätzen — leitet aus einem Pflanzplan einen kalkulierbaren
// Pflegeaufwand ab (Stunden/Jahr, Kosten, Monatskalender). Grundlage für
// Pflegeverträge, Ausschreibungen und die Nachkalkulation.
//
// Zeitansätze: Richtwerte für naturnahe Staudenpflanzungen/Staudenmisch-
// pflanzungen. Der etablierte Bestand (ab Jahr 3) liegt erfahrungsgemäß bei
// ca. 2–6 min/m² und Jahr; die Anwuchsjahre deutlich darüber. Die Werte hier
// werden aus der konkreten Planzusammensetzung moduliert (Bodendecker-Anteil,
// Pflanzdichte, Gräser-/Gehölzanteil, Standort) — sie sind Kalkulationshilfen,
// keine garantierten Aufwände.

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// Gattungen, die nach der Hauptblüte einen Remontierschnitt lohnen
const REMONTIER = /^(salvia|nepeta|geranium|alchemilla|delphinium|lupinus|campanula|achillea|centaurea|veronica|leucanthemum)/i

const r1 = v => Math.round(v * 10) / 10
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
// Zeiten lesbar ausgeben: unter einer Stunde in Minuten, sonst in Stunden.
// (Kleine Flächen würden sonst auf „0 h" runden.)
export const fmtDauer = stunden => stunden < 1 ? `${Math.max(1, Math.round(stunden * 60))} min` : `${r1(stunden)} h`

// ── Basis-Zeitwerte (min/m² je Durchgang, sofern nicht anders vermerkt) ────
const T = {
  fruehjahrsputz: 1.3,   // Rückschnitt & Abräumen Vorjahresaufwuchs
  jaeten: 1.4,           // Beikrautregulierung, je Durchgang
  waessern: 2.4,         // Wassergabe, je Gang (Schlauch/Gießwagen)
  sommerschnitt: 0.9,    // Remontierschnitt, je Durchgang (anteilig)
  kontrolle: 0.6,        // Kontrollgang + Nachpflanzung, pro Jahr
  gehoelz_stk: 3.0,      // min je Gehölz und Jahr (Schnitt alle 2 Jahre gemittelt)
  mulch: 2.0,            // Mineralmulch ergänzen (nur Anwuchsjahr)
}

export function buildCarePlan(plan = [], {
  area_m2 = null, site = null, stundensatz = 60, beetW = null, beetH = null,
} = {}) {
  const arten = plan.filter(p => (p.count || 0) > 0)
  if (!arten.length) return null
  const flaeche = area_m2 || (beetW && beetH ? beetW * beetH : null)
  if (!flaeche) return null

  const individuen = arten.reduce((s, p) => s + p.count, 0)
  const dichte = individuen / flaeche

  // ── Zusammensetzung → Modifikatoren ─────────────────────────────────────
  const bodendeckerAnteil = arten.filter(p => p.funktion === 'Bo' || p.wuchsform === 'kriechend' || p.wuchsform === 'polster' || (p.hoehe?.[1] ?? 50) < 25)
    .reduce((s, p) => s + p.count, 0) / individuen
  const graeserAnteil = arten.filter(p => p.type === 'gras').reduce((s, p) => s + p.count, 0) / individuen
  const gehoelzStueck = arten.filter(p => p.type === 'strauch' || p.type === 'baum').reduce((s, p) => s + p.count, 0)
  const remontierAnteil = arten.filter(p => REMONTIER.test(p.latin || '')).reduce((s, p) => s + p.count, 0) / individuen
  // Zwei verschiedene Dinge: die Region bestimmt den Wasserbedarf in den
  // Anwuchsjahren, die Pflanzenauswahl den Beikrautdruck und die Pflege danach.
  // site.arid ist ein Text ('trocken' | 'mäßig-trocken' | 'mäßig' | 'feucht').
  const regionTrocken = /trocken/.test(site?.arid || '')
  const bestandTrocken = arten.every(p => (p.wasser || [2]).includes(1))
  const trocken = bestandTrocken || regionTrocken

  // Dichter Bestand + Bodendecker schließen die Fläche → weniger Beikrautdruck.
  // Magere/trockene Standorte haben ebenfalls geringeren Druck.
  const jaetFaktor = clamp(
    1 - bodendeckerAnteil * 0.3 - clamp((dichte - 6) / 10, 0, 1) * 0.2 - (bestandTrocken ? 0.1 : 0),
    0.5, 1.15,
  )
  // Gräser machen den Frühjahrsschnitt aufwendiger
  const schnittFaktor = 1 + graeserAnteil * 0.35

  // Wassergaben je Anwuchsjahr — die Klimaregion bestimmt die Anzahl
  const giessJ1 = regionTrocken ? 12 : 8
  const giessJ2 = regionTrocken ? 6 : 3

  const mkTask = (key, label, monate, durchgaenge, minProM2, hinweis, stk = null) => {
    const min = stk != null ? stk * minProM2 * durchgaenge : flaeche * minProM2 * durchgaenge
    return { key, label, monate, durchgaenge, min_pro_m2: stk != null ? null : r1(minProM2), stunden: r1(min / 60), hinweis }
  }

  // ── Phasen ───────────────────────────────────────────────────────────────
  function phase(jahr, label, { jaetGaenge, giessGaenge, mitMulch = false, beschreibung }) {
    const tasks = []
    if (jahr > 1) tasks.push(mkTask('fruehjahrsputz', 'Frühjahrsrückschnitt & Abräumen', [2, 3], 1, T.fruehjahrsputz * schnittFaktor,
      'Erst Ende Februar/März — Samenstände sind Winterquartier für Insekten.'))
    if (mitMulch) tasks.push(mkTask('mulch', 'Mulchschicht herstellen/ergänzen', [4], 1, T.mulch,
      'Mineralmulch (Splitt/Kies) unterdrückt Beikraut und senkt den Pflegeaufwand dauerhaft.'))
    tasks.push(mkTask('jaeten', 'Beikrautregulierung', [4, 5, 6, 7, 8, 9], jaetGaenge, T.jaeten * jaetFaktor,
      `${jaetGaenge} Durchgänge über die Vegetationszeit.`))
    if (giessGaenge > 0) tasks.push(mkTask('waessern', 'Wässern (Anwuchspflege)', [5, 6, 7, 8], giessGaenge, T.waessern,
      regionTrocken ? 'Niederschlagsarme Region — lieber selten und durchdringend wässern als oft und wenig.' : 'Nur bei anhaltender Trockenheit, dafür durchdringend.'))
    if (remontierAnteil > 0.05) tasks.push(mkTask('sommerschnitt', 'Remontierschnitt nach Hauptblüte', [6, 7], 1, T.sommerschnitt * remontierAnteil,
      'Salbei, Katzenminze & Co. treiben nach dem Rückschnitt neu durch — zweite Blüte im Spätsommer.'))
    if (gehoelzStueck > 0) tasks.push(mkTask('gehoelz', `Gehölzschnitt (${gehoelzStueck} Stück)`, [2, 3], 1, T.gehoelz_stk,
      'Schnitt außerhalb der Vogelbrutzeit (1. März bis 30. September gesetzlich geschützt).', gehoelzStueck))
    tasks.push(mkTask('kontrolle', 'Kontrollgang & Nachpflanzung', [5, 9], 1, T.kontrolle,
      'Ausfälle erfassen und im Herbst nachpflanzen.'))

    const stunden = r1(tasks.reduce((s, t) => s + t.stunden, 0))
    return {
      jahr, label, beschreibung, tasks, stunden,
      min_pro_m2: r1(stunden * 60 / flaeche),
      kosten: Math.round(stunden * stundensatz),
    }
  }

  const phasen = [
    phase(1, 'Anwuchsjahr (Jahr 1)', { jaetGaenge: 6, giessGaenge: giessJ1, mitMulch: true, beschreibung: 'Entscheidend für den Bestandserfolg: konsequent wässern und Beikraut kleinhalten, bevor die Stauden die Fläche schließen.' }),
    phase(2, 'Etablierungsjahr (Jahr 2)', { jaetGaenge: 4, giessGaenge: giessJ2, beschreibung: 'Der Bestand schließt sich, der Aufwand sinkt deutlich. Wässern nur noch in Trockenphasen.' }),
    phase(3, 'Regelpflege (ab Jahr 3)', { jaetGaenge: bodendeckerAnteil > 0.3 ? 2 : 3, giessGaenge: 0, beschreibung: 'Etablierter Bestand — dauerhaft niedriger Aufwand, im Wesentlichen ein Frühjahrsschnitt und wenige Kontrollgänge.' }),
  ]

  // ── Monatskalender (Regelpflege-Sicht) ──────────────────────────────────
  const regel = phasen[2]
  const monatsplan = MONTHS.map((name, i) => {
    const m = i + 1
    const eintraege = regel.tasks.filter(t => t.monate.includes(m)).map(t => t.label)
    if (m === 11 || m === 12 || m === 1) eintraege.push('Ruhephase — Samenstände und Laub bewusst stehen lassen')
    return { monat: m, name, eintraege }
  })

  const gesamt3 = r1(phasen.reduce((s, p) => s + p.stunden, 0))

  const hinweise = [
    'Kein Herbstputz: Samenstände, hohle Stängel und Laub sind Überwinterungsquartier. Rückschnitt erst ab Ende Februar.',
    'Abschnittsweise schneiden — pro Durchgang höchstens die Hälfte der Fläche, damit Insekten Rückzugsräume behalten.',
    'Schnittgut 2–3 Tage locker liegen lassen, damit Insekten abwandern können, dann abfahren.',
    'Nährstoffarm halten: keine Düngung. Düngung fördert wüchsige Beikräuter und verdrängt konkurrenzschwache Arten.',
    'Schnittgut abfahren statt mulchen — sonst reichert sich die Fläche mit Nährstoffen an.',
  ]
  if (gehoelzStueck > 0) hinweise.push('Gehölzschnitt nur zwischen 1. Oktober und 28. Februar (§ 39 BNatSchG, Vogelbrutzeit).')
  if (bestandTrocken) hinweise.push('Trockenheitsverträgliche Auswahl: nach dem Anwachsen ist keine Bewässerung mehr nötig — Trockenstress gehört zum Konzept und hält den Bestand mager und artenreich.')
  else if (regionTrocken) hinweise.push('Niederschlagsarme Region: in Hitzeperioden auch nach den Anwuchsjahren gelegentlich durchdringend wässern.')

  return {
    flaeche: r1(flaeche), individuen, dichte: r1(dichte), stundensatz,
    phasen, monatsplan, hinweise,
    gesamt3jahre: { stunden: gesamt3, kosten: Math.round(gesamt3 * stundensatz) },
    regelpflege: { stunden: regel.stunden, min_pro_m2: regel.min_pro_m2, kosten: regel.kosten },
    zusammensetzung: {
      bodendeckerPct: Math.round(bodendeckerAnteil * 100),
      graeserPct: Math.round(graeserAnteil * 100),
      remontierPct: Math.round(remontierAnteil * 100),
      gehoelzStueck, bestandTrocken, regionTrocken,
    },
    annahmen: `Zeitansätze für naturnahe Staudenpflanzungen, moduliert nach Bodendecker-Anteil (${Math.round(bodendeckerAnteil * 100)} %), Pflanzdichte (${r1(dichte)}/m²) und Standort. Stundensatz ${stundensatz} €/h netto.`,
  }
}
