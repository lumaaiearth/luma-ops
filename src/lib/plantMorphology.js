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

  // ── Asteraceae (Korbblüten) — Strahlenblütler
  Helenium: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Heliopsis: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'korb' },
  Silphium: { leaf: 'gelappt', arrange: 'gegenstaendig', infl: 'korb' },
  Telekia: { leaf: 'herz', arrange: 'wechselstaendig', infl: 'korb' },
  Pulicaria: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Erigeron: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Calendula: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Cosmos: { leaf: 'fein', arrange: 'gegenstaendig', infl: 'korb' },
  Bidens: { leaf: 'gefiedert', arrange: 'gegenstaendig', infl: 'korb' },
  Cota: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'korb' },
  // Asteraceae — Disteln
  Echinops: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'kugel', leafCol: BLUEGREEN },
  Onopordum: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'korb', leafCol: SILVER },
  Silybum: { leaf: 'gelappt', arrange: 'rosette', infl: 'korb', leafCol: SILVER },
  Carlina: { leaf: 'gelappt', arrange: 'rosette', infl: 'korb' },
  Carduus: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'korb' },
  Serratula: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  // Asteraceae — Zungenblütler / Korbrosetten
  Taraxacum: { leaf: 'gelappt', arrange: 'rosette', infl: 'korb' },
  Hieracium: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'korb' },
  Hypochaeris: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'korb' },
  Leontodon: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'korb' },
  Scorzoneroides: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'korb' },
  Scorzonera: { leaf: 'grasartig', arrange: 'rosette', infl: 'korb' },
  Tragopogon: { leaf: 'grasartig', arrange: 'wechselstaendig', infl: 'korb', leafCol: BLUEGREEN },
  Picris: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'korb' },
  Crepis: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'korb' },
  Sonchus: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'korb' },
  Lapsana: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'korb' },
  // Asteraceae — Rispen aus Körbchen
  Jacobaea: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'rispe' },
  Senecio: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'rispe' },
  Eutrochium: { leaf: 'lanzettlich', arrange: 'quirlig', infl: 'dolde' },
  Petasites: { leaf: 'rund', arrange: 'rosette', infl: 'aehre' },
  Tussilago: { leaf: 'rund', arrange: 'rosette', infl: 'korb' },
  Antennaria: { leaf: 'schmal', arrange: 'rosette', infl: 'koepfchen', leafCol: SILVER },

  // ── Apiaceae (Doldenblütler) — Dolde, meist fein/gefiedert
  Pastinaca: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde' },
  Selinum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Silaum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Peucedanum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Seseli: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Levisticum: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde' },
  Aegopodium: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde' },
  Falcaria: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde', leafCol: BLUEGREEN },
  Laserpitium: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde' },
  Sanicula: { leaf: 'gelappt', arrange: 'rosette', infl: 'koepfchen' },
  Carum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Oenanthe: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Berula: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'dolde' },
  Anethum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde', leafCol: BLUEGREEN },
  Coriandrum: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'dolde' },
  Astrantia: { leaf: 'gelappt', arrange: 'rosette', infl: 'koepfchen' },
  Cephalaria: { leaf: 'fein', arrange: 'gegenstaendig', infl: 'koepfchen' },

  // ── Lamiaceae (Lippenblütler) — gegenständig, Ähre/Quirl, oft graugrün
  Betonica: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Leonurus: { leaf: 'gelappt', arrange: 'gegenstaendig', infl: 'quirl' },
  Ballota: { leaf: 'herz', arrange: 'gegenstaendig', infl: 'quirl', leafCol: BLUEGREEN },
  Marrubium: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'quirl', leafCol: SILVER },
  Scutellaria: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Sideritis: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre', leafCol: SILVER },
  Perovskia: { leaf: 'fein', arrange: 'gegenstaendig', infl: 'rispe', leafCol: SILVER },
  Pycnanthemum: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'koepfchen', leafCol: BLUEGREEN },
  Dracocephalum: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Clinopodium: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'quirl' },
  Glechoma: { leaf: 'rund', arrange: 'gegenstaendig', infl: 'quirl' },
  Ajuga: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'aehre' },
  Caryopteris: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'koepfchen', woody: true, leafCol: BLUEGREEN },

  // ── Brassicaceae (Kreuzblütler) — Traube
  Isatis: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'rispe', leafCol: BLUEGREEN },
  Cardamine: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube' },
  Hesperis: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'traube' },
  Lunaria: { leaf: 'herz', arrange: 'wechselstaendig', infl: 'traube' },
  Erysimum: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'traube' },
  Barbarea: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'traube' },
  Bunias: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'traube' },
  Sinapis: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'traube' },
  Iberis: { leaf: 'schmal', arrange: 'wechselstaendig', infl: 'dolde' },
  Reseda: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'aehre' },

  // ── Fabaceae (Schmetterlingsblütler)
  Lupinus: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube' },
  Securigera: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'koepfchen' },
  Hippocrepis: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'koepfchen' },
  Astragalus: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube' },
  Ononis: { leaf: 'klee', arrange: 'wechselstaendig', infl: 'traube' },
  Genista: { leaf: 'schmal', arrange: 'wechselstaendig', infl: 'traube', woody: true },
  Cytisus: { leaf: 'klee', arrange: 'wechselstaendig', infl: 'traube', woody: true },
  Colutea: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube', woody: true, autumn: '#d9b64a' },
  Caragana: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, autumn: '#d9b64a' },
  Robinia: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'traube', woody: true, autumn: '#e3c74a' },

  // ── Boraginaceae
  Cynoglossum: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'traube' },
  Cerinthe: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'traube', leafCol: BLUEGREEN },
  Phacelia: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'rispe' },

  // ── Ranunculaceae
  Delphinium: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'aehre' },
  Trollius: { leaf: 'gelappt', arrange: 'rosette', infl: 'einzeln' },
  Caltha: { leaf: 'rund', arrange: 'rosette', infl: 'einzeln' },
  Nigella: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'einzeln' },
  Clematis: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'einzeln', woody: true },

  // ── Caryophyllaceae
  Agrostemma: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'einzeln' },
  Vaccaria: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'rispe' },
  Viscaria: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'koepfchen' },
  Stellaria: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'rispe' },

  // ── Malvaceae
  Lavatera: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'einzeln' },
  Sidalcea: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'aehre' },

  // ── Crassulaceae
  Hylotelephium: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'dolde', leafCol: BLUEGREEN },

  // ── weitere Stauden / Kräuter
  Asclepias: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'dolde' },
  Papaver: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'einzeln' },
  Euphorbia: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'dolde', leafCol: BLUEGREEN },
  Lysimachia: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'rispe' },
  Lobelia: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'aehre' },
  Adenophora: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'glocke' },
  Legousia: { leaf: 'schmal', arrange: 'wechselstaendig', infl: 'einzeln' },
  Centranthus: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'rispe', leafCol: BLUEGREEN },
  Centaurium: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'rispe' },
  Aruncus: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'rispe' },
  Polemonium: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'rispe' },
  Corydalis: { leaf: 'fein', arrange: 'wechselstaendig', infl: 'traube' },
  Agrimonia: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'aehre' },
  Galium: { leaf: 'schmal', arrange: 'quirlig', infl: 'rispe' },
  Helianthemum: { leaf: 'schmal', arrange: 'gegenstaendig', infl: 'traube' },
  Ruta: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'rispe', leafCol: BLUEGREEN },
  Rhinanthus: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre' },
  Fagopyrum: { leaf: 'herz', arrange: 'wechselstaendig', infl: 'rispe' },
  Humulus: { leaf: 'gelappt', arrange: 'gegenstaendig', infl: 'traube' },

  // ── Wasser-/Ufer-/Sumpfpflanzen
  Typha: { leaf: 'schwert', arrange: 'rosette', infl: 'kolben', leafCol: BLUEGREEN },
  Sparganium: { leaf: 'schwert', arrange: 'rosette', infl: 'kugel' },
  Sagittaria: { leaf: 'herz', arrange: 'rosette', infl: 'traube' },
  Alisma: { leaf: 'oval', arrange: 'rosette', infl: 'rispe' },
  Butomus: { leaf: 'schmal', arrange: 'rosette', infl: 'dolde' },
  Pontederia: { leaf: 'herz', arrange: 'rosette', infl: 'aehre' },
  Menyanthes: { leaf: 'klee', arrange: 'wechselstaendig', infl: 'traube' },
  Nymphaea: { leaf: 'rund', arrange: 'rosette', infl: 'einzeln' },
  Nuphar: { leaf: 'rund', arrange: 'rosette', infl: 'einzeln' },
  Lycopus: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'quirl' },
  Hottonia: { leaf: 'fein', arrange: 'quirlig', infl: 'aehre' },
  Baldellia: { leaf: 'schmal', arrange: 'rosette', infl: 'dolde' },
  Hydrocotyle: { leaf: 'rund', arrange: 'wechselstaendig', infl: 'dolde' },

  // ── Zwiebel-/Knollengeophyten
  Scilla: { leaf: 'schmal', arrange: 'rosette', infl: 'traube' },
  Galanthus: { leaf: 'schmal', arrange: 'rosette', infl: 'einzeln' },
  Leucojum: { leaf: 'schmal', arrange: 'rosette', infl: 'glocke' },
  Eranthis: { leaf: 'fein', arrange: 'rosette', infl: 'einzeln' },
  Colchicum: { leaf: 'lanzettlich', arrange: 'rosette', infl: 'einzeln' },

  // ── weitere Gräser
  Koeleria: { leaf: 'grasartig', arrange: 'rosette', infl: 'aehre' },
  Melica: { leaf: 'grasartig', arrange: 'rosette', infl: 'rispe' },
  Phragmites: { leaf: 'grasartig', arrange: 'wechselstaendig', infl: 'rispe' },

  // ── weitere Gehölze (Blattform grob, Herbstfärbung wo markant)
  Buddleja: { leaf: 'lanzettlich', arrange: 'gegenstaendig', infl: 'aehre', woody: true, leafCol: BLUEGREEN },
  Amelanchier: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'traube', woody: true, autumn: '#d2601f' },
  Aronia: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'dolde', woody: true, autumn: '#a83232' },
  Physocarpus: { leaf: 'gelappt', arrange: 'wechselstaendig', infl: 'dolde', woody: true, autumn: '#c0501f' },
  Spiraea: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'dolde', woody: true, autumn: '#d0902f' },
  Dasiphora: { leaf: 'gefiedert', arrange: 'wechselstaendig', infl: 'einzeln', woody: true },
  Cotinus: { leaf: 'rund', arrange: 'wechselstaendig', infl: 'rispe', woody: true, autumn: '#c8431f' },
  Symphoricarpos: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'traube', woody: true },
  Chaenomeles: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'einzeln', woody: true },
  Weigela: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'glocke', woody: true },
  Clethra: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'aehre', woody: true, autumn: '#e0b53a' },
  Elaeagnus: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, leafCol: SILVER },
  Kolkwitzia: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'glocke', woody: true },
  Cotoneaster: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'dolde', woody: true, autumn: '#b0431f' },
  Hippophae: { leaf: 'schmal', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, leafCol: SILVER },
  Frangula: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, autumn: '#d6a03a' },
  Euonymus: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'dolde', woody: true, autumn: '#c03a5a' },
  Berberis: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'traube', woody: true, autumn: '#c0431f' },
  Rhamnus: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, autumn: '#d0a83a' },
  Ligustrum: { leaf: 'oval', arrange: 'gegenstaendig', infl: 'rispe', woody: true, evergreen: true },
  Calluna: { leaf: 'nadel', arrange: 'gegenstaendig', infl: 'traube', woody: true, evergreen: true, leafCol: DARK },
  Mespilus: { leaf: 'lanzettlich', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, autumn: '#c0651f' },
  Fraxinus: { leaf: 'gefiedert', arrange: 'gegenstaendig', infl: 'rispe', woody: true, autumn: '#e3c74a' },
  Malus: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, autumn: '#d6a03a' },
  Pyrus: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'dolde', woody: true, autumn: '#c0501f' },
  Alnus: { leaf: 'rund', arrange: 'wechselstaendig', infl: 'kolben', woody: true, autumn: '#8a7a3a' },
  Ulmus: { leaf: 'oval', arrange: 'wechselstaendig', infl: 'einzeln', woody: true, autumn: '#e3c74a' },
  Populus: { leaf: 'herz', arrange: 'wechselstaendig', infl: 'kolben', woody: true, autumn: '#e3c74a' },

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
