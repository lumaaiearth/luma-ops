// ─── HABITATELEMENTE / STRUKTUREN ───────────────────────────────────────────
// Naturnahe Habitatmaßnahmen für Florales™ — analog zu plants.js aufgebaut.
// Fachliche Grundlage: Handlungsleitfaden "Treffpunkt Vielfalt — Naturnahe
// Gestaltung von Wohnquartieren" (Stiftung für Mensch und Umwelt, 1. Aufl. 2023).
//
// Feldsemantik (implizit, kein TS):
//   id, name, kategorie ('totholz'|'stein'|'wasser'|'boden'|'nisthilfe')
//   beschreibung, bild_emoji
//   Zielart-Booleans: wildbienen, bienen, voegel, reptilien, amphibien, kaefer, igel, fledermaus
//   flaeche_m2  Richtwert-Footprint je Element (null = punktuell/linear)
//   dimension   textliche Maßangabe
//   aufwand_h   Personal-/Zeitaufwand je Element (Fachkraft-Richtwert, Stunden)
//   maschine    benötigtes Gerät oder null
//   standort_hinweis, jahreszeit (optimales Einbaufenster)
//   material    [{ material, menge, einheit }]  — Richtwerte je EIN Element
//   einbau_schritte  [string]  — fachgerechte Anleitung (→ Checkliste in LUMA Ops)
//   erneuerung_jahre  Intervall für Grunderneuerung (null = dauerhaft)
//   pflege_intervall_monate, pflege_hinweis, pflege_aufwand_h
//   quelle
//
// Bau-Faustregeln aus dem Leitfaden (gelten übergreifend):
//   • bindiger Lehm-/Tonboden → immer Sand-Drainage einbauen
//   • Reisig-/Holzstrukturen → Durchgänge für Igel offenlassen
//   • kein Torf (Wasser), kein Plastik (Nisthilfen)

const QUELLE = 'Treffpunkt Vielfalt (Stiftung Mensch & Umwelt, 2023)'

