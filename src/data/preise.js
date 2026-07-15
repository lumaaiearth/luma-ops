// ─── PREIS- & KALKULATIONSMODELL ────────────────────────────────────────────
// Ziel: aus einem Pflanz- & Habitatplan ein kalkuliertes Angebot ableiten.
// Logik (Vorgabe LUMA): gespeicherte Werte sind EINKAUFSPREISE (EK, netto).
// Verkaufspreis (VK) = EK + Marge/Aufschlag. Arbeit = Stunden × Stundensatz.
//
// Datengrundlage Pflanzen-EK: 6 reale Angebote von Späth'sche Baumschulen Handel
// GmbH (Berlin) an LUMA/MIYA/LAST, 2022–2025 (EK netto pro Stück, ohne MwSt).
// Habitat-MATERIAL kommt in diesen Angeboten NICHT vor → dort stehen bewusst
// als MARKTSCHÄTZUNG markierte Richtwerte, die durch echte Lieferantenpreise
// (Baustoff-/Naturstoffhandel) ersetzt werden sollten.

// Standard-Kalkulationsparameter (später via app_settings überschreibbar)
export const KALKULATION_DEFAULT = {
  marge_material_pct: 25,       // Aufschlag auf Material-EK
  marge_pflanzen_pct: 40,       // Aufschlag auf Pflanzen-EK
  stundensatz_eur: 60,          // Fachkraft-Stundensatz (VK)
  mwst_pct: 19,
  transport_pauschale_eur: 60,  // Liefer-/Transportpauschale bei Anlieferung (aus Späth-Angebot)
}

// ── Pflanzen-EK ─────────────────────────────────────────────────────────────
// Fallback-EK je plants.js-`type` (netto/Stück), abgeleitet aus den Angeboten.
// Hinweis: bei Gehölzen stark größenabhängig (Whip < Heister < mit Ballen/Solitär).
export const PFLANZEN_PREIS_STANDARD = {
  staude: 2.8, gras: 2.6, einjährig: 2.3, zweijährig: 2.6, strauch: 4.0, baum: 6.0,
}

