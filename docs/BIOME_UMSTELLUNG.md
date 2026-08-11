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
| `MapPage.jsx`, `FeaturePanel.jsx` | Stammform ist dreiwertig statt einer Ankreuzbox. „Nicht angekreuzt" hieß zugleich „einstämmig" und „niemand hat nachgesehen", und die Schutzschwelle sprang stillschweigend auf 80 cm. Jetzt: nicht erhoben / einstämmig / mehrstämmig, bei mehrstämmig zusätzlich der Umfang des stärksten Stamms |
| dito | Ist die Schwelle nicht bestimmbar, steht das da — statt einer gerechneten Zahl auf geratener Grundlage |
| `MapPage.jsx` | `compressImage` war nicht importiert; der Fehler lief in einen leeren `catch`, dadurch wurde jedes Drohnenbild ungedrosselt hochgeladen |
| `index.html` | Zoom war gesperrt (`user-scalable=no`) — WCAG 1.4.4 |
| `ThemeContext.jsx` | Gedämpfter Text erreichte in beiden hellen Themes nur 4,07:1 statt 4,5:1 |
| `ui.css` | Fokusring unterschritt in hellen Themes die 3:1 aus WCAG 1.4.11 |
| `Layout.jsx` | Inhaltsbereich ist jetzt eine `main`-Landmarke |

## Der Umbau der Oberfläche, 2026-08-10

Malte: „wir sollten uns an den Vorgaben von Google Earth orientieren und das
ganze Interface danach umbauen, sodass es viel übersichtlicher wird."

Die Vorgaben sind nicht aus dem Gedächtnis übernommen, sondern recherchiert und
belegt: `refs/design/google-earth.md`, 35 Einträge, 49 abgerufene Quellen, jede
mit HTTP-Status und wörtlichem Zitat. Der Abschnitt „Nicht zugänglich" nennt,
was nicht zu holen war — unter anderem existiert zur Knowledge Card **keine
einzige Maßangabe**, und `m3.material.io` liefert nur ein leeres
JavaScript-Gerüst. Wo BIOME eine Zahl setzt, die Google nicht dokumentiert,
steht das im Code an der Stelle.

**Die tragende Vorgabe ist GE-02, die Dreiteilung mit harten Rollen:**

| Fläche | Rolle | Wörtlich belegt |
|---|---|---|
| links | **Karteninhalt** — was ist geladen, was ist sichtbar | „Suchen Sie im Bereich Karteninhalt links in Ihrem Projekt nach der Datenebene, die Sie anpassen möchten." |
| Mitte | der Bestand | — |
| rechts | **Inspector** — was ist ausgewählt | „Rechts wird der Inspector geöffnet, in dem Details zu dieser Funktion aus der Datenebene angezeigt werden." |
| unten | **Statusleiste** — Provenienz, permanent | „… um das Datum oder den Zeitraum der Aufnahme der Bilder in der unteren Statusleiste zu sehen." (GE-03) |

Eine Abweichung vom Vorbild ist bewusst: Google führt rechts **zwei**
konkurrierende Flächen, die Knowledge Card (GE-06) und den Inspector (GE-07).
BIOME zieht beides zu einer zusammen. Zwei rechte Panels sind eine Altlast,
kein Vorbild.

**Was der Karteninhalt zeigt:** alle elf Domänen des Datenkerns — auch die
sieben, zu denen nichts erfasst ist. Sie stehen mit „nichts erfasst" da und
sagen im Inspector, warum. Das ist dieselbe Regel wie beim einzelnen Wert: eine
Ebene, die es im Datenmodell gibt, aber nicht in der Liste, ist für den Nutzer
eine Lücke ohne Namen.

**Der wertvollste Fund der Recherche** ist GE-30, die vier KML-Schaltmodi. Sie
lösen ein Problem, das BIOME ohnehin hat: zwei Bodenkennzahlen übereinander
ergeben eine Karte, die zwei verschiedene Dinge gleichzeitig behauptet. Die
Bodengruppe steht deshalb auf `genau_eine`, Fernerkundung auf
`nur_abwaehlbar` (Rasterebenen sind zu schwer, um sie alle einzuschalten). Der
Modus steht **an der Gruppe**, nicht in einer Hilfe — wer nicht weiß, warum
sich zwei Ebenen ausschließen, hält es für einen Fehler.

**Nebenbei geschlossen:** der Sprunglink, den das Verdikt aus Runde 2 als Lücke
benannt hatte („Wer mit der Tastatur arbeitet, tabbt die neunzehn Links der
Navigationsschiene auf jeder Seite erneut durch"). Ohne ihn hätte die neue
Ebenenleiste die Lücke noch vergrößert.

**Nicht übernommen:** Googles deutsche Fassung übersetzt „feature" durchgehend
als „Funktion" („Details zu dieser Funktion"). Gemeint ist das Geoobjekt. In
BIOME heißt es „Objekt".

