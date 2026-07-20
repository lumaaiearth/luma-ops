// Botanische Morphologie je Art — Datengrundlage für die 3D-Modelle.
// Merkmale sind innerhalb einer Gattung/Familie sehr konsistent, daher ein
// Gattungs-Mapping (aus der Systematik abgeleitet, belastbar) + Heuristiken aus
// den vorhandenen plants.js-Feldern für den Rest. So bleibt plants.js unberührt.
//
// Felder je Art:
//   leaf     Blattform:  lanzettlich | oval | rund | herz | gefiedert | fein |
//                        grasartig | schmal | gelappt | nadel | schwert
//   arrange  Blattstellung: rosette | gegenstaendig | wechselstaendig | quirlig
//   infl     Blütenstand: aehre | traube | rispe | dolde | korb | koepfchen |
//                        glocke | lippe | einzeln | kugel | kolben
//   leafCol  Sommer-Blattfarbe (hex)
//   autumn   Herbstfarbe (hex, optional; sonst hergeleitet)
//   woody    Gehölz (Stamm)          evergreen  wintergrün (kein Laubabwurf)

const GREEN = '#4d7c3f', SILVER = '#9fb0a3', BLUEGREEN = '#5c8a74', DARK = '#2f5a2f', FRESH = '#6ea24a'

