# BIOME: vom Karten-Feature zum Datenkern

Stand 2026-08-09. Diese Datei beantwortet eine Frage, die beim Lesen des
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
3. **Bestand überführen.** Eine Migration liest die vorhandenen
   `map_features`-Bäume und legt sie im Datenkern an — mit
   `methode_id = 'M-IMPORT-ALTBESTAND'` und ohne erfundene Messhöhe. Wo die
   Altdaten eine Angabe nicht hergeben, bleibt sie leer und wird als fehlend
   angezeigt. Nichts wird geraten, nichts wird gelöscht.
4. **Eine Ansicht.** Karte und Liste sind zwei Sichten auf denselben Bestand,
   nicht zwei Bestände. Der Menüpunkt „Baumkataster" verschwindet wieder in
   „BIOME™", sobald die Karte alles kann.

Punkt 3 braucht eine Entscheidung von Malte, die in `BLOCKED.md` steht: Soll
ein übernommener Katasterwert als „in 1,30 m gemessen" gelten oder als
„Messhöhe unbekannt"? Davon hängt ab, ob Altwerte mit neuen Messungen
vergleichbar sind.

## Warum überhaupt ein neuer Datenkern

Weil `properties` als JSON-Feld genau die Regeln nicht durchsetzen kann, an
denen BIOME gemessen wird. Ein Bodenwert ohne Entnahmetiefe, ein Artnachweis
ohne Erfassungsmethode, eine Maßnahme ohne Artenschutzprüfung, eine
Zustandsstufe ohne belegte Quelle — im JSON-Feld ist all das speicherbar, im
Datenkern nicht. `fixtures/regeltests.sql` weist das an 31 Prüfungen nach.