### Aufräumen, das dazugehörte

Die Seite war ein einzelnes File mit 912 Zeilen, davon eine Komponente mit 588.
Die Herkunftsfunktionen lagen als Closures in ihrem Rumpf — damit war „jede Zahl
führt in zwei Klicks zu ihrer Herkunft" an **diese eine Seite** gebunden, und
der Inspector hätte sie nachbauen müssen. Ein Nachbau weicht ab.

| Neu | Was drin liegt |
|---|---|
| `src/biome/herkunft.js` | die Herkunftsfunktionen, als Bauer über einen Datenstand |
| `src/biome/ui/bausteine.jsx` | `Wert`, `HerkunftsTafel`, `Karte`, `Zeile`, Tokens |
| `src/biome/ui/Karteninhalt.jsx` | der Ebenenbaum mit Schaltmodi |
| `src/biome/ui/Inspector.jsx` | die rechte Fläche, für Ebene und Objekt |
| `src/biome/ui/Statusleiste.jsx` | die untere Leiste |
| `src/biome/ebenen.js` | der Ebenenkatalog aus dem Datenstand |

Liste und Inspector zeigen dieselben Werte, weil es dieselben Bauteile sind —
nicht, weil zwei Stellen dasselbe tun sollen.

### Nachtrag am selben Tag: der Umbau war unsichtbar

Malte: „Also die biome Plattform sieht immer noch genauso aus wie vorher."

Er hatte recht, und der Fehler lag in der Zuordnung. Der Menüpunkt **BIOME™**
zeigte auf `/map` — die alte Karte, die der Umbau nicht angefasst hatte. Die
neue Oberfläche lag unter **Baumkataster**. Wer BIOME öffnete, sah nichts
Neues, und der Bericht davor hatte von „dem ganzen Interface" gesprochen,
obwohl es eine von zwei Oberflächen war und nicht die mit dem Produktnamen.

**Aufgelöst so:** Karte und Bestand sind jetzt zwei **Ansichten derselben
Oberfläche**, umschaltbar im Kopf, ohne Seitenwechsel. Links, rechts und unten
bleiben dieselben Flächen — genau darin liegt der Sinn der Dreiteilung.

