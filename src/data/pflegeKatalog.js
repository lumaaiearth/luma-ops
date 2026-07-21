// Zentraler Aufgaben-Katalog für Pflegepläne (siehe docs/PFLEGEPLANUNG_KONZEPT.md, Kap. 5).
// Die drei Excel-Pflegepläne 2026 (BEW/JOPE/ALLCURA) benutzen denselben Zeilen-Katalog —
// hier einmalig als Stammdaten. Neue Pläne entstehen per Ankreuzen + Stunden statt Excel-Kopie.
// katalog_key wird in pflege_aufgaben referenziert; freie Positionen (katalog_key = null)
// bleiben für Standort-Sonderaufgaben möglich (z. B. Lehmquelle SH, Solaranlage P15).

export const PFLEGE_KATEGORIEN = [
  { key: 'pflanzen', label: 'Pflanzen & Flächen' },
  { key: 'bewaesserung', label: 'Bewässerung' },
  { key: 'spezial', label: 'Spezial' },
]

export const PFLEGE_KATALOG = [
  // ── Pflanzen & Flächen ──────────────────────────────────────────────
  { key: 'stauden_beikraut', kategorie: 'pflanzen', titel: 'Stauden-Rückschnitt & Beikräuter', beschreibung: 'Entfernung alter Pflanzenteile (Stauden), Beikräutern + Hochbinden von Kletterpflanzen' },
  { key: 'gehoelzschnitt', kategorie: 'pflanzen', titel: 'Rückschnitt / Trimmen Gehölze', beschreibung: 'Rückschnitt bzw. Form-/Trimmschnitt von Gehölzen' },
  { key: 'duengen', kategorie: 'pflanzen', titel: 'Düngen', beschreibung: 'Hornspäne, Brennesseljauche, Grasschnitt etc.' },
  { key: 'wege_reinigung', kategorie: 'pflanzen', titel: 'Reinigung Wegeflächen', beschreibung: 'Laub und Beikräuter von Wege- und Grauflächen entfernen' },
  { key: 'mahd', kategorie: 'pflanzen', titel: 'Mahd & Trimmen Rasenflächen', beschreibung: 'Mahd und Trimmen der Rasenflächen, Wege- und Sitzflächen freihalten' },
  { key: 'nachpflanzung', kategorie: 'pflanzen', titel: 'Neu-/Nachpflanzungen', beschreibung: 'Nachpflanzung bei Pflanzenausfall; Arten in Abstimmung mit dem AG' },
  { key: 'mulchen', kategorie: 'pflanzen', titel: 'Nach-Mulchen', beschreibung: 'Gemulchte Flächen nach Zersetzung der Mulchschicht nachmulchen' },
  // ── Bewässerung ─────────────────────────────────────────────────────
  { key: 'bewaesserung', kategorie: 'bewaesserung', titel: 'Bewässerung', beschreibung: 'Manuelles Wässern (Hand/Flächenregner), Anwuchs-/Pflegewässerung, Kontrolle von Bewässerungssystemen' },
  { key: 'bew_winterfest', kategorie: 'bewaesserung', titel: 'Bewässerung winterfest machen', beschreibung: 'Abbau von Schläuchen/wasserführenden Teilen, IBC entleeren, AG an Abstellen der Außenanschlüsse erinnern' },
  { key: 'bew_anschluss', kategorie: 'bewaesserung', titel: 'Bewässerung anschließen (Frühjahr)', beschreibung: 'Systeme anschließen und aktivieren, Wasserhähne in Absprache mit AG einschalten' },
  { key: 'ibc_auffuellen', kategorie: 'bewaesserung', titel: 'IBC / Bewässerungseinheiten auffüllen', beschreibung: 'Auffüllen von Bewässerungseinheiten (IBC)' },
  { key: 'ibc_reinigung', kategorie: 'bewaesserung', titel: 'IBC-Reinigung / Algenentfernung', beschreibung: 'Reinigung der IBC-Container, Algenentfernung' },
  { key: 'extra_waesserung', kategorie: 'bewaesserung', titel: 'Extra-Wässerung bei Hitze', beschreibung: 'Beobachtung der Niederschläge, zusätzliche Bewässerung bei Hitzeperioden (nach Bedarf)' },
  // ── Spezial ─────────────────────────────────────────────────────────
  { key: 'kletterhilfen', kategorie: 'spezial', titel: 'Kletterhilfen / Hochbinden', beschreibung: 'Anbringen von Kletterhilfen bzw. Hochbinden von Kletterpflanzen (nach Absprache)' },
  { key: 'dachgarten', kategorie: 'spezial', titel: 'Dachgarten-Pflege', beschreibung: 'Pflege von Dachgärten/Dachflächen inkl. Rückschnitt, Beikräuter, Abläufe, ggf. Bewässerungsanlage' },
  { key: 'bioreaktor', kategorie: 'spezial', titel: 'Bioreaktor / Fermenter prüfen', beschreibung: 'Überprüfung von Bioreaktoren/Fermentern auf Funktion, Zustand und Kompostreifung' },
  { key: 'bienenweide', kategorie: 'spezial', titel: 'Bienenweide', beschreibung: 'Abdecken/Umbrechen und Nachsaat der Bienenweide' },
]

export function katalogByKey(key) {
  return PFLEGE_KATALOG.find((k) => k.key === key) || null
}
