-- MANA RADAR v2: Suchprofil auf das tatsächliche LUMA-Portfolio und die Region
-- Berlin/Brandenburg zuschneiden (Malte, 2026-11-10).
UPDATE public.mana_profil SET
  firmenprofil =
    'LUMA (Berlin) ist ein Fachbetrieb für urbane Biodiversität, Klimaanpassung und Bäume. '
    || 'Kernleistungen: Baumpflege und Baumschnitt (ZTV-Baumpflege), Verkehrssicherung an Bäumen, '
    || 'Baumkontrollen nach FLL-Baumkontrollrichtlinie, Baumgutachten und artenschutzfachliche Begleitung an Bäumen, '
    || 'Baumpflanzungen und Ersatzpflanzungen inkl. Fertigstellungs- und Entwicklungspflege, Baumbewässerung, '
    || 'ökologische Pflanzungen (insektenfreundliche Stauden- und Gehölzpflanzungen, Wildblumenwiesen, Miyawaki/Tiny Forests), '
    || 'Habitatstrukturen, ökologische Aufwertung von Grünflächen und Straßenbegleitgrün, Entsiegelung und Schwammstadt-Begrünung, '
    || 'ökologischer Neubau von Grünflächen, Konzepte und Monitoring für Biodiversität und Klimaanpassung. '
    || 'Region: Berlin und Brandenburg. Zielkunden: Bezirksämter, Senatsverwaltungen, Kommunen, Landesbetriebe, Stiftungen, '
    || 'Wohnungswirtschaft, Versorger. Kleines, spezialisiertes Team; ideale Losgrößen bis ca. 500.000 EUR. '
    || 'NICHT gewünscht: allgemeine Grünflächen-Unterhaltungspflege (Rasenmahd, Pflege von Außenanlagen, Grundstückspflege, '
    || 'Friedhofs- und Spielplatzpflege), Winterdienst, Reinigung, klassischer Garten-/Landschafts- oder Tiefbau ohne ökologischen '
    || 'Schwerpunkt, forstliche Holzernte, reine Planungs-/Gutachterleistungen ohne Baumbezug, Lieferleistungen.',
  cpv_prefixes = '{7721,7723,773,451127,9071,9072}',
  regionen     = '{DE3,DE4}',
  min_score    = 60,
  updated_at   = now()
WHERE id = 1;
