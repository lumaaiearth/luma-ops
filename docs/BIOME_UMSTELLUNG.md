# BIOME: vom Karten-Feature zum Datenkern

Stand 2026-08-09, Datenkern in Betrieb. Diese Datei beantwortet eine Frage, die beim Lesen des
Repositories sofort aufkommt: Es gibt jetzt zwei Orte, an denen ein Baum leben
kann. Das ist ein Zwischenzustand, kein Entwurf.

## Wo BIOME heute steht

**Bestehend, seit Langem in Betrieb:** `src/pages/MapPage.jsx` (die Karte, im
Menü „BIOME™") mit `src/components/FeaturePanel.jsx`. Ein Baum ist dort eine
Zeile in `map_features` mit `feature_type = 'tree'`; alle Fachangaben liegen
als freies JSON in `properties`. Es gibt keine Baumtabelle, keine
Kontrolltabelle, keine Messtabelle, keine Historie. Eine Korrektur überschreibt
den alten Wert.

**Neu seit dem 2026-08-09:** der Datenkern (`biome_*`, 38 Tabellen, elf
Domänen) und darauf die Ansicht `src/pages/BiomeBaeumePage.jsx`
(Menü „Baumkataster").

## Was am bestehenden Modul schon geändert wurde

Nicht neu gebaut, sondern am Bestand:

| Wo | Was |
|---|---|
| `MapPage.jsx`, `FeaturePanel.jsx` | Vitalitätsskala 0–4 entfernt und durch die belegten Roloff-Stufen VS 0–3 plus S und K ersetzt, mit sichtbarer Quelle |
| dito | Auswahlliste „Verkehrssicherheit" ersatzlos entfernt — kein Dokument deckt sie, und eine Plattform stellt keine Verkehrssicherheit fest |
| dito | EPS-Befallsstärke entfernt, an ihre Stelle tritt der Befund im Freitext |
| dito | Messhöhe des Stammumfangs von 1 m auf 1,30 m berichtigt, Sonderregel bei tiefem Kronenansatz ergänzt, BHD hat jetzt ein Messhöhenfeld |
| dito | Schutzstatus wird nicht mehr von Hand gesetzt, sondern aus dem Umfang abgeleitet und als „berechnet" gekennzeichnet |
| dito | Beschriftungen „FLL-Daten" und „Alle FLL-Felder" entfernt |
| `MapPage.jsx` | `compressImage` war nicht importiert; der Fehler lief in einen leeren `catch`, dadurch wurde jedes Drohnenbild ungedrosselt hochgeladen |
| `index.html` | Zoom war gesperrt (`user-scalable=no`) — WCAG 1.4.4 |
| `ThemeContext.jsx` | Gedämpfter Text erreichte in beiden hellen Themes nur 4,07:1 statt 4,5:1 |
| `ui.css` | Fokusring unterschritt in hellen Themes die 3:1 aus WCAG 1.4.11 |
| `Layout.jsx` | Inhaltsbereich ist jetzt eine `main`-Landmarke |

## Was noch aussteht: die Zusammenführung

Die Karte schreibt weiterhin nach `map_features.properties`. Solange das so
ist, gilt für dort erfasste Bäume nichts von dem, was der Datenkern erzwingt:
keine Append-only-Historie, keine Korrekturkette, keine Pflichtangabe von
Messhöhe, Methode und Person, keine registrierte Zustandsskala.

**Die Reihenfolge, in der das aufgelöst wird:**

1. **Lesen umstellen.** `FeaturePanel` liest die Baumangaben aus dem Datenkern,
   sobald es für den Baum einen `biome_baum`-Datensatz gibt, sonst weiter aus
   `properties`. Beide Wege zeigen dieselbe Herkunftstafel.
2. **Schreiben umstellen.** `TreeQuickForm` und das Vollformular legen
   `biome_baum` plus `biome_baum_messung` an statt `properties` zu füllen. Ab
   hier entsteht kein neuer Altbestand mehr.
3. **Bestand überführen.** ✔ Erledigt:
   `supabase/migrations/20260810_biome_altbestand_uebernahme.sql`.

   Die Migration überführt die **Identität** der Altbäume in `biome_baum`
   (Nummer, Art, Lage) und legt ihre **Fachangaben** wörtlich in
   `biome_altbestand_baum` ab — außerhalb des Nachweiskerns.

   Warum getrennt: Die Altdaten haben zu keinem Wert eine Methode, eine
   Messhöhe oder eine Person, und ihre Zustandsstufen stammen aus den
   entfernten Skalen. Sie in den Nachweiskern zu schreiben hieße, das
   Fehlende zu erfinden — in genau der Tabelle, deren Zweck es ist, keine
   erfundenen Werte zu enthalten. Also: Identität ja, Werte nein.

   Verloren geht dabei nichts. Auch betrieblich wichtige Altangaben bleiben
   lesbar — bei `B-0001` etwa `verkehrssicherheit = "gefaellung"` —, nur eben
   als Altangabe ohne Verfahren und ohne Person. `v_biome_baum_altangaben`
   trennt sie nach „unbelegte Stufe" und „Zahl ohne Verfahren", damit die
   Oberfläche beides kennzeichnen kann.

   Geprüft mit 17 Regeltests (`fixtures/regeltests-altbestand.sql`): nichts
   erfunden, nichts verloren, `map_features` unangetastet, rücknehmbar,
   wiederholbar.
4. **Eine Ansicht.** Karte und Liste sind zwei Sichten auf denselben Bestand,
   nicht zwei Bestände. Der Menüpunkt „Baumkataster" verschwindet wieder in
   „BIOME™", sobald die Karte alles kann.

Die Entscheidung aus `BLOCKED.md` — gilt ein übernommener Katasterwert als
„in 1,30 m gemessen" oder als „Messhöhe unbekannt"? — ist damit **nicht
vorweggenommen**. Fällt sie auf „1,30 m", kann eine spätere Migration die
Altwerte gezielt in echte Messungen überführen; bis dahin stehen sie als das
da, was sie sind.

## Angewendet am 2026-08-09

Beide Migrationen laufen auf der Produktionsdatenbank
(Supabase-Projekt `eqwoyfsfyohtcibithak`). Nachgeprüft:

| Prüfung | Ergebnis |
|---|---|
| `biome_*`-Tabellen | 39 (38 Datenkern + `biome_altbestand_baum`) |
| davon mit Row Level Security | 39 |
| Append-only-Trigger | 11 |
| Sichten `v_biome_*` | 7 |
| Übernommene Bäume | 2 — B-0001 *Liquidambar styraciflua*, B-0002 *Malus spec.* |
| Messungen, Bewertungen, Kontrollen aus Altdaten | 0, 0, 0 |
| `taxon_quelle`, `gepflanzt_jahr`, `lagegenauigkeit_m` der Altbäume | jeweils NULL — nichts erfunden |
| `map_features` mit `feature_type='tree'` | unverändert 2 |

Was Supabase gespeichert hat, ist byteweise die Repo-Datei: die md5-Summen der
Migrationstexte in `supabase_migrations.schema_migrations` stimmen mit denen der
Dateien überein.

**Die Regeln greifen auch in der Produktion**, nicht nur auf dem Prüfstand. In
einer zurückgerollten Transaktion geprüft:

- `UPDATE` auf `biome_baum_messung` — abgewiesen
- `DELETE` auf `biome_baum_messung` — abgewiesen
- Stammumfang ohne Messhöhe — abgewiesen
- Messwert mit einer Methode der Erfassungsart `modell` — abgewiesen

Danach kontrolliert: kein Prüfdatensatz zurückgeblieben.

## Warum überhaupt ein neuer Datenkern

Weil `properties` als JSON-Feld genau die Regeln nicht durchsetzen kann, an
denen BIOME gemessen wird. Ein Bodenwert ohne Entnahmetiefe, ein Artnachweis
ohne Erfassungsmethode, eine Maßnahme ohne Artenschutzprüfung, eine
Zustandsstufe ohne belegte Quelle — im JSON-Feld ist all das speicherbar, im
Datenkern nicht. `fixtures/regeltests.sql` weist das an 31 Prüfungen nach.
