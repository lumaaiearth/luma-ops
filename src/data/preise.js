// ─── PREIS- & KALKULATIONSMODELL ────────────────────────────────────────────
// Ziel: aus einem Pflanz- & Habitatplan ein kalkuliertes Angebot ableiten.
// Logik (Vorgabe LUMA): Basiswerte sind EINKAUFSPREISE (EK, netto).
// Verkaufspreis (VK) = EK + Marge/Aufschlag. Arbeit = Stunden × Stundensatz.
//
// WICHTIG — Datenschutz/Vertraulichkeit:
// Diese Datei wird als Client-Bundle öffentlich ausgeliefert (luma-biome.de).
// Deshalb enthält sie NUR generische Markt-Richtwerte, KEINE lieferanten-
// spezifischen Einkaufspreise. Die echten, vertraulichen EK-Konditionen werden
// zur Laufzeit aus einer RLS-geschützten Supabase-Tabelle geladen und nur für
// eingeloggte interne Nutzer via setPflanzenEkRuntime()/setMaterialEkRuntime()
// injiziert — sie landen nie im öffentlichen Bundle.

// Standard-Kalkulationsparameter (später via app_settings überschreibbar)
export const KALKULATION_DEFAULT = {
  marge_material_pct: 25,       // Aufschlag auf Material-EK
  marge_pflanzen_pct: 40,       // Aufschlag auf Pflanzen-EK
  stundensatz_eur: 60,          // Fachkraft-Stundensatz (VK)
  mwst_pct: 19,
  transport_pauschale_eur: 60,  // Liefer-/Transportpauschale bei Anlieferung
}

// Generische Fallback-EK je plants.js-`type` (netto/Stück) — grobe Markt-Richtwerte
// für Container-Ware. KEINE lieferantenspezifischen Preise.
// Hinweis: bei Gehölzen stark größenabhängig (Whip < Heister < mit Ballen/Solitär).
export const PFLANZEN_PREIS_STANDARD = {
  staude: 2.8, gras: 2.6, einjährig: 2.3, zweijährig: 2.6, strauch: 4.0, baum: 6.0,
}