export const HABITATS = [
  // ─── TOTHOLZ ──────────────────────────────────────────────────────────────
  {
    id: 'liegendes-totholz', name: 'Liegendes Totholz', kategorie: 'totholz', bild_emoji: '🪵',
    beschreibung: 'Stämme und dicke Äste (Laubholz, mit Rinde) teils eingegraben ins Beet gelegt. Lebensraum und Nahrung für ein Viertel aller Käferarten, holznistende Wildbienen und Amphibien; speichert Wasser und reguliert das Mikroklima.',
    wildbienen: true, bienen: true, voegel: false, reptilien: true, amphibien: true, kaefer: true, igel: true, fledermaus: false,
    flaeche_m2: 1, dimension: 'Stämme/Äste je nach Länge; 5–15 cm eingegraben',
    aufwand_h: 1.5, maschine: null, standort_hinweis: 'möglichst sonnig; Laubholz mit Rinde bevorzugt', jahreszeit: 'ganzjährig',
    material: [{ material: 'Stammteile/Äste (Laubholz, mit Rinde)', menge: 0.3, einheit: 'm³' }],
    einbau_schritte: [
      'Boden auf Länge des Holzes ausheben (je nach Durchmesser 5–15 cm tief)',
      'Stammteile/Äste fest platzieren',
      'Aushub rundum anschütten, sodass das Holz Bodenkontakt hat',
    ],
    erneuerung_jahre: 8, pflege_intervall_monate: 96,
    pflege_hinweis: 'Alle 5–10 Jahre Totholz nachlegen; vergangenes Holz nie entsorgen, sondern weiterverwenden.', pflege_aufwand_h: 1,
    quelle: QUELLE,
  },
  {
    id: 'stehendes-totholz', name: 'Stehendes Totholz (Stele)', kategorie: 'totholz', bild_emoji: '🪵',
    beschreibung: 'Senkrecht eingegrabener Stamm — wertvoller als liegendes Totholz. Für holznistende Wildbienen, Käfer, Spechte und Fledermäuse. Berankung mit Wildrosen möglich.',
    wildbienen: true, bienen: true, voegel: true, reptilien: false, amphibien: false, kaefer: true, igel: false, fledermaus: true,
    flaeche_m2: 0.3, dimension: 'Stamm 1–2 m; Grube ≥ 1/3 der Länge + 10 cm Drainage',
    aufwand_h: 2, maschine: 'Erdbohrer/Lochspaten', standort_hinweis: 'sonnig; > 120 cm nur verwitterungsträges Holz (Eiche/Robinie)', jahreszeit: 'ganzjährig',
    material: [
      { material: 'Stamm (Laubholz, mit Rinde)', menge: 1, einheit: 'Stk' },
      { material: 'Schotter/Sand (Drainage + Verfüllung)', menge: 0.05, einheit: 'm³' },
    ],
    einbau_schritte: [
      'Schmale Grube ausheben (Tiefe ≥ 1/3 der Holzlänge + 10 cm)',
      '10 cm Schotter/Sand als Drainage einfüllen',
      'Holz einsetzen und lotrecht ausrichten',
      'Zwischenraum mit Schotter/Sand verfüllen und verdichten',
      'Bei Eiche/Robinie: Nistlöcher Ø 2–9 mm bohren (sofortige Wildbienen-Nistplätze)',
    ],
    erneuerung_jahre: 10, pflege_intervall_monate: 120,
    pflege_hinweis: 'Standfestigkeit prüfen; alle 5–10 Jahre erneuern.', pflege_aufwand_h: 1,
    quelle: QUELLE,
  },
  {
    id: 'reisig-kreis', name: 'Reisig-Kreis', kategorie: 'totholz', bild_emoji: '🍂',
    beschreibung: 'Kreisförmige Reisig-/Flechtwand, befüllt mit Strauchschnitt und Laub. Unterschlupf für Igel, Vögel, Käfer; zugleich Sammelstelle für anfallendes Schnittgut.',
    wildbienen: false, bienen: false, voegel: true, reptilien: true, amphibien: false, kaefer: true, igel: true, fledermaus: false,
    flaeche_m2: 2, dimension: 'Kreis; Grube 30–50 cm tief',
    aufwand_h: 3, maschine: null, standort_hinweis: 'halbschattig bis sonnig; Durchgang für Igel offenlassen', jahreszeit: 'ganzjährig',
    material: [
      { material: 'Stützpfähle', menge: 6, einheit: 'Stk' },
      { material: 'dünne Äste/Zweige (Flechtwand)', menge: 0.5, einheit: 'm³' },
      { material: 'Strauchschnitt/Laub (Füllung)', menge: 1, einheit: 'm³' },
    ],
    einbau_schritte: [
      'Grube 30–50 cm tief in Kreisform ausheben; bei bindigem Boden Sand-Drainage',
      'Stützpfähle rundum einschlagen',
      'Außenwand aus dünnen Ästen um die Pfähle flechten; am Boden Durchgang für Igel offenlassen',
      'Mit Strauchschnitt und Laub befüllen',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 24,
    pflege_hinweis: 'Standfestigkeit prüfen, Stützpfähle/Reisig ergänzen; laufend Schnittgut/Laub nachfüllen.', pflege_aufwand_h: 0.5,
    quelle: QUELLE,
  },
  {
    id: 'kaeferkeller', name: 'Käferkeller', kategorie: 'totholz', bild_emoji: '🪲',
    beschreibung: 'Mit Holzhäckseln befüllte Grube mit Totholz-Einfassung. Lebensraum für xylobionte Käfer, holznistende Wildbienen und Kleintiere.',
    wildbienen: true, bienen: false, voegel: false, reptilien: false, amphibien: false, kaefer: true, igel: true, fledermaus: false,
    flaeche_m2: 1, dimension: 'Grube ≥ 50 cm tief',
    aufwand_h: 2.5, maschine: null, standort_hinweis: 'sonnig-halbschattig; bei undurchlässigem Boden Sand-Drainage', jahreszeit: 'ganzjährig',
    material: [
      { material: 'Äste/Stammteile (Einfassung)', menge: 0.3, einheit: 'm³' },
      { material: 'Holzhäcksel (Füllung)', menge: 0.8, einheit: 'm³' },
    ],
    einbau_schritte: [
      'Grube ≥ 50 cm tief ausheben; bei undurchlässigem Boden Sand-Drainage',
      'Randeinfassung aus Ästen/Stammteilen setzen, Aushub rundum anfüllen',
      'Mit Holzhäckseln befüllen (auch Stammteile, Äste, Strauchschnitt)',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 12,
    pflege_hinweis: 'Haufen senkt sich durch Verrottung — bei Bedarf Totholz/Häcksel nachfüllen.', pflege_aufwand_h: 0.5,
    quelle: QUELLE,
  },
  {
    id: 'totholz-beeteinfassung', name: 'Beeteinfassung aus Totholz', kategorie: 'totholz', bild_emoji: '🪵',
    beschreibung: 'Dauerhafte Beeteinfassung aus Robinien-/Eichenholz auf Sandbett. Strukturgeber und Kleinlebensraum am Beetrand.',
    wildbienen: true, bienen: false, voegel: false, reptilien: false, amphibien: false, kaefer: true, igel: false, fledermaus: false,
    flaeche_m2: null, dimension: 'Graben ~ Holzdicke tief, umlaufend',
    aufwand_h: 3, maschine: null, standort_hinweis: 'Robinie/Eiche für Haltbarkeit; direkten Erdkontakt vermeiden', jahreszeit: 'ganzjährig',
    material: [
      { material: 'Robinien-/Eichenholz (Kanthölzer/Stämme)', menge: 6, einheit: 'lfm' },
      { material: 'Sand/Schotter (Bettung)', menge: 0.2, einheit: 'm³' },
      { material: 'Stahlschrauben/Lochband', menge: 1, einheit: 'Satz' },
    ],
    einbau_schritte: [
      'Graben um das Beet ausheben (etwa so tief wie die Holzdicke)',
      'Holz auf Sand/Schotter betten (trocken lagern, direkten Erdkontakt vermeiden)',
      'Holzverbindungen mit langen Stahlschrauben/Lochband verschrauben',
      'Beetinneres mit Sand/Schotter auffüllen',
    ],
    erneuerung_jahre: 12, pflege_intervall_monate: 144,
    pflege_hinweis: 'Holz nach ca. 10–15 Jahren abschnittsweise erneuern.', pflege_aufwand_h: 1,
    quelle: QUELLE,
  },
  {
    id: 'benjeshecke', name: 'Schichtholz-/Benjeshecke', kategorie: 'totholz', bild_emoji: '🌿',
    beschreibung: 'Zwischen Pfahlreihen geflochtene Äste/Reisig. Sicht-/Windschutz und Lebensraum; als Schichtholzhecke mit Saatgut, als Benjeshecke natürliche Besiedlung durch Vögel.',
    wildbienen: true, bienen: false, voegel: true, reptilien: false, amphibien: false, kaefer: true, igel: true, fledermaus: false,
    flaeche_m2: null, dimension: 'Doppelreihe Pfähle, 50–100 cm Abstand; Länge nach Bedarf',
    aufwand_h: 4, maschine: null, standort_hinweis: 'Durchgang für Igel ermöglichen', jahreszeit: 'Herbst/Winter',
    material: [
      { material: 'Holzpfähle (Robinie)', menge: 10, einheit: 'Stk' },
      { material: 'Äste/Reisig', menge: 1.5, einheit: 'm³' },
      { material: 'Saatgut (Saum-Mischung ohne Gräser)', menge: 0.05, einheit: 'kg' },
    ],
    einbau_schritte: [
      'Holzpfähle in Doppelreihe (50–100 cm Abstand) einschlagen',
      'Äste/Reisig in die Zwischenräume flechten und leicht verdichten',
      'Schichtholzhecke: Saatgut ins Geflecht streuen — Benjeshecke: natürliche Besiedlung über Vögel abwarten',
      'Durchgang für Igel ermöglichen',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 24,
    pflege_hinweis: 'Absacken durch Verrottung — Äste/Reisig nachlegen.', pflege_aufwand_h: 1,
    quelle: QUELLE,
  },

  // ─── STEINE ───────────────────────────────────────────────────────────────
  {
    id: 'trockenmauer', name: 'Trockenmauer', kategorie: 'stein', bild_emoji: '🧱',
    beschreibung: 'Mörtelfrei geschichtete Natursteinmauer mit Spalten und Fugen. Wärmespeicher und Lebensraum für Eidechsen, Wildbienen und Kröten. Fachgerechte Ausführung erforderlich.',
    wildbienen: true, bienen: false, voegel: false, reptilien: true, amphibien: true, kaefer: true, igel: false, fledermaus: false,
    flaeche_m2: null, dimension: 'mit Schotterfundament, ohne Mörtel; Höhe/Länge nach Bedarf',
    aufwand_h: 8, maschine: 'ggf. Minibagger/Radlader (Steintransport)', standort_hinweis: 'sonnig; Know-how des Betriebs sicherstellen', jahreszeit: 'Frühjahr–Herbst',
    material: [
      { material: 'Natursteine/Mauersteine (regional)', menge: 2, einheit: 't' },
      { material: 'Schotter 0/32 (Fundament/Hinterfüllung)', menge: 0.5, einheit: 'm³' },
      { material: 'Pflanzsubstrat (Fugen)', menge: 0.05, einheit: 'm³' },
      { material: 'Drainagerohr (bei Wasserdruck)', menge: 3, einheit: 'lfm' },
    ],
    einbau_schritte: [
      'Mit Schotter-Fundament beginnen',
      'Erste Steinreihe leicht in den Boden versenken; obere Vorderkante waagerecht; unförmige Steine ins Fundament',
      'Kreuzfugen vermeiden, im Verband schichten',
      'Während des Aufbaus Spezialpflanzen in die Fugen setzen (Hauswurz, Zimbelkraut, Mauerpfeffer)',
      'Mit wasserdurchlässigem Material (Schotter 0/32) hinterfüllen; stets ohne Mörtel arbeiten',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 12,
    pflege_hinweis: 'Weitgehend wartungsfrei; Verbuschung/Bewuchs kontrollieren.', pflege_aufwand_h: 0.5,
    quelle: QUELLE,
  },
  {
    id: 'lesesteinhaufen', name: 'Lesesteinhaufen', kategorie: 'stein', bild_emoji: '🪨',
    beschreibung: 'Locker aufgeschüttete Natursteine mit großen Zwischenräumen. Sonnenplatz und Unterschlupf für Reptilien, Wildbienen und Amphibien.',
    wildbienen: true, bienen: false, voegel: false, reptilien: true, amphibien: true, kaefer: true, igel: false, fledermaus: false,
    flaeche_m2: 2, dimension: 'locker aufgeschüttet; große Lücken zwischen den Steinen',
    aufwand_h: 2, maschine: null, standort_hinweis: 'sonnig, mager; Grasnarbe/Oberboden entfernen', jahreszeit: 'ganzjährig',
    material: [
      { material: 'Natursteine versch. Größe', menge: 1.5, einheit: 't' },
      { material: 'Sand (Drainage bei bindigem Boden)', menge: 0.2, einheit: 'm³' },
    ],
    einbau_schritte: [
      'Sonnigen, mageren Standort wählen; Grasnarbe/Oberboden entfernen (sonst schnelle Überwucherung)',
      'Bei bindigem Boden Sand-Drainage einbauen',
      'Unterschiedlich große Steine locker aufschütten — auch größere Lücken lassen (Haufen oder geschichtet)',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 12,
    pflege_hinweis: 'Von Überwucherung freihalten.', pflege_aufwand_h: 0.5,
    quelle: QUELLE,
  },

  // ─── WASSER ───────────────────────────────────────────────────────────────
  {
    id: 'sickermulde', name: 'Sickermulde mit Einstaubereich', kategorie: 'wasser', bild_emoji: '💧',
    beschreibung: 'Abgedichtete Mulde, die Regenwasser zeitweise einstaut und versickern lässt. Wechselfeuchter Lebensraum mit eigener Pflanzengesellschaft.',
    wildbienen: false, bienen: true, voegel: true, reptilien: false, amphibien: true, kaefer: false, igel: false, fledermaus: false,
    flaeche_m2: 4, dimension: '40–50 cm tief; Einstau 20–30 cm',
    aufwand_h: 4, maschine: 'Minibagger (bei größerer Fläche)', standort_hinweis: 'dem Haus abgewandte Überflutungsfläche; ggf. Versickerungsgutachten', jahreszeit: 'Frühjahr/Herbst',
    material: [
      { material: 'Bentonit/Lehm (Abdichtung)', menge: 0.2, einheit: 'm³' },
      { material: 'Kies-Sand (mageres Substrat)', menge: 0.8, einheit: 'm³' },
    ],
    einbau_schritte: [
      'Grube ausheben (z. B. 40–50 cm tief)',
      'Tiefste Stellen bis Überlaufhöhe (20–30 cm) und Wassereinlauf mit Bentonit/Lehm abdichten',
      '20 cm mageres Substrat (Kies-Sand) einbauen',
      'Bei Starkregen dem Haus abgewandte Überflutungsfläche vorsehen',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 12,
    pflege_hinweis: 'Ein-/Überlauf kontrollieren; wechselfeuchte Vegetation pflegen.', pflege_aufwand_h: 1,
    quelle: QUELLE,
  },
  {
    id: 'sumpfbeet', name: 'Sumpfbeet', kategorie: 'wasser', bild_emoji: '🌾',
    beschreibung: 'Abgedichtete, dauerhaft feuchte Senke mit magerem Substrat. Standort für seltene Sumpfpflanzen mit attraktiver Hochsommerblüte; Lebensraum für Amphibien und ölsammelnde Wildbienen.',
    wildbienen: true, bienen: true, voegel: true, reptilien: false, amphibien: true, kaefer: false, igel: false, fledermaus: false,
    flaeche_m2: 4, dimension: '≥ 50 cm tief; mit EPDM-Folie abgedichtet',
    aufwand_h: 5, maschine: 'Minibagger (optional)', standort_hinweis: 'nicht zu schattig; feucht/tief liegend', jahreszeit: 'Frühjahr/Herbst',
    material: [
      { material: 'EPDM-Teichfolie', menge: 6, einheit: 'm²' },
      { material: 'Kies-Sand (mager, kein Torf)', menge: 1, einheit: 'm³' },
    ],
    einbau_schritte: [
      'Grube ≥ 50 cm tief ausheben (feuchter, tief liegender Standort)',
      'Obere dunkle Humusschicht (20–30 cm) entfernen',
      'Grube mit EPDM-Teichfolie abdichten',
      'Mit magerem Aushub + Kiessand befüllen (kein Torf) und bepflanzen (Vorlage „Sumpfbeet")',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 12,
    pflege_hinweis: 'Im Frühjahr Rückschnitt; Nährstoffe niedrig halten, Schnittgut entfernen.', pflege_aufwand_h: 2,
    quelle: QUELLE,
  },
  {
    id: 'teich', name: 'Teich / Kleingewässer', kategorie: 'wasser', bild_emoji: '🐸',
    beschreibung: 'Naturnaher Teich mit Sumpf-, Flach- und Tiefwasserzone (≥ 100 cm frostfrei). Ohne Fische, Pumpe oder Filter — Tiere wandern selbst zu. Lebensraum für Amphibien und wassergebundene Insekten.',
    wildbienen: false, bienen: true, voegel: true, reptilien: true, amphibien: true, kaefer: false, igel: false, fledermaus: false,
    flaeche_m2: 6, dimension: 'Zonen 0–10 / 10–40 / ≥ 40 cm; mind. 100 cm tief',
    aufwand_h: 12, maschine: 'Minibagger', standort_hinweis: 'überwiegend Sonne (keine Vollsonne); flach absenkende Ufer als Ein-/Ausstiege', jahreszeit: 'Frühjahr/Herbst',
    material: [
      { material: 'EPDM-Teichfolie', menge: 12, einheit: 'm²' },
      { material: 'Teichvlies (Schutzlage)', menge: 12, einheit: 'm²' },
      { material: 'mageres Substrat (kein Torf)', menge: 0.5, einheit: 'm³' },
    ],
    einbau_schritte: [
      'Grube mit Zonen modellieren: Sumpf (0–10 cm), Flachwasser (10–40 cm), Tiefwasser ≥ 40 cm; mind. 100 cm tief',
      'Vlies + EPDM-Teichfolie einlegen; flach absenkende Ufer als Ein-/Ausstiege formen',
      'Nur sehr mageres Substrat einbauen (Nährstoffeinträge vermeiden)',
      'Bepflanzen (Vorlage „Teich"); keine Fische, keine Pumpe/Filter',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 12,
    pflege_hinweis: 'Im Frühjahr Rückschnitt; Laub/Schlamm entfernen; jährlich einen Teil der Teichpflanzen entnehmen (gegen Verlandung/Algen).', pflege_aufwand_h: 3,
    quelle: QUELLE,
  },
  {
    id: 'insektentraenke', name: 'Insektentränke / Wasserstelle', kategorie: 'wasser', bild_emoji: '💦',
    beschreibung: 'Flache Wasserschale mit Steinen als Landeplätze. Einfache Tränke für Bienen, Wildbienen und Vögel.',
    wildbienen: true, bienen: true, voegel: true, reptilien: false, amphibien: false, kaefer: false, igel: false, fledermaus: false,
    flaeche_m2: null, dimension: 'flache Schale mit Steinen/Landeplätzen',
    aufwand_h: 0.5, maschine: null, standort_hinweis: 'sonnig-halbschattig, windgeschützt', jahreszeit: 'Frühjahr/Sommer',
    material: [
      { material: 'flache Schale/Tränke', menge: 1, einheit: 'Stk' },
      { material: 'Kiesel/Steine (Landeplätze)', menge: 0.01, einheit: 'm³' },
    ],
    einbau_schritte: [
      'Flache Schale an sonnig-geschütztem Ort aufstellen',
      'Steine/Kiesel als Landeplätze einlegen (Ertrinkungsschutz)',
      'Mit Regenwasser befüllen',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 1,
    pflege_hinweis: 'In Trockenphasen regelmäßig Wasser wechseln und Schale reinigen.', pflege_aufwand_h: 0.1,
    quelle: QUELLE,
  },

  // ─── BODEN ────────────────────────────────────────────────────────────────
  {
    id: 'sandarium', name: 'Sandarium / Sandlinse', kategorie: 'boden', bild_emoji: '🏜️',
    beschreibung: 'Tiefgründige, sonnige Sandfläche für bodennistende Wildbienen. Bindiger Sand hält Insektengänge stabil; dorniger Rand schützt vor Katzen.',
    wildbienen: true, bienen: true, voegel: false, reptilien: false, amphibien: false, kaefer: true, igel: false, fledermaus: false,
    flaeche_m2: 3, dimension: '≥ 50 cm tief, 1–5 m²',
    aufwand_h: 3, maschine: null, standort_hinweis: 'vollsonnig', jahreszeit: 'Frühjahr/Herbst',
    material: [
      { material: 'bindiger Sand (0/2, ungewaschen)', menge: 1.5, einheit: 'm³' },
      { material: 'Lehm(-putz) zum Anmischen', menge: 0.05, einheit: 'm³' },
      { material: 'dornige Randpflanzen (Wildrosen/Disteln)', menge: 5, einheit: 'Stk' },
    ],
    einbau_schritte: [
      'Grube ≥ 50 cm tief, 1–5 m², an vollsonnigem Standort ausheben',
      'Mit bindigem Sand füllen; zu feinen Quarzsand mit Lehm mischen',
      'Prüfen: aus dem leicht feuchten Gemisch muss sich eine stabile Form bilden lassen (Gänge stürzen dann nicht ein)',
      'Rand dornig bepflanzen (Schutz vor Katzen); Sandfläche dauerhaft von Bewuchs freihalten',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 12,
    pflege_hinweis: 'Bewuchs 1×/Jahr entfernen (Sandfläche offen halten).', pflege_aufwand_h: 0.5,
    quelle: QUELLE,
  },
  {
    id: 'abbruchkante', name: 'Abbruchkante / Steilwand', kategorie: 'boden', bild_emoji: '⛰️',
    beschreibung: 'Offene Steilkante in gewachsenem oder bindigem Boden. Dynamischer Lebensraum und Nistplatz für bodennistende Insekten und Erdhöhlenbewohner.',
    wildbienen: true, bienen: true, voegel: true, reptilien: false, amphibien: false, kaefer: false, igel: false, fledermaus: false,
    flaeche_m2: 2, dimension: 'Steilkante/Terrasse in gewachsenem/bindigem Boden',
    aufwand_h: 2, maschine: null, standort_hinweis: 'sonnig; Erosion einplanen', jahreszeit: 'Frühjahr/Herbst',
    material: [{ material: 'bindiger Füllboden (falls nötig)', menge: 0.5, einheit: 'm³' }],
    einbau_schritte: [
      'Gewachsenen, gut durchwurzelten Boden oder bindigen, gut abgesetzten Füllboden wählen',
      'Mögliche Erosion einplanen',
      'Terrasse/Steilkante abgraben (dynamischer Lebensraum, z. B. Hohlweg)',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 24,
    pflege_hinweis: 'Kante bei Verflachung nachstechen.', pflege_aufwand_h: 1,
    quelle: QUELLE,
  },

  // ─── NISTHILFEN ───────────────────────────────────────────────────────────
  {
    id: 'wildbienen-nisthilfe', name: 'Wildbienen-Nisthilfe', kategorie: 'nisthilfe', bild_emoji: '🐝',
    beschreibung: 'Hartholzblock mit sauber gebohrten Gängen bzw. Schilf-/Bambusröhrchen. Nistplatz für rund 25 Wildbienenarten (Saison je nach Art März–August).',
    wildbienen: true, bienen: true, voegel: false, reptilien: false, amphibien: false, kaefer: false, igel: false, fledermaus: false,
    flaeche_m2: null, dimension: 'Hartholz/Schilf; Bohrungen Ø 2–9 mm, ~10 cm tief',
    aufwand_h: 2, maschine: 'Bohrmaschine', standort_hinweis: 'sonnig, trocken, geschützt; Blütenangebot in der Nähe', jahreszeit: 'Herbst/Winter',
    material: [
      { material: 'Hartholzblock (Laubholz)', menge: 1, einheit: 'Stk' },
      { material: 'Schilf-/Bambusröhrchen versch. Ø', menge: 1, einheit: 'Bund' },
    ],
    einbau_schritte: [
      'Harthölzer verwenden (Nadelholz wegen Harz ungeeignet)',
      'Bohrlöcher versch. Ø 2–9 mm, ~10 cm tief, quer zur Faser bohren (durch die Rindenseite)',
      'Alternativ Schilf-/Bambus-/Pappröhrchen versch. Ø bündeln',
      'Bohrlöcher/Kanten glätten (ausgefranst → abschleifen)',
      'Sonnig, trocken und geschützt montieren; Blütenangebot in der Nähe sicherstellen',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 24,
    pflege_hinweis: 'Weitgehend wartungsfrei; morsche/verpilzte Röhrchen ersetzen.', pflege_aufwand_h: 0.5,
    quelle: QUELLE,
  },
  {
    id: 'fledermauskasten', name: 'Fledermauskasten', kategorie: 'nisthilfe', bild_emoji: '🦇',
    beschreibung: 'Tages- und Winterquartier aus Holzbeton, mind. 3 m hoch und windgeschützt angebracht. Ersatz für fehlende Baumhöhlen.',
    wildbienen: false, bienen: false, voegel: false, reptilien: false, amphibien: false, kaefer: false, igel: false, fledermaus: true,
    flaeche_m2: null, dimension: 'Holzbeton; Anbringung ≥ 3 m Höhe',
    aufwand_h: 1, maschine: 'Leiter', standort_hinweis: '≥ 3 m hoch, windgeschützt, Anflugzone frei (Fassade/großer Baum)', jahreszeit: 'ganzjährig',
    material: [
      { material: 'Fledermauskasten (Holzbeton)', menge: 1, einheit: 'Stk' },
      { material: 'Befestigung (Alu-Nägel/Schrauben)', menge: 1, einheit: 'Satz' },
    ],
    einbau_schritte: [
      'Standort ≥ 3 m hoch, windgeschützt wählen (Fassade oder großer Baum)',
      'Anflugzone freihalten',
      'Kasten aus Holzbeton fest anbringen',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 24,
    pflege_hinweis: 'Holzbeton weitgehend wartungsfrei; Sitz und Zustand kontrollieren.', pflege_aufwand_h: 0.5,
    quelle: QUELLE,
  },
  {
    id: 'vogelkasten', name: 'Vogelnistkasten', kategorie: 'nisthilfe', bild_emoji: '🐦',
    beschreibung: 'Nistkasten aus Holz/Holzbeton mit auf die Zielart abgestimmtem Einflugloch. Nach Osten/Südosten ausrichten; Reinigung Ende September.',
    wildbienen: false, bienen: false, voegel: true, reptilien: false, amphibien: false, kaefer: false, igel: false, fledermaus: false,
    flaeche_m2: null, dimension: 'Einflugloch je Zielart: 28/32/45/80/130 mm rund, 34 mm oval',
    aufwand_h: 1, maschine: 'Leiter', standort_hinweis: 'nach Osten/Südosten; ≥ 3 m Abstand (50 cm bei Koloniebrütern); vor Nesträubern schützen', jahreszeit: 'Herbst/Winter',
    material: [
      { material: 'Nistkasten (Holz/Holzbeton)', menge: 1, einheit: 'Stk' },
      { material: 'Alu-Nägel/Aufhängung', menge: 1, einheit: 'Satz' },
    ],
    einbau_schritte: [
      'Bauart/Einflugloch nach Zielart wählen (28 mm Blaumeise, 32 mm Kohlmeise, 45 mm Star, oval 34 mm Sperling/Kleiber; Halbhöhle für Rotkehlchen/Hausrotschwanz)',
      'Nach Osten/Südosten ausrichten (entgegen Hauptwindrichtung)',
      'Mit Aluminium-Nägeln aufhängen; Zugriff für Nesträuber (Katze/Marder/Waschbär) erschweren',
    ],
    erneuerung_jahre: null, pflege_intervall_monate: 12,
    pflege_hinweis: 'Reinigung im frühen Herbst (Ende September): öffnen, trocken ausbürsten.', pflege_aufwand_h: 0.25,
    quelle: QUELLE,
  },
]

// ─── LABELS ─────────────────────────────────────────────────────────────────
export const HABITAT_KATEGORIE_LABELS = {
  totholz: 'Totholz', stein: 'Steine', wasser: 'Wasser', boden: 'Boden', nisthilfe: 'Nisthilfen',
}
export const HABITAT_KATEGORIE_EMOJI = {
  totholz: '🪵', stein: '🪨', wasser: '💧', boden: '🏜️', nisthilfe: '🐝',
}
export const HABITAT_ZIEL_LABELS = {
  wildbienen: 'Wildbienen', bienen: 'Bienen/Hummeln', voegel: 'Vögel', reptilien: 'Reptilien',
  amphibien: 'Amphibien', kaefer: 'Käfer', igel: 'Igel', fledermaus: 'Fledermäuse',
}
export const HABITAT_ZIEL_KEYS = ['wildbienen', 'bienen', 'voegel', 'reptilien', 'amphibien', 'kaefer', 'igel', 'fledermaus']

// ─── FILTER ─────────────────────────────────────────────────────────────────
export function filterHabitats({ kategorie, ziel, searchTerm } = {}) {
  return HABITATS.filter(h => {
    if (kategorie && h.kategorie !== kategorie) return false
    if (ziel && !h[ziel]) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      if (!h.name.toLowerCase().includes(s) && !h.beschreibung?.toLowerCase().includes(s)) return false
    }
    return true
  })
}