| Weg | öffnet mit |
|---|---|
| `/biome` (Menü „BIOME™") | Karte |
| `/map` | Karte — der alte Weg funktioniert weiter |
| `/biome/baeume` (Menü „Baumkataster") | Bestand |
| `/karte-vollbild` | die nackte Karte ohne BIOME-Rahmen, für `/earth` |

Die Karte bringt eine eigene linke Seitenleiste mit; in der Schale ist sie
abgeschaltet (`MapPage`-Eigenschaft `ohneSeitenleiste`), weil der Bereich
Karteninhalt links diese Rolle übernimmt.

### Was am Umbau noch fehlt

**Die Karte liest weiterhin aus `map_features`, der Bestand aus dem Datenkern.**
Das ist der eigentliche Rest von Schritt 4 unten. Die Oberfläche verschweigt es
nicht: über der Karte steht, dass für dort erfasste Bäume keine Korrekturkette
und keine Pflichtangabe von Messhöhe, Verfahren und Person gilt.

Ebenfalls offen: die Bedienelemente aus der alten Kartenleiste (Projektwahl,
Kachelebenen, Sensoren) gehören in den Bereich Karteninhalt. Solange sie dort
fehlen, ist die Kartenansicht in der Schale funktionsärmer als
`/karte-vollbild`.

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

## Nachtrag 2026-08-10 — zwei Angaben, die es nicht gab

Der Methoden-Critic hat in Runde 3 zwei Stellen gefunden, an denen die
Oberfläche etwas behauptete, das im Datenbestand nicht vorkam.

**„± 3 m" hinter jeder Koordinate.** Die Zahl stand in der Ground Truth und
wurde durchgereicht. Belegt war sie nicht: `00-standort-geodaten.md` hält unter
DATUM-ETRS89 wörtlich fest, „eine konkrete Meterangabe ist aus dieser Quelle
nicht belegbar", und QUAL-LAGE verlangt zusätzlich die Bezugsebene — Einzelobjekt,
Objektart oder Datensatz —, weil sonst nicht erkennbar ist, worüber gemittelt
wurde.

Der Wert ist entfernt, nicht umformuliert. Damit er nicht wiederkommt, ist die
Bezugsebene seit `20260810_biome_lagegenauigkeit_und_mehrstaemmigkeit.sql` eine
Spalte mit Prüfbedingung: eine Meterangabe ohne sie ist nicht speicherbar, in
drei Tabellen.

**Mehrstämmigkeit gab es gar nicht.** BAUM-BE-06 schützt mehrstämmige Bäume,
„wenn mindestens einer der Stämme einen Mindestumfang von 50 cm aufweist". Der
Datenkern kannte weder das Merkmal noch Einzelstämme, und `schutzschwelleErreicht()`
nahm deshalb stillschweigend Einstämmigkeit an und rechnete gegen 80 cm. Neu:
`biome_baum.mehrstaemmig` (dreiwertig, ohne Vorgabewert), `biome_baum_messung.stamm_nr`
und die Sicht `v_biome_baum_staerkster_stamm`. Ist die Stammform nicht erhoben,
rechnet BIOME nicht, sondern sagt, was fehlt.

## Nachtrag 2026-08-10, zweite Runde — drei Schlüssel zeigten woandershin

Der Methoden-Critic hat gegen den Stand nach dem ersten Nachtrag erneut mit
`incumbent` geurteilt. Der schwerste Befund war keiner der Darstellung, sondern
der Daten.

**Drei von fünf Taxonschlüsseln waren erfunden.** Am belegten Endpunkt selbst
nachgeprüft, nicht dem Critic geglaubt:

| stand an | Kennung | ist tatsächlich | richtig wäre |
|---|---|---|---|
| *Acer platanoides* L. | 3189866 | *Acer negundo* L. | 3189846 |
| *Betula pendula* Roth | 5332048 | *Betula procurva* subsp. *schugnanica*, SYNONYM | 5331916 |
| *Platanus × hispanica* | 5361896 | *Ficus trigonata* L., Moraceae | 7400250 |

Die beiden richtigen Schlüssel waren genau die, die im Register wörtlich
abgedruckt stehen. Die drei falschen waren die, die dort fehlen — sie sahen aus
wie Referenzwerte, ohne je aus einer Auflösung zu stammen.

Auffallen konnte das nicht, weil der Datensatz nichts mitführte, woran sich
eine Auflösung erkennen lässt. BAUM-INT-14 verlangt genau das: „Ein Treffer
ohne diese beiden Werte ist nicht überprüfbar." Seit
`20260810_biome_taxon_nachweis.sql` ist ein `taxon_id` ohne Quelle,
Trefferqualität, Trefferart und Abrufdatum nicht mehr speicherbar.

**Vier weitere Befunde, alle behoben:**

| Was dastand | Warum es weg musste |
|---|---|
| „Vor der Durchführung ist die Artenschutzprüfung nach § 44 BNatSchG erforderlich" | Das Wort kommt im Register nirgends vor. § 44 enthält Verbote, keinen Verfahrensschritt, und das Register verbietet BIOME ausdrücklich Aussagen zu Verfahrensschritten. Ersetzt durch die wörtlich belegte Sperrfrist aus § 39 Abs. 5 samt Verkehrssicherheits-Ausnahme. |
| „Auswertungen, Sensorwerte und Fernerkundung können sie nicht ersetzen" | Beide Quellen sagen, was **genügt**, keine sagt, was nicht genügt; Fernerkundung kommt in keiner vor. Der Satz steht jetzt getrennt und beschriftet als Festlegung von LUMA — er ist wahr als Aussage über unser Produkt, nicht als fachliche Feststellung. |
| `CRS;EPSG:4326` im Export | CRS-ID schreibt den HTTP-URI vor, ausdrücklich „für Exporte". |
| B-011: `Messhöhe cm = kein Wert erfasst` | Die Oberfläche zeigt für denselben Baum 130 cm. Die Datei behauptete nach ihrer eigenen Legende ein Fehlen, das es nicht gibt. |

Dazu aus den nicht blockierenden Notizen: der Rang der Roloff-Quelle steht
jetzt an der Stufe („Verfahrensvorschlag des Urhebers, keine Norm"), die
Ensemble-Grenze an der Koordinate, „Stand" heißt „Stichtag", leere Zellen im
Export heißen „kein Wert erfasst", und bei einem mehrstämmigen Baum heißt die
Spalte „Stärkster Stamm" statt „Stammumfang" — zwei Bezugsgrößen mit zwei
Rechtsschwellen gehören nicht unter dieselbe Überschrift.

**Offen und benannt:** Die vom Critic genannte größte Lücke ist eine
Erfassungslücke, keine Beleglücke. BAUM-DE-12 liefert für Entwicklungsphase,
Sicherheitserwartung und Zustand abgeschlossene, wörtlich belegte Wertelisten;
der Datenkern führt sie nicht. Solange das so ist, kann BIOME kein
Regelintervall ableiten.

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