// Gattung → Merkmale (nur was von den Defaults abweicht, muss gesetzt sein).
const GENUS = {
  // ── Lamiaceae: gegenständige Blätter, Ähren/Quirle, oft aromatisch-graugrün
  Salvia: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Nepeta: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre', leafCol: BLUEGREEN },
  Stachys: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre', leafCol: SILVER },
  Thymus: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'koepfchen' },
  Origanum: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'rispe' },
  Lamium: { leaf: 'herz', arrange: 'gegenstaendig', infl: 'quirl' },
  Agastache: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Monarda: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'koepfchen' },
  Prunella: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'aehre' },
  Teucrium: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre', leafCol: BLUEGREEN },
  Phlomis: { leaf: 'herz', arrange: 'gegenstaendig', infl: 'quirl', leafCol: SILVER },
  Satureja: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'aehre' },
  Lavandula: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'aehre', leafCol: SILVER },
  Mentha: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Melissa: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'quirl' },
  Hyssopus: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'aehre' },

  // ── Asteraceae: Korbblüten
  Achillea: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Centaurea: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Cirsium: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'korb' },
  Tanacetum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Inula: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Helianthus: { leaf: 'herz', arrange: 'wechselstaendig', infl: 'korb' },
  Coreopsis: { leaf: 'fein', arrange: 'gegenstaendig', infl: 'korb' },
  Echinacea: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Rudbeckia: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Aster: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb', autumn: '#9b6fae' },
  Symphyotrichum: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Solidago: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'rispe' },
  Leucanthemum: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Anthemis: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'korb' },
  Buphthalmum: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Bellis: { leaf: 'oval', arrange: 'rosette', infl: 'korb' },
  Arnica: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'korb' },
  Doronicum: { leaf: 'herz', arrange: 'rosette', infl: 'korb' },
  Gaillardia: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Artemisia: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'rispe', leafCol: SILVER },
  Cichorium: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'korb' },

  // ── Apiaceae: Dolden, fein gefiederte Blätter
  Daucus: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Pimpinella: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde' },
  Angelica: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde' },
  Foeniculum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde', leafCol: BLUEGREEN },
  Heracleum: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'dolde' },
  Eryngium: { leaf: 'gelappt', arrange: 'rosette', infl: 'koepfchen', leafCol: BLUEGREEN },
  Anthriscus: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },

  // ── Poaceae / Cyperaceae / Juncaceae: Gräser
  Festuca: { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe', leafCol: BLUEGREEN },
  Stipa: { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe' },
  Carex: { leaf: 'grasartig', arrange: 'rosette', infl: 'kolben' },
  Deschampsia: { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe' },
  Molinia: { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe' },
  Briza: { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe' },
  Panicum: { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe' },
  Calamagrostis: { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe' },
  Sesleria: { leaf: 'grasartig', arrange: 'rosette', infl: 'aehre', leafCol: BLUEGREEN },

  // ── Fabaceae: gefiederte/kleeartige Blätter, Trauben/Köpfchen
  Trifolium: { leaf: 'klee', arrange: 'wechselstaendig', infl: 'koepfchen' },
  Vicia: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube' },
  Medicago: { leaf: 'klee', arrange: 'wechselstaendig', infl: 'koepfchen' },
  Lotus: { leaf: 'klee', arrange: 'wechselstaendig', infl: 'koepfchen' },
  Onobrychis: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube' },
  Melilotus: { leaf: 'klee', arrange: 'wechselstaendig', infl: 'traube' },
  Lathyrus: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube' },
  Anthyllis: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'koepfchen' },
  Galega: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube' },
  Coronilla: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'koepfchen' },

  // ── Boraginaceae
  Echium: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'aehre' },
  Pulmonaria: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'traube' },
  Myosotis: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'traube' },
  Anchusa: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'traube' },
  Borago: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'traube' },
  Symphytum: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'glocke' },

  // ── Campanulaceae & Glockiges
  Campanula: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'glocke' },
  Phyteuma: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'koepfchen' },
  Jasione: { leaf: 'schmal', arrange: 'rosette', infl: 'koepfchen' },

  // ── Plantaginaceae / Scrophulariaceae
  Digitalis: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'traube' },
  Verbascum: { leaf: 'oval', arrange: 'rosette', infl: 'aehre', leafCol: SILVER },
  Veronica: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Veronicastrum: { leaf: 'lanzettlich', arrange: 'quirlig', infl: 'aehre' },
  Linaria: { leaf: 'schmal', arrange: 'wechselstaendig', infl: 'aehre' },
  Antirrhinum: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'aehre' },
  Plantago: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'kolben' },

  // ── Caryophyllaceae: schmale gegenständige Blätter
  Dianthus: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'einzeln', leafCol: BLUEGREEN },
  Silene: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'rispe' },
  Saponaria: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'rispe' },
  Lychnis: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'koepfchen' },

  // ── Rosaceae
  Potentilla: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'einzeln' },
  Geum: { leaf: 'gelappt', arrange: 'rosette', infl: 'einzeln' },
  Sanguisorba: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'kolben' },
  Filipendula: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'rispe' },
  Fragaria: { leaf: 'klee', arrange: 'rosette', infl: 'einzeln' },
  Alchemilla: { leaf: 'gelappt', arrange: 'rosette', infl: 'rispe', leafCol: FRESH },

  // ── Ranunculaceae
  Ranunculus: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'einzeln' },
  Thalictrum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'rispe' },
  Aquilegia: { leaf: 'gelappt', arrange: 'rosette', infl: 'einzeln' },
  Anemone: { leaf: 'gelappt', arrange: 'rosette', infl: 'einzeln' },
  Pulsatilla: { leaf: 'fein', arrange: 'rosette', infl: 'einzeln', leafCol: SILVER },
  Aconitum: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'aehre' },
  Helleborus: { leaf: 'gelappt', arrange: 'rosette', infl: 'einzeln', evergreen: true },

  // ── Geraniaceae / Malvaceae: handförmig gelappte Blätter
  Geranium: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'einzeln' },
  Malva: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'einzeln' },
  Althaea: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'aehre' },

  // ── Crassulaceae: sukkulent
  Sedum: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'dolde', leafCol: BLUEGREEN },
  Sempervivum: { leaf: 'oval', arrange: 'rosette', infl: 'einzeln', leafCol: BLUEGREEN, evergreen: true },

  // ── Dipsacaceae
  Knautia: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'koepfchen' },
  Scabiosa: { leaf: 'fein', arrange: 'gegenstaendig', infl: 'koepfchen' },
  Succisa: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'koepfchen' },
  Dipsacus: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'kolben' },

  // ── Zwiebeln / rhizomatische Einkeimblättrige
  Allium: { leaf: 'schmal', arrange: 'rosette', infl: 'kugel' },
  Iris: { leaf: 'schwert', arrange: 'rosette', infl: 'einzeln' },
  Muscari: { leaf: 'grasartig', arrange: 'rosette', infl: 'traube' },
  Narcissus: { leaf: 'schmal', arrange: 'rosette', infl: 'einzeln' },
  Crocus: { leaf: 'grasartig', arrange: 'rosette', infl: 'einzeln' },
  Tulipa: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'einzeln' },
  Fritillaria: { leaf: 'schmal', arrange: 'wechselstaendig', infl: 'glocke' },
  Camassia: { leaf: 'grasartig', arrange: 'rosette', infl: 'aehre' },

  // ── weitere Stauden
  Verbena: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'rispe' },
  Lythrum: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Epilobium: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'aehre' },
  Liatris: { leaf: 'schmal', arrange: 'wechselstaendig', infl: 'aehre' },
  Eupatorium: { leaf: 'lanzettlich', arrange: 'quirlig', infl: 'dolde' },
  Valeriana: { leaf: 'gefiedert', arrange: 'gegenstaendig', infl: 'dolde' },
  Linum: { leaf: 'schmal', arrange: 'wechselstaendig', infl: 'einzeln', leafCol: BLUEGREEN },
  Viola: { leaf: 'herz', arrange: 'rosette', infl: 'einzeln' },
  Primula: { leaf: 'oval', arrange: 'rosette', infl: 'dolde' },
  Gentiana: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'einzeln' },
  Hypericum: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'rispe' },
  Malva_: {},

  // ── Gehölze (Stamm; Blattform grob)
  Salix: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'kolben', woody: true, autumn: '#d9b64a' },
  Quercus: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'kolben', woody: true, autumn: '#b5651d' },
  Tilia: { leaf: 'herz', arrange: 'wechselstaendig', infl: 'dolde', woody: true, autumn: '#e3c04a' },
  Sorbus: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde', woody: true, autumn: '#c0431f' },
  Prunus: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, autumn: '#c85a2a' },
  Cornus: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'dolde', woody: true, autumn: '#a83232' },
  Sambucus: { leaf: 'gefiedert', arrange: 'gegenstaendig', infl: 'dolde', woody: true, autumn: '#c9a13a' },
  Viburnum: { leaf: 'gelappt', arrange: 'gegenstaendig', infl: 'dolde', woody: true, autumn: '#a83a4a' },
  Lonicera: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'einzeln', woody: true, autumn: '#d0b040' },
  Ribes: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'traube', woody: true, autumn: '#d09a3a' },
  Rosa: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, autumn: '#c85030' },
  Rubus: { leaf: 'klee', arrange: 'wechselstaendig', infl: 'rispe', woody: true },
  Crataegus: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'dolde', woody: true, autumn: '#c0501f' },
  Corylus: { leaf: 'rund', arrange: 'wechselstaendig', infl: 'kolben', woody: true, autumn: '#d6a83a' },
  Acer: { leaf: 'gelappt', arrange: 'gegenstaendig', infl: 'dolde', woody: true, autumn: '#d24a1f' },
  Betula: { leaf: 'herz', arrange: 'wechselstaendig', infl: 'kolben', woody: true, autumn: '#e3c74a' },
  Carpinus: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'kolben', woody: true, autumn: '#d6a03a' },
  Pinus: { leaf: 'nadel', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, evergreen: true, leafCol: '#3f6b4a' },
  Ilex: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, evergreen: true, leafCol: DARK },
  Hedera: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'dolde', evergreen: true, leafCol: DARK },
  Buxus: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'einzeln', woody: true, evergreen: true, leafCol: DARK },
}

