// ─── PREIS- & KALKULATIONSMODELL ────────────────────────────────────────────
// Ziel: aus einem Pflanz- & Habitatplan ein kalkuliertes Angebot ableiten.
// Logik (Vorgabe LUMA): gespeicherte Werte sind EINKAUFSPREISE (EK, netto).
// Der Verkaufspreis (VK) = EK + Marge/Aufschlag. Arbeitszeit = Stunden × Stundensatz.
//
// ⚠️ Die hier hinterlegten Zahlen sind vorläufige RICHTWERTE und werden durch die
//    echten Einkaufspreise aus den LUMA-Beispielangeboten (Google Drive) ersetzt.
//    Struktur ist bewusst zentral gehalten, damit Preise ohne Katalog-Änderung
//    gepflegt werden können. Marge & Stundensatz sind später in den Einstellungen
//    (app_settings) überschreibbar.

// Standard-Kalkulationsparameter (überschreibbar via Einstellungen)
export const KALKULATION_DEFAULT = {
  marge_material_pct: 25,    // Aufschlag auf Material-EK
  marge_pflanzen_pct: 40,    // Aufschlag auf Pflanzen-EK
  stundensatz_eur: 55,       // Fachkraft-Stundensatz (VK)
  mwst_pct: 19,
}

// Material-EK je "Material|Einheit" (netto). TODO: aus Angeboten befüllen.
export const MATERIAL_PREISE = {
  // Beispiele (Platzhalter — durch echte EK ersetzen):
  // 'Waschsand 0/2|m³': 42,
  // 'Schotter 0/32|m³': 38,
  // 'Natursteine/Mauersteine (regional)|t': 120,
  // 'EPDM-Teichfolie|m²': 9,
  // 'Nistkasten (Holz/Holzbeton)|Stk': 18,
}

// Fallback-EK je Pflanze (netto, pro Stück) nach Typ — grobe Richtwerte,
// solange keine art-/größenspezifischen Preise vorliegen. Einzelne Arten
// können in plants.js `preis_ek_eur` als Override tragen.
export const PFLANZEN_PREIS_STANDARD = {
  staude: 4.5, gras: 4.5, einjährig: 2.0, zweijährig: 2.5, strauch: 9.0, baum: 45.0,
}

export function pflanzePreisEk(plant) {
  if (plant?.preis_ek_eur != null) return plant.preis_ek_eur
  return PFLANZEN_PREIS_STANDARD[plant?.type] ?? null
}

export function materialPreisEk(material, einheit) {
  return MATERIAL_PREISE[`${material}|${einheit}`] ?? null
}

const round2 = n => Math.round(n * 100) / 100

// Kalkuliert EK/VK für einen Plan. `unbekannt` zählt Positionen ohne hinterlegten
// Preis, damit die UI Unvollständigkeit ehrlich anzeigen kann.
export function calcAngebot({ plan = [], habitatPlan = [], kalk = KALKULATION_DEFAULT } = {}) {
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
  const ek_summe = pflanzen_ek + material_ek
  const vk_netto = pflanzen_vk + material_vk + arbeit_vk
  const vk_brutto = vk_netto * (1 + k.mwst_pct / 100)

  return {
    pflanzen_ek: round2(pflanzen_ek), material_ek: round2(material_ek),
    pflanzen_vk: round2(pflanzen_vk), material_vk: round2(material_vk),
    arbeit_std: round2(arbeit_std), arbeit_vk: round2(arbeit_vk),
    ek_summe: round2(ek_summe), vk_netto: round2(vk_netto), vk_brutto: round2(vk_brutto),
    unbekannt, // Anzahl Positionen ohne hinterlegten Preis
  }
}