// Art-spezifischer EK (netto/Stück), Schlüssel = botanischer Basisname (Gattung Art,
// ohne Sorte/Hybridzeichen/ssp.). Quelle: Späth-Angebote (Mittelwert bei Mehrfachnennung).
// Gehölz-/Kletterpreise beziehen sich auf die im Angebot genannte Größe.
export const PFLANZEN_EK_BY_LATIN = {
  // Stauden / Kräuter / Gräser / Farne (Container P 0,5 / P 1)
  'Salvia nemorosa': 2.77, 'Salvia officinalis': 3.00, 'Salvia glutinosa': 2.95,
  'Thymus serpyllum': 2.18, 'Thymus citriodorus': 2.65, 'Thymus vulgaris': 2.90,
  'Thymus longicaulis': 2.70, 'Thymus praecox': 3.70,
  'Lavandula angustifolia': 2.30, 'Origanum vulgare': 2.50, 'Melissa officinalis': 2.40,
  'Hyssopus officinalis': 2.45, 'Satureja montana': 2.40, 'Nepeta cataria': 2.50,
  'Agastache foeniculum': 3.10, 'Agastache rugosa': 4.10, 'Perovskia atriplicifolia': 9.70,
  'Caryopteris clandonensis': 6.65, 'Sideritis syriaca': 3.50, 'Marrubium vulgare': 2.90,
  'Leonurus cardiaca': 2.95, 'Borago officinalis': 2.30, 'Lotus corniculatus': 2.80,
  'Malva sylvestris': 2.70, 'Teucrium hircanicum': 3.90, 'Armeria maritima': 2.90,
  'Alyssum montanum': 2.35, 'Geranium macrorrhizum': 2.50, 'Hesperis matronalis': 2.80,
  'Pulmonaria officinalis': 2.90, 'Aquilegia vulgaris': 2.50, 'Digitalis purpurea': 2.60,
  'Galium odoratum': 2.80, 'Galium verum': 3.10, 'Hypericum perforatum': 2.50,
  'Betonica officinalis': 2.50, 'Stachys officinalis': 2.50, 'Solidago virgaurea': 3.10,
  'Valeriana officinalis': 2.43, 'Verbena officinalis': 3.00, 'Geum urbanum': 3.00,
  'Silene vulgaris': 2.90, 'Veronica longifolia': 2.90, 'Deschampsia cespitosa': 2.50,
  'Polygonatum multiflorum': 3.10, 'Athyrium filix-femina': 2.90,
  'Dryopteris filix-mas': 3.20, 'Dryopteris carthusiana': 3.10, 'Dryopteris dilatata': 3.30,
  'Allium aflatunense': 3.00,
  // Gehölze (jung/verpflanzt bis mit Ballen — größenabhängig)
  'Fagus sylvatica': 10.95, 'Carpinus betulus': 9.18, 'Taxus baccata': 13.95,
  'Tilia platyphyllos': 3.69, 'Tilia cordata': 4.00, 'Acer pseudoplatanus': 2.96,
  'Fraxinus excelsior': 2.96, 'Ulmus laevis': 3.20, 'Sorbus aucuparia': 3.54,
  'Sorbus torminalis': 9.78, 'Robinia pseudoacacia': 3.20, 'Abies alba': 34.65,
  'Aesculus hippocastanum': 20.52, 'Prunus avium': 18.42, 'Prunus padus': 4.71,
  'Prunus spinosa': 3.18, 'Cornus sanguinea': 2.88, 'Corylus avellana': 3.87,
  'Sambucus nigra': 3.87, 'Crataegus monogyna': 3.87, 'Rhamnus cathartica': 3.48,
  'Ilex aquifolium': 26.16, 'Lonicera xylosteum': 3.93, 'Euonymus europaeus': 9.48,
  'Ribes rubrum': 9.72, 'Ribes nigrum': 9.72, 'Cytisus scoparius': 5.01, 'Salix fragilis': 1.73,
  // Kletterpflanzen (Container)
  'Hedera helix': 6.50, 'Clematis alpina': 7.28, 'Clematis vitalba': 6.43,
  'Lonicera periclymenum': 7.28, 'Lonicera henryi': 8.75, 'Humulus lupulus': 5.40,
  'Parthenocissus quinquefolia': 6.90, 'Parthenocissus tricuspidata': 8.30,
  'Hydrangea petiolaris': 9.80, 'Wisteria sinensis': 19.50, 'Campsis radicans': 8.55,
}

// Botanischen Namen auf Basis-Binom normalisieren (Sorte/Hybridzeichen/ssp. entfernen)
function baseLatin(latin) {
  if (!latin) return ''
  const noCultivar = latin.replace(/['’"].*?['’"]/g, ' ').replace(/[×x]\s/gi, ' ')
  const tokens = noCultivar.trim().split(/\s+/).filter(t => t && t !== 'x' && t !== '×')
  return tokens.slice(0, 2).join(' ')
}

export function pflanzePreisEk(plant) {
  if (plant?.preis_ek_eur != null) return plant.preis_ek_eur      // expliziter Override
  const byLatin = PFLANZEN_EK_BY_LATIN[baseLatin(plant?.latin)]
  if (byLatin != null) return byLatin                            // reale Angebotsdaten
  return PFLANZEN_PREIS_STANDARD[plant?.type] ?? null            // Typ-Fallback
}

// ── Material-EK ─────────────────────────────────────────────────────────────
// ⚠️ MARKTSCHÄTZUNG (nicht aus den Späth-Angeboten — die enthalten kein Material).
// Durch echte Lieferantenpreise ersetzen. Schlüssel = "<material>|<einheit>" exakt
// wie in habitats.js. Eigenmaterial (Schnittgut/Reisig aus der Pflege) = 0.
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
  const v = MATERIAL_PREISE[`${material}|${einheit}`]
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