function genusOf(latin) { return (latin || '').trim().split(/\s+/)[0] }

// Defaults aus den vorhandenen Feldern (type, wuchsform, funktion, Höhe).
function heuristic(p) {
  if (p.type === 'baum' || p.type === 'strauch') return { leaf: 'oval', arrange: 'wechselstaendig', infl: 'einzeln', woody: true }
  if (p.type === 'gras' || p.wuchsform === 'horstig') return { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe' }
  if (p.funktion === 'Zw') return { leaf: 'schmal', arrange: 'rosette', infl: 'einzeln' }
  if (p.wuchsform === 'kriechend' || p.wuchsform === 'polster') return { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'einzeln' }
  const h = p.hoehe?.[1] ?? 50
  if (h < 20) return { leaf: 'oval', arrange: 'rosette', infl: 'einzeln' }
  return { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'aehre' }
}

// Aufgelöste Morphologie einer Art (Gattung > Heuristik > Defaults), gecacht.
const _cache = new Map()
export function getMorphology(p) {
  if (!p) return { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'aehre', leafCol: GREEN }
  if (p._morph) return p._morph
  const cached = _cache.get(p.id)
  if (cached) { p._morph = cached; return cached }
  const g = GENUS[genusOf(p.latin)] || {}
  const base = heuristic(p)
  const m = {
    leaf: g.leaf || base.leaf,
    arrange: g.arrange || base.arrange,
    infl: g.infl || base.infl,
    leafCol: g.leafCol || GREEN,
    autumn: g.autumn || null,
    woody: g.woody ?? base.woody ?? false,
    evergreen: g.evergreen ?? false,
  }
  _cache.set(p.id, m); p._morph = m
  return m
}

export const LEAF_GREEN = GREEN