// Botanischen Namen auf Basis-Binom normalisieren (Sorte/Hybridzeichen/ssp. entfernen)
function baseLatin(latin) {
  if (!latin) return ''
  const noCultivar = latin.replace(/['’"].*?['’"]/g, ' ').replace(/[×x]\s/gi, ' ')
  const tokens = noCultivar.trim().split(/\s+/).filter(t => t && t !== 'x' && t !== '×')
  return tokens.slice(0, 2).join(' ')
}

// ── Laufzeit-Injektion echter EK-Preise (nur intern, aus Supabase/RLS) ──────
// Bleiben leer im öffentlichen Bundle; werden nach Login clientseitig befüllt.
let RUNTIME_PFLANZEN_EK = {}   // { '<Gattung Art>': ek_netto }
let RUNTIME_MATERIAL_EK = {}   // { '<material>|<einheit>': ek_netto }
export function setPflanzenEkRuntime(map) { RUNTIME_PFLANZEN_EK = map || {} }
export function setMaterialEkRuntime(map) { RUNTIME_MATERIAL_EK = { ...MATERIAL_PREISE, ...(map || {}) } }

export function pflanzePreisEk(plant) {
  if (plant?.preis_ek_eur != null) return plant.preis_ek_eur              // expliziter Override
  const rt = RUNTIME_PFLANZEN_EK[baseLatin(plant?.latin)]
  if (rt != null) return rt                                              // interne Echt-EK (Laufzeit)
  return PFLANZEN_PREIS_STANDARD[plant?.type] ?? null                    // generischer Typ-Fallback
}

// ── Material-EK ─────────────────────────────────────────────────────────────
// Generische Markt-Richtwerte (nicht lieferantenspezifisch). Schlüssel =
// "<material>|<einheit>" exakt wie in habitats.js. Eigenmaterial = 0.
// Echte Lieferantenpreise werden zur Laufzeit via setMaterialEkRuntime() gemerged.
export const MATERIAL_PREISE = {
  'Stammteile/Äste (Laubholz, mit Rinde)|m³': 0,
  'Stamm (Laubholz, mit Rinde)|Stk': 15,
  'Schotter/Sand (Drainage + Verfüllung)|m³': 40,
  'Stützpfähle|Stk': 4,
  'dünne Äste/Zweige (Flechtwand)|m³': 0,
  'Strauchschnitt/Laub (Füllung)|m³': 0,
  'Äste/Stammteile (Einfassung)|m³': 0,
  'Holzhäcksel (Füllung)|m³': 15,
  'Robinien-/Eichenholz (Kanthölzer/Stämme)|lfm': 12,
  'Sand/Schotter (Bettung)|m³': 40,
  'Stahlschrauben/Lochband|Satz': 15,
  'Holzpfähle (Robinie)|Stk': 6,
  'Äste/Reisig|m³': 0,
  'Saatgut (Saum-Mischung ohne Gräser)|kg': 90,
  'Natursteine/Mauersteine (regional)|t': 120,
  'Schotter 0/32 (Fundament/Hinterfüllung)|m³': 38,
  'Pflanzsubstrat (Fugen)|m³': 60,
  'Drainagerohr (bei Wasserdruck)|lfm': 5,
  'Natursteine versch. Größe|t': 110,
  'Sand (Drainage bei bindigem Boden)|m³': 35,
  'Bentonit/Lehm (Abdichtung)|m³': 120,
  'Kies-Sand (mageres Substrat)|m³': 35,
  'EPDM-Teichfolie|m²': 12,
  'Kies-Sand (mager, kein Torf)|m³': 35,
  'Teichvlies (Schutzlage)|m²': 2.5,
  'mageres Substrat (kein Torf)|m³': 35,
  'flache Schale/Tränke|Stk': 15,
  'Kiesel/Steine (Landeplätze)|m³': 40,
  'bindiger Sand (0/2, ungewaschen)|m³': 30,
  'Lehm(-putz) zum Anmischen|m³': 50,
  'dornige Randpflanzen (Wildrosen/Disteln)|Stk': 4,
  'bindiger Füllboden (falls nötig)|m³': 15,
  'Hartholzblock (Laubholz)|Stk': 20,
  'Schilf-/Bambusröhrchen versch. Ø|Bund': 8,
  'Fledermauskasten (Holzbeton)|Stk': 35,
  'Befestigung (Alu-Nägel/Schrauben)|Satz': 8,
  'Nistkasten (Holz/Holzbeton)|Stk': 22,
  'Alu-Nägel/Aufhängung|Satz': 6,
}

export function materialPreisEk(material, einheit) {
  const key = `${material}|${einheit}`
  const rt = RUNTIME_MATERIAL_EK[key]
  if (rt !== undefined) return rt
  const v = MATERIAL_PREISE[key]
  return v === undefined ? null : v
}

const round2 = n => Math.round(n * 100) / 100

// Kalkuliert EK/VK für einen Plan. `unbekannt` zählt Positionen ohne hinterlegten
// Preis, damit die UI Unvollständigkeit ehrlich anzeigen kann.
export function calcAngebot({ plan = [], habitatPlan = [], kalk = KALKULATION_DEFAULT, transport = false } = {}) {
  const k = { ...KALKULATION_DEFAULT, ...kalk }
  let pflanzen_ek = 0, material_ek = 0, arbeit_std = 0
  let unbekannt = 0

  for (const p of plan) {
    const ek = pflanzePreisEk(p)
    if (ek == null) { unbekannt++; continue }
    pflanzen_ek += ek * (p.count || 0)
  }
  for (const h of habitatPlan) {
    arbeit_std += (h.aufwand_h || 0) * (h.count || 1)
    for (const m of (h.material || [])) {
      const ek = materialPreisEk(m.material, m.einheit)
      if (ek == null) { unbekannt++; continue }
      material_ek += ek * (m.menge || 0) * (h.count || 1)
    }
  }

  const pflanzen_vk = pflanzen_ek * (1 + k.marge_pflanzen_pct / 100)
  const material_vk = material_ek * (1 + k.marge_material_pct / 100)
  const arbeit_vk = arbeit_std * k.stundensatz_eur
  const transport_eur = transport ? k.transport_pauschale_eur : 0
  const ek_summe = pflanzen_ek + material_ek
  const vk_netto = pflanzen_vk + material_vk + arbeit_vk + transport_eur
  const vk_brutto = vk_netto * (1 + k.mwst_pct / 100)

  return {
    pflanzen_ek: round2(pflanzen_ek), material_ek: round2(material_ek),
    pflanzen_vk: round2(pflanzen_vk), material_vk: round2(material_vk),
    arbeit_std: round2(arbeit_std), arbeit_vk: round2(arbeit_vk), transport_eur: round2(transport_eur),
    ek_summe: round2(ek_summe), vk_netto: round2(vk_netto), vk_brutto: round2(vk_brutto),
    unbekannt,
  }
}
