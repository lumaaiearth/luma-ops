# Standards-Register — Bäume: Kataster, Zustand, Kontrolle

> Stand: 2026-08-09. Nur frei zugängliche, wörtlich belegte Quellen.
> Regel: Was hier nicht gedeckt ist, darf die BIOME-Oberfläche nicht anbieten.
>
> Abrufhinweis für Nachprüfungen: Die Hosts `gdi.berlin.de` und `fbinter.stadt-berlin.de`
> ketten auf die öffentliche Wurzel „Telekom Security TLS RSA Root 2023“, die im
> Container-CA-Bundle fehlt. Abruf daher mit
> `curl --cacert <(cat /root/.ccr/ca-bundle.crt https://curl.se/ca/cacert.pem)`.
> Ohne das schlägt jeder Zugriff mit TLS-Fehler 60 fehl — das ist kein Ausfall der Quelle.

## Gedeckte Definitionen

### BAUM-BE-01 · Berliner Baumbestand — Dienstidentität, Lizenz, Objektklassen
- **Herausgeber:** Senatsverwaltung für Mobilität, Verkehr, Klimaschutz und Umwelt Berlin (Datensatzseite); Diensteanbieter: GDI Berlin
- **Quelle:** https://daten.berlin.de/datensaetze/baumbestand-berlin-wfs-48ad3a23 · https://gdi.berlin.de/services/wfs/baumbestand?request=GetCapabilities&service=WFS
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (aus der WFS-2.0.0-Capabilities, `ows:ServiceIdentification`):
  „<ows:Title>Baumbestand Berlin</ows:Title>"
  „<ows:Abstract>Die Daten umfassen Straßenbäume und einen Teil der Bäume in Grünanlagen.</ows:Abstract>"
  „<ows:Fees>Für die Nutzung der Daten ist die Datenlizenz Deutschland - Zero - Version 2.0 anzuwenden. Die Lizenz ist über https://www.govdata.de/dl-de/zero-2-0 abrufbar.</ows:Fees>"
  „<ows:AccessConstraints>Es gelten keine Zugriffsbeschränkungen.</ows:AccessConstraints>"
- **Wörtlich** (FeatureTypeList):
  „<wfs:Name>baumbestand:strassenbaeume</wfs:Name>" · „<wfs:Title>Baumbestand Berlin - Straßenbäume</wfs:Title>" · „<wfs:Abstract>Straßenbäume mit Angaben zur Baumart, Adresse, Pflanzjahr, Höhe, etc. sowie Straßenbäume ohne Sachdaten.</wfs:Abstract>" · „<wfs:DefaultCRS>urn:ogc:def:crs:EPSG::25833</wfs:DefaultCRS>"
  „<wfs:Name>baumbestand:anlagenbaeume</wfs:Name>" · „<wfs:Title>Baumbestand Berlin - Anlagenbäume</wfs:Title>" · „<wfs:Abstract>Anlagenbäumen mit Angaben zur Baumart, Adresse, Pflanzjahr, Höhe, etc. sowie Anlagenbäume ohne Sachdaten.</wfs:Abstract>"
- **Deckt in BIOME:**
  - Zwei und nur zwei Objektklassen für Berlin: `strassenbaeume`, `anlagenbaeume`.
  - Lagebezug: EPSG:25833 (ETRS89 / UTM Zone 33N) als Default-CRS des Dienstes. Geometrie ist ein Punkt (`gml:PointPropertyType`, Feld `geom`).
  - Lizenz der Bezugsdaten: dl-de/zero-2-0 → Weiterverwendung und Veränderung ohne Namensnennungspflicht zulässig.
  - Belastbare Abrufparameter: `outputFormat=application/json` ist zulässig (in `GetFeature` gelistet), `CountDefault` = 1000000, Paging über `STARTINDEX`, `resultType=hits` für reine Zählungen.
- **Deckt ausdrücklich nicht:** Bäume außerhalb dieser zwei Klassen; jede Aussage über Aktualität einzelner Datensätze (siehe BAUM-BE-05); Vollständigkeit.

### BAUM-BE-02 · Attributschema Straßenbäume — vollständige Feldliste
- **Herausgeber:** GDI Berlin (WFS `baumbestand`)
- **Quelle:** https://gdi.berlin.de/services/wfs/baumbestand?service=WFS&version=2.0.0&request=DescribeFeatureType&typeNames=baumbestand:strassenbaeume
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (XSD, Feldname · `xsd:type` · `xsd:documentation`, vollständig und in Schemareihenfolge):

  | Feldname | Typ | `xsd:documentation` (wörtlich) | minOccurs / nillable |
  |---|---|---|---|
  | `gisid` | `xsd:string` | „Technischer Schlüssel" | 1 / false |
  | `pitid` | `xsd:string` | „PITID" | 0 / true |
  | `standortnr` | `xsd:string` | „Baum Nr." | 0 / true |
  | `kennzeich` | `xsd:string` | „Objektnummer" | 0 / true |
  | `namenr` | `xsd:string` | „Objektname" | 0 / true |
  | `art_dtsch` | `xsd:string` | „Baumart (Deutsch)" | 0 / true |
  | `art_bot` | `xsd:string` | „Baumart (Botanisch)" | 0 / true |
  | `gattung_deutsch` | `xsd:string` | „Gattung (Deutsch)" | 0 / true |
  | `gattung` | `xsd:string` | „Gattung" | 0 / true |
  | `art_gruppe` | `xsd:string` | „Baumartgruppe" | 0 / true |
  | `strnr` | `xsd:string` | „Straßennummer" | 0 / true |
  | `strname` | `xsd:string` | „Straße" | 0 / true |
  | `hausnr` | `xsd:string` | „Hausnummer" | 0 / true |
  | `zusatz` | `xsd:string` | „Hausnummer Zusatz" | 0 / true |
  | `pflanzjahr` | `xsd:string` | „Pflanzjahr" | 0 / true |
  | `standalter` | `xsd:double` | „Standalter" | 0 / true |
  | `kronedurch` | `xsd:double` | „Krone Durchmesser in m" | 0 / true |
  | `stammumfg` | `xsd:int` | „Stamm Umfang in cm" | 0 / true |
  | `baumhoehe` | `xsd:double` | „Baumhöhe in m" | 0 / true |
  | `eigentuemer` | `xsd:string` | „Eigentümer" | 0 / true |
  | `bezirk` | `xsd:string` | „Bezirk" | 0 / true |
  | `geom` | `gml:PointPropertyType` | (keine Dokumentation) | 0 / true |

- **Deckt in BIOME:**
  - **Einheiten, amtlich benannt:** Stammumfang in **cm** (ganzzahlig, `xsd:int`); Kronendurchmesser in **m**; Baumhöhe in **m**. Diese drei Einheiten sind wörtlich belegt und dürfen so in der Oberfläche stehen.
  - **Identität:** `gisid` ist das einzige Pflichtfeld (`minOccurs=1`, `nillable=false`) und damit der einzige belegte Primärschlüssel. `pitid`, `standortnr`, `kennzeich` sind optional und dürfen nicht als Schlüssel dienen.
  - **Adresse:** getrennte Felder `strnr` / `strname` / `hausnr` / `zusatz`. `hausnr` ist **Text**, nicht Zahl — reale Werte wie „gü.111/113" (gegenüber) kommen vor.
  - **Taxonomie im Quelldatensatz:** vier getrennte Namensfelder (`art_dtsch`, `art_bot`, `gattung_deutsch`, `gattung`) plus Grobklasse `art_gruppe`.
- **Deckt ausdrücklich nicht:**
  - **Es gibt in diesem Datensatz kein Feld für Vitalität, Zustand, Schadstufe, Kontrolldatum, Kontrollintervall, Maßnahme, Baumscheibe, Bewässerung oder Fotos.** Jede solche Kennzahl in BIOME ist eine BIOME-eigene Erhebung und darf nicht als „Berliner Katasterwert" ausgegeben werden.
  - Die Einheit von `standalter` ist **nicht** dokumentiert (nur „Standalter"). Siehe BAUM-BE-04.

### BAUM-BE-03 · Attributschema Anlagenbäume — Abweichung zu den Straßenbäumen
- **Herausgeber:** GDI Berlin
- **Quelle:** https://gdi.berlin.de/services/wfs/baumbestand?service=WFS&version=2.0.0&request=DescribeFeatureType&typeNames=baumbestand:anlagenbaeume
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:** Die Feldliste lautet, in Schemareihenfolge: `gisid`, `pitid`, `standortnr`, `kennzeich`, `namenr`, `art_dtsch`, `art_bot`, `gattung_deutsch`, `gattung`, `art_gruppe`, `pflanzjahr`, `standalter`, `kronedurch`, `stammumfg`, `baumhoehe`, `eigentuemer`, `bezirk`, `geom`. Die `xsd:documentation`-Texte sind wortgleich mit BAUM-BE-02 („Technischer Schlüssel", „Baum Nr.", „Objektnummer", „Objektname", „Baumart (Deutsch)", „Baumart (Botanisch)", „Gattung (Deutsch)", „Gattung", „Baumartgruppe", „Pflanzjahr", „Standalter", „Krone Durchmesser in m", „Stamm Umfang in cm", „Baumhöhe in m", „Eigentümer", „Bezirk").
- **Deckt in BIOME:** Anlagenbäume tragen **kein** `strnr`, `strname`, `hausnr`, `zusatz`. Ein gemeinsames BIOME-Baummodell muss die Adressfelder daher optional führen; ein Pflichtfeld „Straße" wäre für Anlagenbäume nicht befüllbar.
- **Deckt ausdrücklich nicht:** eine Ortsangabe für Anlagenbäume jenseits von `namenr` (Objektname) und `geom`.

### BAUM-BE-04 · Wertelisten und tatsächliche Belegung (Vollabzug bzw. WFS-Zählung)
- **Herausgeber:** GDI Berlin (Datenabzug), Auswertung im Rahmen dieser Recherche
- **Quelle:** `GetFeature` über `https://gdi.berlin.de/services/wfs/baumbestand` (Vollabzug `typeNames=baumbestand:strassenbaeume`, `propertyName=bezirk,art_gruppe,eigentuemer`, 434.765 Datensätze) sowie `resultType=hits` mit `cql_filter`
- **Abgerufen:** 2026-08-09 (HTTP 200; `"totalFeatures": 434765`, `"timeStamp": "2026-08-09T15:45:20.940Z"`)
- **Wörtlich** (Antwortkopf des Dienstes): „"totalFeatures": 434765" · „"numberMatched": 434765" · „"crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::25833"}}"
- **Wörtlich** (Beispieldatensatz, unverändert aus der GeoJSON-Antwort):
  „"gisid": "00008100_000bbafb", "pitid": "00008100:000bbafb", "standortnr": "93", "kennzeich": "01414", "namenr": "Fritz-Reuter-Allee", "art_dtsch": "Pyramiden-Hainbuche", "art_bot": "Carpinus betulus 'Fastigiata'", "gattung_deutsch": "Hainbuche", "gattung": "Carpinus", "art_gruppe": "Laubbäume", "strnr": "01414", "strname": "Fritz-Reuter-Allee", "hausnr": "gü.111/113", "zusatz": null, "pflanzjahr": "1975", "standalter": 51, "kronedurch": 0, "stammumfg": 115, "baumhoehe": 15, "eigentuemer": "Land Berlin", "bezirk": "Neukölln""
- **Deckt in BIOME:**
  - **`art_gruppe` — abgeschlossene Werteliste** (alle im Vollabzug vorkommenden Werte): `Laubbäume`, `Nadelbäume`, `Obstbäume`, `Großsträucher`, `Sträucher` sowie `null`. Eine BIOME-Auswahlliste darf genau diese fünf Werte plus „ohne Angabe" anbieten.
  - **`bezirk` — abgeschlossene Werteliste** (12 Werte plus `null`): `Charlottenburg-Wilmersdorf`, `Friedrichshain-Kreuzberg`, `Lichtenberg`, `Marzahn-Hellersdorf`, `Mitte`, `Neukölln`, `Pankow`, `Reinickendorf`, `Spandau`, `Steglitz-Zehlendorf`, `Tempelhof-Schöneberg`, `Treptow-Köpenick`.
  - **`eigentuemer`** trägt im gesamten Straßenbaumbestand genau einen Wert: `Land Berlin` (sonst `null`). Ein Eigentümer-Filter ist für diesen Datensatz sinnlos.
  - **Fehlwerte, gezählt am 2026-08-09** (`resultType=hits`, Grundgesamtheit 434.765): `stammumfg IS NULL` = 1.733; `baumhoehe IS NULL` = 65.640; `standalter IS NULL` = 1.701; `pflanzjahr IS NULL` = 1.755; `art_bot IS NULL` = 1.601.
  - **Null-als-Fehlwert-Falle, gezählt:** `kronedurch = 0` = 38.590; `baumhoehe = 0` = 3.305; `stammumfg = 0` = 66. BIOME muss `0` bei diesen drei Feldern als „keine Angabe" behandeln und darf sie nicht in Mittelwerte einrechnen.
  - **Wertebereiche, per Zählabfrage eingegrenzt:** `stammumfg` > 875 cm: 25 Datensätze, > 2000 cm: 0 → Obergrenze liegt zwischen 875 und 2000 cm. `baumhoehe` > 30 m: 216, > 45 m: 0. `kronedurch` > 30 m: 0. `standalter` > 326: 3, > 400: 1. `pflanzjahr` < „1800": 30 Datensätze. Plausibilitätsgrenzen in BIOME dürfen auf diesen Zahlen aufsetzen, aber die Ausreißer nicht stillschweigend abschneiden.
- **Deckt ausdrücklich nicht:**
  - Die **Einheit von `standalter`** ist nicht dokumentiert. Der Beispieldatensatz (`pflanzjahr` 1975, `standalter` 51, Abrufjahr 2026) ist mit „Jahre" vereinbar, aber das ist eine Ableitung, kein Beleg. BIOME darf „Jahre" nur mit Vorbehalt beschriften oder das Alter selbst aus `pflanzjahr` rechnen.
  - Ob `null` bei `bezirk`/`eigentuemer` „unbekannt" oder „nicht zutreffend" bedeutet, ist nirgends definiert.

### BAUM-BE-05 · Was das Berliner Baumkataster (GRIS) abdeckt — und was nicht
- **Herausgeber:** Geoportal Berlin / FIS-Broker (Sachdatenbeschreibung „Baumbestand Berlin")
- **Quelle:** https://fbinter.stadt-berlin.de/fb_daten/beschreibung/sachdaten/baumbestand.html
- **Abgerufen:** 2026-08-09 (HTTP 200; Seite ist Latin-1-kodiert)
- **Wörtlich:**
  „Datenquelle für den Straßen- und Anlagenbaumbestand Berlins im Geoportal ist das Baumkataster des Berliner Grünflächeninformationssystem (GRIS), in dem die Bäume und Grünflächen verwaltet werden, die sich in der Zuständigkeit der bezirklichen Straßen- und Grünflächenämter befinden."
  „Bei den Straßenbäumen handelt es sich um Bäume, die gemäß § 2 Abs. 2 Nr. 3 Berliner Straßengesetz (BerlStrG) als Zubehör der Straße gelten und somit zum öffentlich gewidmeten Straßenland gehören. Somit werden Bäume in Privatstraßen nicht im GRIS Berlin erfasst/verwaltet."
  „Anlagenbäume sind Bäume in öffentlichen Grün- und Erholungsanlagen, die nach dem Grünanlagengesetz gewidmet sind und von den bezirklichen Straßen- und Grünflächenämtern unterhalten werden, sowie teilweise auch Bäume im Bereich anderer öffentlicher Einrichtungen, wie z.B. auf Schulhöfen oder in Kindertagesstätten."
  „Bäume auf privaten Flächen sind im GRIS Berlin nicht erfasst. Als private Flächen zählen auch die von den Berliner Wohnungsbaugesellschaften verwalteten umfangreichen Grünflächen. Ebenso enthält das Kataster in der Regel keine Bäume auf Friedhöfen, Sportanlagen, Flächen von Freibädern und in Waldflächen im Sinne des Landeswaldgesetzes."
  „Zu beachten ist zudem, dass Bäume auch in den öffentlichen Grünanlagen in der Regel nur dann als Einzelbaum im Kataster erfasst sind, wenn diese aus Gründen der Verkehrssicherungspflicht regelmäßig individuell kontrolliert werden müssen."
  „Es gibt also insgesamt deutlich mehr Bäume in Berlin als im GRIS und den daraus abgeleiteten Daten und Karten des Geoportals Berlin dargestellt sind!"
  „Die noch fehlenden Koordinaten der Bäume (Standorte) werden sukzessive im Rahmen der regulären, jährlich stattfinden Baumkontrollen nacherfasst, mit dem Ziel, die Bäume zukünftig vollständig in der Karte abbilden zu können."
  „Zu beachten ist, dass der Baumbestand in der Realität als auch der Datenbestand im Baumkataster laufenden Änderungen unterliegt und die Aktualität und Qualität der Daten eng mit den jeweiligen Bearbeitungskapazitäten in den Bezirken zusammenhängen. Die Angaben im Internet sind nicht rechtsverbindlich."
- **Deckt in BIOME:**
  - Erfassungsmethode/Grundgesamtheit: BIOME darf den Datensatz als „Bäume in Zuständigkeit der bezirklichen Straßen- und Grünflächenämter" beschriften, nicht als „Bäume in Berlin".
  - Der Datensatz ist selbst-deklariert **nicht rechtsverbindlich** — jede BIOME-Ausgabe, die daraus eine Pflicht oder eine Haftungsaussage ableitet, ist nicht gedeckt.
  - Belegte Bezugsfläche der Erfassung von Anlagenbäumen: Einzelbaumerfassung erfolgt in der Regel nur bei Kontrollpflicht aus Verkehrssicherungspflicht.
- **Deckt ausdrücklich nicht:** aktuelle Bestandszahlen (die Seite nennt Stände von Juni 2019 und weicht damit vom heutigen Dienstabzug ab); Aussagen zu Bäumen auf Privatflächen, Friedhöfen, Sportanlagen, Wald.

### BAUM-BE-06 · Stammumfang — amtliche Messhöhe in Berlin: 1,30 m
- **Herausgeber:** Land Berlin, Verordnung zum Schutze des Baumbestandes in Berlin (Baumschutzverordnung – BaumSchVO) vom 11. Januar 1982; Volltext-Wiedergabe in der FAO-Rechtsdatenbank FAOLEX. Zusätzlich Senatsverwaltung für Umwelt, Verkehr und Klimaschutz (Flyer).
- **Quelle:** https://faolex.fao.org/docs/pdf/ger74205.pdf · https://www.berlin.de/sen/uvk/_assets/natur-gruen/stadtgruen/stadtbaeume/baumschutz-im-strassenland/flyer_baumschutz.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (BaumSchVO § 2 Abs. 1, aus dem FAOLEX-PDF):
  „(1) Geschützt sind: 1. alle Laubbäume, 2. die Nadelgehölzart Waldkiefer sowie 3. die Obstbaumarten Walnuss und Türkischer Baumhasel, jeweils mit einem Stammumfang ab 80 cm, gemessen in einer Höhe von 1,30 m über dem Erdboden. Liegt der Kronenansatz unter dieser Höhe, ist der Stammumfang unmittelbar unter dem Kronenansatz maßgebend. Mehrstämmige Bäume sind geschützt, wenn mindestens einer der Stämme einen Mindestumfang von 50 cm aufweist."
  „(3) Nicht geschützt sind 1. Obstbäume mit Ausnahme der in Absatz 1 Nr. 3 genannten Arten, 2. Bäume auf Dachgärten oder in Pflanzencontainern, 3. Bäume in Baumschulen und Gärtnereien, wenn sie gewerblichen Zwecken dienen."
- **Wörtlich** (Senatsflyer „Schutz von Bäumen bei Bauarbeiten im Straßenland"):
  „In Berlin stehen grundsätzlich alle Laubbäume, die einen Stammumfang von mindestens 80 Zentimeter in 1,30 Meter Höhe erreicht haben, unter dem besonderen Schutz der Berliner Baumschutzverordnung. Das betrifft auch die Straßenbäume."
- **Deckt in BIOME:**
  - **Erfassungsmethode Stammumfang:** Messung in 1,30 m Höhe über dem Erdboden; Sonderregel: liegt der Kronenansatz darunter, wird unmittelbar unter dem Kronenansatz gemessen. Ein BIOME-Erfassungsformular für Stammumfang muss diese Messhöhe anzeigen und ein Kennzeichen „abweichend, unter Kronenansatz gemessen" führen.
  - **Mehrstämmigkeit:** BIOME braucht ein Feld für mehrstämmige Bäume, weil die Schutzschwelle dort auf 50 cm je Stamm wechselt.
  - **Schwellenwerte für eine Schutzstatus-Anzeige:** 80 cm (einstämmig, Laubbäume + Waldkiefer + Walnuss + Türkischer Baumhasel), 50 cm (mindestens ein Stamm bei Mehrstämmigkeit). Einheit cm — identisch mit `stammumfg` aus BAUM-BE-02, damit direkt rechenbar.
- **Deckt ausdrücklich nicht:**
  - Diese Messhöhe gilt **rechtlich für den Schutzstatus**, nicht als Vorschrift für Katastererfassung. Ob das GRIS `stammumfg` in genau dieser Höhe erhebt, ist nirgends belegt (siehe „Offene Fragen").
  - Der Text stammt aus einer Wiedergabe (FAOLEX) und dem Senatsflyer, nicht aus der amtlichen Rechtsdatenbank — siehe „Nicht zugänglich". Für rechtsverbindliche Zitate ist die Fassung auf gesetze.berlin.de heranzuziehen.

### BAUM-DE-07 · Brusthöhendurchmesser (BHD) — forstliche Messvorschrift
- **Herausgeber:** Bundesministerium für Ernährung und Landwirtschaft / Thünen-Institut, Aufnahmeanweisung für die vierte Bundeswaldinventur (BWI 2022), 4. Auflage, Juni 2021 (Version 1.40); ergänzend Aufnahmeanweisung BWI³
- **Quelle:** https://www.bundeswaldinventur.de/fileadmin/Projekte/2024/bundeswaldinventur/Downloads/Aufnahmeanweisung_BWI2022_20210629.pdf · https://www.bundeswaldinventur.de/fileadmin/Projekte/2024/bundeswaldinventur/Downloads/Artikel___Verordnungen/BWI_3/AufnahmeanweisungBWI3.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (BWI³, Abschnitt 5.5.8 „Brusthöhendurchmesser" — sauber extrahierbare Textebene):
  „Der Brusthöhendurchmesser wird mit dem Durchmessermaßband auf mm genau ermittelt. Die Messung erfolgt rechtwinklig zur Stammachse. Das Messband ist straff anzuziehen. Lose Rindenteile, Flechten, Moos etc. sind zu entfernen."
  „Die Brusthöhe wird durch Anlegen eines Messstockes ermittelt. Dazu wird dieser fest auf dem Boden aufgesetzt, so dass Auflage und Bodenbewuchs zusammengedrückt werden (Fußpunkt). Bei Stammverdickungen in Brusthöhe wird ober- oder unterhalb der Verdickung gemessen. Die Messhöhe ist zu vermerken. Sie muss zwischen 0,5 m und 2,5 m Höhe liegen."
  „Unter Brusthöhe (1,30 m) gezwieselte Bäume werden wie zwei verschiedene Bäume erfasst."
- **Wörtlich** (BWI 2022, Abschnitt 5.3.8 „Brusthöhendurchmesser (BHD)", S. 57/58 — die PDF-Textebene nutzt pdfTeX-Glyphennamen; die folgenden Zitate sind daraus dekodiert, Trennstriche und Kerning-Leerzeichen bereinigt, Wortlaut unverändert):
  „Der BHD wird mit dem Durchmessermaßband auf mm genau ermittelt. Die Messung erfolgt rechtwinklig zur Stammachse."
  „Die Messhöhe wird in der Erfassungssoftware dokumentiert. Sie muss zwischen 0,5 m und 2,5 m Höhe liegen."
  „Unter Brusthöhe (1,30 m) gezwieselte Bäume werden wie zwei verschiedene Bäume erfasst."
  „Können bei einem Zwiesel nicht beide BHD in der angegebenen Messhöhe gemessen werden, ist pro Stamm der halbe Durchmesser mit dem Umfangmessband zu messen und anschließend zu verdoppeln."
- **Deckt in BIOME:**
  - **Definition „Brusthöhe" = 1,30 m** — in beiden Anweisungen wörtlich in Klammern hinter „Brusthöhe" gesetzt.
  - **Feld BHD:** Einheit mm-genau erfasst, Messung rechtwinklig zur Stammachse.
  - **Pflichtbegleitfeld `messhoehe`:** Die Messhöhe **muss** mitgeführt werden und liegt zwischen 0,5 m und 2,5 m. Ein BIOME-BHD-Feld ohne Messhöhenfeld ist nicht normkonform.
  - **Zwiesel-Regel:** Unter 1,30 m gezwieselte Bäume zählen als zwei Bäume (Datenmodell: zwei Datensätze, nicht ein Datensatz mit zwei Durchmessern).
- **Deckt ausdrücklich nicht:**
  - Diese Vorschrift gilt für die **Waldinventur**, nicht für Stadt-/Straßenbäume. Der Berliner Datensatz führt **Stammumfang in cm** (BAUM-BE-02), nicht BHD. BIOME darf beide nicht in dasselbe Feld schreiben und darf nicht ohne Kennzeichnung zwischen Umfang und Durchmesser umrechnen.
  - Keine Aussage zur Messhöhe für den rechtlichen Baumschutz (dafür BAUM-BE-06).

### BAUM-DE-08 · Kronenverlichtung — amtliche Skala in 5-%-Stufen
- **Herausgeber:** Thünen-Institut für Waldökosysteme, „Leitfaden und Dokumentation zur Waldzustandserhebung in Deutschland", Thünen Working Paper 84
- **Quelle:** https://literatur.thuenen.de/digbib_extern/dn059504.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Teil IV – 5.1.11 „Kronenverlichtung (Nadel-/Blattverlust)"):
  „Die Kronenverlichtung ist als Nadel-/Blattverlust im Boniturbereich im Vergleich zu einem Referenzbaum definiert. Die Kronenverlichtung wird unabhängig von der Ursache des Blattverlustes (dies schließt z.B. auch Schäden durch Insekten ein) eingestuft"
  „Die Kronenverlichtung der Stichprobenbäume wird in 5 %-Stufen eingeschätzt und gemeldet. Diese Stufen sind 0 (0 %), 5 (> 0 bis 5 %), 10 (> 5 bis 10 %) und so weiter."
  „Solange ein Baum noch lebt, wird er nicht mit Nadel-/Blattverlust 100 % beschrieben. Der Wert 100 ist abgestorbenen Bäumen vorbehalten."
- **Wörtlich** (Tab. IV–16 „Aggregationstabelle", Codes und Klassengrenzen, vollständig):
  „0 = 0 %; 5 = > 0 – 5 %; 10 = > 5 – 10 %; 15 = > 10 – 15 %; 20 = > 15 – 20 %; 25 = > 20 – 25 %; 30 = > 25 – 30 %; 35 = > 30 – 35 %; 40 = > 35 – 40 %; 45 = > 40 – 45 %; 50 = > 45 – 50 %; 55 = > 50 – 55 %; 60 = > 55 – 60 %; 65 = > 60 – 65 %; 70 = > 65 – 70 %; 75 = > 70 – 75 %; 80 = > 75 – 80 %; 85 = > 80 – 85 %; 90 = > 85 – 90 %; 95 = > 90 – 95 %; 99 = > 95 – < 100 % (lebend – verbleiben in PCC-Datenbank); 100 = 100 % (tot …)"
- **Wörtlich** (Teil IV – 5.1.12 „Referenzbaum"):
  „Ein lokaler Bezugsbaum oder ein konzeptioneller (imaginärer) Baum wird hier als der beste Baum mit vollständiger Belaubung definiert, der auf einem bestimmten Standort wachsen könnte, unter Berücksichtigung von Faktoren wie Höhe, Breitengrad, Baumalter, den örtlichen Bedingungen und dem sozialen Status. Er hat 0 % Kronenverlichtung."
- **Deckt in BIOME:**
  - **Feld `kronenverlichtung`:** ganzzahliger Code aus der abgeschlossenen Liste {0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99, 100}. Kein Freitext, keine Zwischenwerte, keine Prozent-Schieberegler mit 1er-Schritten.
  - **Semantik der Klassengrenzen:** linksoffen/rechtsgeschlossen (`> x – y %`) außer der Stufe 0.
  - **Sonderregel:** 100 ist ausschließlich toten Bäumen vorbehalten; lebende Extremfälle bekommen 99.
  - **Pflicht-Begleitfeld `referenzbaum`** mit den belegten Codes 1 = „Lokaler/Konzeptioneller Referenzbaum", 2 = „Absoluter Referenzbaum", 3 = „Kombination aus lokalem und absolutem Referenzbaum (deutsche Definition)", 4 = „Kein Referenzbaum". Ohne Referenzbaumangabe ist ein Verlichtungswert nicht interpretierbar.
  - **Erfassungszeitraum:** Der Leitfaden nennt für die WZE „Anfang Juli und Ende August"; eine BIOME-Erhebung außerhalb dieses Fensters ist nicht mit WZE-Werten vergleichbar.
- **Deckt ausdrücklich nicht:**
  - Die Skala ist für **Waldbäume auf Level-I-Stichprobenpunkten** definiert. Eine Übertragung auf Stadtbäume ist durch diese Quelle nicht gedeckt.
  - Der Leitfaden hält ausdrücklich fest, dass in Deutschland die Bildserie von Meining et al. (2007) als Referenz dient — die liegt hier nicht vor, ohne sie ist die Bonitur nicht kalibrierbar.

### BAUM-DE-09 · Schadstufen 0–4 — exakte Klassengrenzen
- **Herausgeber:** Bundesministerium für Landwirtschaft, Ernährung und Heimat (BMLEH), „Ergebnisse der Waldzustandserhebung 2025"; Thünen-Institut, Working Paper 84
- **Quelle:** https://www.bmleh.de/DE/themen/wald/wald-in-deutschland/waldzustandserhebung.html · https://literatur.thuenen.de/digbib_extern/dn059504.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (BMLEH, „Definition der Schadstufen", Tabelle Schadstufe | Verlichtung | Bezeichnung, vollständig):
  „0 | 0-10 % | Ohne Kronenverlichtung"
  „1 | 11-25 % | Warnstufe (schwache Kronenverlichtung)"
  „2 | 26-60 % | Mittelstarke Kronenverlichtung"
  „3 | 61-99 % | Starke Kronenverlichtung"
  „4 | 100 % | Abgestorben"
- **Wörtlich** (BMLEH, Beurteilungsmaßstab):
  „Beurteilungsmaßstab für die Waldzustandserhebung ist die Verlichtung der Baumkronen im Vergleich zu einer voll belaubten bzw. benadelten Krone. 0 % Verlichtung bedeutet eine voll belaubte Krone, 40 % Verlichtung bedeutet: Gegenüber einer voll belaubten Krone fehlen 40 % der Blattmasse bzw. es sind nur 60 % der normalerweise zu erwartenden Blattmasse vorhanden."
- **Wörtlich** (Thünen, Tab. IV–20 „Bewertung der Schadstufen"):
  „Schadstufe 0 ohne sichtbare Schadmerkmale · Schadstufe 1 schwach geschädigt Warnstufe · Schadstufe 2 mittelstark geschädigt · Schadstufe 3 stark geschädigt · Schadstufe 4 abgestorben" (Schadstufen 2 und 3 sind in der Tabelle zusätzlich als „deutlich geschädigt" zusammengefasst)
- **Wörtlich** (Thünen, Tab. IV–19 „Berechnung der kombinierten Schadstufen", Kronenverlichtung × Vergilbung):
  „Kronenverlichtung 0 – 10 % → Vergilbung 0 – 10 %: 0 · 11 – 25 %: 0 · 26 – 60 %: 1 · 61 – 100 %: 2"
  „11 – 25 % → 1 · 1 · 2 · 2"
  „26 – 60 % → 2 · 2 · 3 · 3"
  „61 – 99 % → 3 · 3 · 3 · 3"
  „100 % → 4"
- **Deckt in BIOME:**
  - **Feld `schadstufe`:** Wertebereich 0–4, ganzzahlig, mit den oben wörtlich belegten Bezeichnungen und Klassengrenzen. Die Ableitung aus der Kronenverlichtung ist eindeutig: 0–10 → 0, 11–25 → 1, 26–60 → 2, 61–99 → 3, 100 → 4. BIOME darf diese Ableitung automatisch rechnen.
  - **Aggregat „deutliche Kronenverlichtung"** = Schadstufen 2 + 3 (aus Tab. IV–20). Der BMLEH-Text verwendet dieselbe Sprachregelung („Die Anteile der Schadstufe ‚deutliche Kronenverlichtung' (35 %) und der ‚Warnstufe' (44 %)").
  - **Aggregat „Warnstufe"** = Schadstufe 1 = 11–25 % Kronenverlichtung.
  - Die kombinierte Schadstufe (mit Vergilbung) ist belegt, aber laut Quelle seit 2011 für ICP-Forests-Lieferungen nicht mehr erforderlich — BIOME sollte sie nicht als Standard führen.
- **Deckt ausdrücklich nicht:**
  - Auch dies ist eine **Waldzustands**-Skala. Sie beschreibt Kronenverlichtung, nicht Verkehrssicherheit und nicht Vitalität im Sinne von Roloff (BAUM-DE-10).
  - Keine Aussage über Stadtbäume, Einzelbäume im Straßenland oder über Handlungsempfehlungen je Stufe.

### BAUM-DE-10 · Roloff-Vitalitätsstufen VS 0–3 (plus Sonderstufen S und K)
- **Herausgeber:** Andreas Roloff, TU Dresden; veröffentlicht von der Deutschen Dendrologischen Gesellschaft (DDG) als „Vitalitätsbeurteilung von Champion Trees (Vorschlag)"
- **Quelle:** https://ddg-web.de/files/DDG-Championtrees/ChT-Downloads/Vitalitaetsbeurteilung%20von%20Champion%20Trees.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200, 4 Seiten, PDF)
- **Wörtlich** (Einleitung und alle Stufen, vollständig):
  „Nachfolgend wird eine Kurzbeschreibung für die Vitalitätsbeurteilung von Champion Trees vorgestellt, die sich am etablierten Verfahren der Interpretation von Verzweigungsentwicklung und Kronenstrukturen (ROLOFF 2001) orientiert. Damit wird das längerfristige Wuchspotenzial beurteilt, im Unterschied zur Bewertung der Kronentransparenz („Laubverlust"), die kurzfristige Veränderungen der Blattfläche/Kronendichte erfasst."
  „Folgende Vitalitätsstufen (VS) werden unterschieden (Beurteilung der Oberkrone) (Abb.1):"
  „VS 0 (vollkommen vitale Bäume) — Die Verzweigung ist netzartig und gleichmäßig + dicht, Langtriebe dominieren auch an Seitenachsen, meist gleichmäßige Belaubung ohne größer Kronenlücken."
  „VS 1 (Bäume mit geringfügig verminderter Vitalität) — Aus der Oberkrone ragen spießartige bis längliche Zweigstrukturen heraus, die durch vermindertes Längenwachstum der Hauptachsen mit seitlich (fast) nur noch Kurztrieben bzw. Kurztriebketten zustande kommen. Die Krone wirkt dadurch außen zerfranst."
  „VS 2 (Bäume mit deutlich verminderter Vitalität) — Infolge von Kurztriebbildung nun auch an den Hauptachsen bilden sich im Winter krallenartige äußere Zweigstrukturen mit pinselartiger/büscheliger Belaubung und inneren Kronenlücken. Dieser Zustand kann altersbedingt eintreten und lange anhalten, ohne dass der Baum deshalb absterben muss."
  „VS 3 (Bäume mit stark verminderter Vitalität und absterbenden Hauptachsen) — Verzweigung wie VS 2, jedoch zusätzlich als deutliches Warnsignal mit abtsterbenden Hauptachsen, die Krone zerfällt in Teilkronen. Diese Bäume sind hinsichtlich der Verkehrssicherheit und Lebenserwartung als problematisch einzustufen. Nach baumartgerechten Schnittmaßnahmen kann der Baum mit reduzierter Kronengröße noch längere Zeit leben (abhängig von der Baumart)."
  „Sonder-VS S (Bäume bis 5 Jahre nach größeren Schnittmaßnahmen) — Bei Bäumen nach umfangreichen Schnittmaßnahmen (z.B. Kronen(teil)einkürzung) innerhalb der letzten 5 Jahre ist eine normale Vitalitätsbeurteilung nach VS 0-3 nicht möglich/sinnvoll, da die Verzweigung nach der Schnittmaßnahme gestört und zunächst nicht mehr sinnvoll nutzbar für den Zustand des Gesamtbaumes ist. Nach ca. 5 Jahren ist sie wieder aussagekräftig."
  „Sonder-VS K (Bäume mit gekapptem Stamm oder gekappten Stämmlingen) — … Eine Vitalitätsbeurteilung ist mindestens 10 Jahre nach der Maßnahme nicht mehr sinnvoll, da die Verzweigung vollkommen gestört bzw. beseitigt worden ist und erst wieder neu aufgebaut werden muss."
  „Stammschäden werden gesondert erfasst, sind hierbei nicht berücksichtigt."
- **Deckt in BIOME:**
  - **Antwort auf die Stufenfrage: es sind vier reguläre Stufen, VS 0 bis VS 3 — nicht 0–4.** Dazu kommen zwei Sonderausprägungen, die keine Rangstufen sind: `S` und `K`.
  - **Feld `vitalitaet_roloff`:** Wertebereich {0, 1, 2, 3, S, K}. Ein rein numerisches Feld ist unzureichend; S und K müssen als eigene Ausprägungen darstellbar sein, sonst erzwingt die Oberfläche eine Falschangabe bei frisch geschnittenen oder gekappten Bäumen.
  - **Erfassungsmethode:** Beurteilung **der Oberkrone**, anhand von Verzweigungsentwicklung und Kronenstruktur. Die Winterbeurteilung ist in VS 2 ausdrücklich Teil der Definition („bilden sich im Winter krallenartige äußere Zweigstrukturen").
  - **Abgrenzung, die BIOME anzeigen muss:** Die Roloff-Vitalität misst „das längerfristige Wuchspotenzial", **nicht** die Kronentransparenz/den Laubverlust. Sie ist damit nicht in Kronenverlichtung (BAUM-DE-08) umrechenbar und darf nicht als deren Synonym geführt werden.
  - **Zeitliche Sperren, die BIOME durchsetzen kann:** nach größeren Schnittmaßnahmen 5 Jahre keine reguläre VS-Bewertung; nach Kappung mindestens 10 Jahre keine.
  - **Stammschäden sind ausdrücklich nicht Teil der VS** und brauchen ein eigenes Feld.
- **Deckt ausdrücklich nicht:**
  - Eine Zuordnung von VS-Stufen zu Handlungsempfehlungen, Kontrollintervallen oder Fällentscheidungen. Der Satz zu VS 3 („hinsichtlich der Verkehrssicherheit und Lebenserwartung als problematisch einzustufen") ist eine Einstufung, keine Maßnahmenvorgabe.
  - Baumartspezifische Kalibrierung. Das Dokument verweist auf Abbildungen aus ROLOFF 2001 (Ulmer Verlag), die nicht frei vorliegen — ohne Bildreihe ist die Bonitur nicht kalibrierbar.
  - Der Titel lautet „Vitalitätsbeurteilung von Champion Trees (Vorschlag)". Es handelt sich um eine Kurzbeschreibung des Verfahrens durch den Urheber, nicht um eine Norm.

### BAUM-DE-11 · Regelkontrolle = fachlich qualifizierte Inaugenscheinnahme vom Boden aus
- **Herausgeber:** (a) FLL — Forschungsgesellschaft Landschaftsentwicklung Landschaftsbau e. V., Baumkontrollrichtlinien 2020, frei abrufbare Leseprobe; (b) Bundesarbeitsgemeinschaft Deutscher Kommunalversicherer (BADK) gemeinsam mit dem GALK-Arbeitskreis Stadtbäume, „Musterdienstanweisung für Baumkontrollen zur Überprüfung der Verkehrssicherheit 2021"
- **Quelle:** https://shop.fll.de/de/downloadable/download/sample/sample_id/69/ · https://galk.de/startseite/downloads/send/2-ak-stadtbaeume/711-muster-einer-dienstanweisung-fuer-regelkontrollen-von-baeumen-2021/ (verlinkt von https://galk.de/arbeitskreise/stadtbaeume/themenuebersicht/musterdienstanweisung-fuer-regelkontrollen-von-baeumen/)
- **Abgerufen:** 2026-08-09 (HTTP 200, PDF 9 Seiten / HTTP 200, PDF 5 Seiten)
- **Wörtlich** (FLL-Leseprobe, Abschnitt 5.1 „Grundsätze"):
  „Grundsätzlich bedürfen alle Bäume im Anwendungsbereich dieses Regelwerks einer regelmäßigen Kontrolle, um die Anforderungen an die Verkehrssicherungspflicht zu erfüllen. Hierfür genügen Regelkontrollen in Form von Sichtkontrollen durch fachlich qualifizierte Inaugenscheinnahme vom Boden aus – siehe Abschnitt 5.2."
- **Wörtlich** (Musterdienstanweisung 2021, Abschnitt 3.1):
  „Die Regelkontrolle erfolgt als Sichtkontrolle in Form der „fachlich qualifizierten Inaugenscheinnahme" vom Boden aus. Dabei ist jeder Baum einzeln und von allen Seiten im Kronen-, Stamm- und Wurzelbereich visuell zu kontrollieren."
- **Wörtlich** (Musterdienstanweisung 2021, Abschnitte 2.2, 2.3, 3.4, 5.3):
  „Die Bäume, für die die Stadt/Gemeinde verkehrssicherungspflichtig ist, sind in einem Verzeichnis (z.B. Baumkataster) zu erfassen. Eine Grunderfassung (durch fachlich qualifizierte Inaugenscheinnahme) ist zur Einschätzung des Gefährdungspotenzials zwecks Festlegung der Kontrollintervalle durchzuführen."
  „Regelkontrollen (siehe 3.1.) sind von Personen durchzuführen, die über ausreichende Fachkenntnisse verfügen. Sie müssen insbesondere Schäden und Schadsymptome erkennen können und diese nach Art und Umfang sowie Gefährdungspotenzial einschätzen können."
  „Im Laufe von drei aufeinanderfolgenden Regelkontrollen, sollten die Kontrollen abwechselnd im belaubten und unbelaubten Zustand durchgeführt werden. Jedoch dürfen die Regelkontrollintervalle nicht um mehr als 3 Monate überschritten werden."
  „Ausgefüllte Kontrollunterlagen sind für die Dauer von 5 Jahren, gerechnet vom Tag der letzten Eintragung an, aufzubewahren. Der Nachweis muss so geführt werden, dass er in Streitfällen als Beweismittel für die Erfüllung der den Verantwortlichen obliegenden Sorgfaltspflicht herangezogen werden kann."
- **Deckt in BIOME:**
  - **Erfassungsmethode `regelkontrolle`:** visuelle Sichtkontrolle vom Boden aus, jeder Baum einzeln, von allen Seiten, in den drei Bereichen Krone / Stamm / Wurzel. Ein BIOME-Kontrollformular darf genau diese drei Bereiche als Pflichtabschnitte führen.
  - **Feld `belaubungszustand` bei jeder Kontrolle** mit den zwei belegten Ausprägungen „belaubt" / „unbelaubt", weil der Wechsel über drei aufeinanderfolgende Kontrollen vorgegeben ist.
  - **Toleranzregel für Terminplanung:** Überschreitung des Intervalls um höchstens 3 Monate.
  - **Aufbewahrungsfrist der Kontrollunterlagen: 5 Jahre** ab letzter Eintragung. Das ist eine harte Anforderung an Datenhaltung und Löschkonzept.
  - **Rollenmodell:** Regelkontrolle durch Personen mit ausreichenden Fachkenntnissen; „Eingehende Untersuchungen" (Baumuntersuchung) erfordern laut 2.4 „speziell weiter- und fortgebildete sowie erfahrene Personen". BIOME darf also zwei Rollen unterscheiden, aber keine Zertifikatsstufen behaupten.
  - **Zusatzkontrollen** sind als eigener Vorgangstyp belegt (Abschnitt 3.6: nach extremen Witterungsereignissen, Schadensfällen, erheblichen Veränderungen im Baumumfeld oder erheblichen Eingriffen in den Baum).
- **Deckt ausdrücklich nicht:**
  - Kein Katalog von Schadsymptomen, keine Zustandsstufen, keine Vitalitätsstufen nach FLL — der zugängliche Teil enthält davon nichts (siehe „Nicht zugänglich").
  - Die Musterdienstanweisung ist eine **Muster**vorlage von BADK und GALK, keine Rechtsnorm. BIOME darf sie nicht als „Vorschrift" bezeichnen.

### BAUM-DE-12 · Regel-Kontrollintervalle — vollständige Tabelle
- **Herausgeber:** BADK / GALK-Arbeitskreis Stadtbäume, Musterdienstanweisung 2021, Tabelle 1 (dort ausdrücklich als „den FLL-Baumkontrollrichtlinien entnommene Tabelle" bezeichnet)
- **Quelle:** https://galk.de/startseite/downloads/send/2-ak-stadtbaeume/711-muster-einer-dienstanweisung-fuer-regelkontrollen-von-baeumen-2021/
- **Abgerufen:** 2026-08-09 (HTTP 200, PDF S. 5)
- **Wörtlich** („Tabelle 1: Regel-Kontrollintervalle in Jahren"):
  Zustand „gesund, leicht geschädigt": Reifephase / geringere berechtigte Sicherheitserwartung: „alle 3 Jahre"; Reifephase / höhere: „alle 2 Jahre"; Altersphase / geringere: „alle 2 Jahre"; Altersphase / höhere: „1 x jährlich".
  Zustand „stärker geschädigt": „1 x jährlich" (alle Spalten).
  Jugendphase: „Bei bedarfsgerechter Jungbaumpflege gemäß ZTV-Baumpflege keine gesonderte Regelkontrolle".
  Fußnoten wörtlich: „leicht geschädigt: Schäden, die sich voraussichtlich bis zur nächsten Regelkontrolle (auch bei längeren Kontrollintervallen) nicht auf die Verkehrssicherheit auswirken werden." · „stärker geschädigt: Schäden, die sich voraussichtlich innerhalb eines Jahres nicht auf die Verkehrssicherheit auswirken werden." · „2) Bäume, z.B. an bzw. auf normal und stärker frequentierten Straßen, Wegen, Plätzen und belebten Grünanlagen sowie Spielplätzen, Kindergärten, Kindertagesstätten, Schulen, Sportanlagen." · „3) Bäume, z.B. an bzw. auf schwach frequentierten Wegen, wenig besuchten Grünflächen." · „4) Je nach Baumart alle 2 bis 3 Jahre Schnittmaßnahmen an der Temporären Krone zum Erreichen der Permanenten Krone bzw. des Lichten Raumes. Im Wald und in waldartigen Beständen sind längere Zeitabstände zwischen den Schnittmaßnahmen möglich (z.B. alle 5 bis 10 Jahre)."
- **Wörtlich** (Abschnitt 3.3, Kriterien):
  „Bei der Festlegung des Kontrollintervalls müssen insbesondere folgende Faktoren berücksichtigt werden: Berechtigte Sicherheitserwartung des Verkehrs; Zustand des Baumes; Vitalität, Schäden, Standort, Veränderungen im Baumumfeld; Entwicklungsphase, Alter, Baumart."
  „In begründeten und zu dokumentierenden Fällen können jedoch sowohl längere als auch kürzere Kontrollintervalle möglich sein (z.B. Rußrindenkrankheit, Massaria-Erkrankungen)."
- **Deckt in BIOME:**
  - **Feld `entwicklungsphase`** mit exakt drei belegten Ausprägungen: `Jugendphase`, `Reifephase`, `Altersphase`.
  - **Feld `sicherheitserwartung`** mit exakt zwei belegten Ausprägungen: `geringer`, `höher` — inklusive der wörtlich belegten Beispiellisten für die Einordnung.
  - **Feld `zustand_kontrollrelevant`** mit exakt zwei belegten Ausprägungen: `gesund, leicht geschädigt` und `stärker geschädigt`, jeweils mit der oben zitierten Definition über den Prognosehorizont.
  - **Ableitung `regelintervall_jahre`** aus (Entwicklungsphase × Sicherheitserwartung × Zustand) mit den Werten 3, 2 oder 1 Jahr bzw. „keine gesonderte Regelkontrolle" in der Jugendphase bei bedarfsgerechter Jungbaumpflege. Diese Ableitung ist damit als BIOME-Empfehlung belegbar.
  - **Abweichung nach oben und unten ist zulässig, aber begründungs- und dokumentationspflichtig** — BIOME braucht ein Begründungsfeld, wenn ein Intervall vom abgeleiteten Wert abweicht.
- **Deckt ausdrücklich nicht:**
  - Eine feinere Zustandsskala als die zwei genannten Stufen. Wer in BIOME eine vier- oder fünfstufige „FLL-Zustandsstufe" anbietet, hat dafür keine Quelle.
  - Die Zuordnung von Baumalter oder Stammumfang zu den Entwicklungsphasen. Die Tabelle nennt die Phasen, definiert sie hier aber nicht.

### BAUM-DE-13 · Verkehrssicherungspflicht Baum — Umfang der Überwachung (BGH)
- **Herausgeber:** Bundesgerichtshof, III. Zivilsenat, Urteil vom 6. März 2014 – III ZR 352/13 (amtliche PDF-Veröffentlichung)
- **Quelle:** https://www.bundesgerichtshof.de/SharedDocs/Entscheidungen/DE/Zivilsenate/III_ZS/2013/III_ZR_352-13.pdf?__blob=publicationFile&v=1
- **Abgerufen:** 2026-08-09 (HTTP 200, PDF 10 Seiten)
- **Wörtlich** (Leitsatz):
  „Ein natürlicher Astbruch, für den vorher keine besonderen Anzeichen bestanden haben, gehört auch bei hierfür anfälligeren Baumarten grundsätzlich zu den naturgebundenen und daher hinzunehmenden Lebensrisiken. Eine straßenverkehrssicherungspflichtige Gemeinde muss daher bei gesunden Straßenbäumen auch dann keine besonderen Schutzmaßnahmen ergreifen, wenn bei diesen - wie z. B. bei der Pappel oder bei anderen Weichhölzern - ein erhöhtes Risiko besteht, dass im gesunden Zustand Äste abbrechen und Schäden verursachen können."
- **Wörtlich** (Rn. 7; Zeilenumbrüche und Trennstriche der PDF-Textebene bereinigt):
  „Das gebietet aber nicht die Entfernung aller Bäume aus der Nähe von Straßen und öffentlichen Parkplätzen oder eine besonders gründliche Untersuchung jedes einzelnen Baums. Der Umfang der notwendigen Überwachung und Sicherung kann nicht an dem gemessen werden, was zur Beseitigung jeder Gefahr erforderlich ist; es ist unmöglich, den Verkehr völlig risikolos zu gestalten. Dieser muss gewisse Gefahren, die nicht durch menschliches Handeln entstehen, sondern auf Gegebenheiten der Natur selbst beruhen, als unvermeidlich hinnehmen. Die Behörden genügen daher ihrer Sicherungs- und Überwachungspflicht, wenn sie - außer der stets gebotenen regelmäßigen Beobachtung auf trockenes Laub, dürre Äste, Beschädigungen oder Frostrisse - eine eingehende Untersuchung dort vornehmen, wo besondere Umstände - wie das Alter des Baums, sein Erhaltungszustand, die Eigenart seiner Stellung oder sein statischer Aufbau oder ähnliches - sie dem Einsichtigen angezeigt erscheinen lassen."
- **Wörtlich** (Rn. 8, zur genügenden Kontrollpraxis im entschiedenen Fall):
  „Ihre diesbezüglichen Pflichten hat die Beklagte, die im Sommer 2010 und im Winter 2010/2011 eine Baumkontrolle durchgeführt hat, nicht verletzt."
- **Deckt in BIOME:**
  - **Zweistufiges Kontrollmodell, höchstrichterlich belegt:** (1) stets gebotene *regelmäßige Beobachtung* auf die vier ausdrücklich genannten Merkmale — trockenes Laub, dürre Äste, Beschädigungen, Frostrisse; (2) *eingehende Untersuchung* nur anlassbezogen. BIOME darf diese zwei Vorgangstypen unterscheiden und die vier Merkmale als Pflicht-Checkliste der Regelkontrolle führen.
  - **Abgeschlossene Liste der Anlässe für eine eingehende Untersuchung** (wörtlich, mit Öffnungsklausel „oder ähnliches"): Alter des Baums, Erhaltungszustand, Eigenart seiner Stellung, statischer Aufbau.
  - Diese Kriterien decken die BIOME-Felder `baumalter`, `erhaltungszustand`, `standortbesonderheit`, `statischer_aufbau` als Auslöser einer Eskalation.
- **Deckt ausdrücklich nicht:**
  - Ein Kontrollintervall in Jahren. Das Urteil nennt keinen Turnus; die zwei Kontrollen im entschiedenen Fall sind Sachverhalt, nicht Vorgabe.
  - Die Formulierung „fachkundige Person". Das Urteil spricht von „den Behörden" und vom „Einsichtigen". Die fachliche Qualifikation der kontrollierenden Person ist über BAUM-DE-11 belegt, nicht über dieses Urteil.
  - Eine Aussage zu Bäumen außerhalb der Straßenverkehrssicherungspflicht.

### BAUM-INT-14 · Baumartenname und Taxonomie — GBIF Backbone Taxonomy
- **Herausgeber:** GBIF Secretariat (Global Biodiversity Information Facility)
- **Quelle:** https://api.gbif.org/v1/species/match?name=… · Datensatzmetadaten: https://api.gbif.org/v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (Beispielantwort `GET /v1/species/match?name=Tilia%20cordata`, vollständig):
  „{"usageKey":3152047,"scientificName":"Tilia cordata Mill.","canonicalName":"Tilia cordata","rank":"SPECIES","status":"ACCEPTED","confidence":97,"matchType":"EXACT","kingdom":"Plantae","phylum":"Tracheophyta","order":"Malvales","family":"Malvaceae","genus":"Tilia","species":"Tilia cordata","kingdomKey":6,"phylumKey":7707728,"classKey":220,"orderKey":941,"familyKey":6685,"genusKey":3152041,"speciesKey":3152047,"class":"Magnoliopsida"}"
- **Wörtlich** (zweite Beispielantwort, `name=Quercus robur`):
  „{"usageKey":2878688,"scientificName":"Quercus robur L.","canonicalName":"Quercus robur","rank":"SPECIES","status":"ACCEPTED","confidence":97,"matchType":"EXACT",…,"family":"Fagaceae","genus":"Quercus","species":"Quercus robur",…}"
- **Wörtlich** (Datensatzmetadaten):
  „"title": "GBIF Backbone Taxonomy"" · „"type": "CHECKLIST"" · „"license": "http://creativecommons.org/licenses/by/4.0/legalcode"" · „"doi": "10.15468/39omei"" · „"pubDate": "2023-08-28T00:00:00.000+00:00""
  Zitiervorschlag wörtlich aus der API: „GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset https://doi.org/10.15468/39omei accessed via GBIF.org on 2026-08-09."
  Beschreibung wörtlich: „The GBIF Backbone Taxonomy is a single, synthetic management classification with the goal of covering all names GBIF is dealing with." · „It is updated regulary through an automated process in which the Catalogue of Life acts as a starting point also providing the complete higher classification above families."
- **Deckt in BIOME:**
  - **Referenzsystem für Baumartennamen:** GBIF Backbone Taxonomy, frei nutzbar unter CC BY 4.0, mit DOI 10.15468/39omei.
  - **API-Endpunkt für die Namensauflösung:** `GET https://api.gbif.org/v1/species/match?name=<Name>` — ohne Schlüssel, ohne Login abrufbar.
  - **Feldbelegung in BIOME, direkt aus der Antwort:** `art_key` ← `usageKey`; `art_wissenschaftlich` ← `scientificName` (**inklusive Autorenkürzel**, z. B. „Tilia cordata Mill.", „Quercus robur L."); `art_kanonisch` ← `canonicalName`; `gattung` ← `genus`; `familie` ← `family`; `rang` ← `rank`; `taxon_status` ← `status`.
  - **Qualitätsfelder, die BIOME speichern muss:** `confidence` (0–100) und `matchType` (im Beispiel „EXACT"). Ein Treffer ohne diese beiden Werte ist nicht überprüfbar.
  - **Korrekte Zitierweise eines Namens:** wissenschaftlicher Name mit Autor plus Datensatzzitat in der oben wörtlich belegten Form, mit Abrufdatum.
  - **Anbindung an die Berliner Daten:** `art_bot` aus BAUM-BE-02 ist der Eingabewert für `?name=`. Achtung: Berliner Werte enthalten Sortennamen in Anführungszeichen (Beispiel: „Carpinus betulus 'Fastigiata'") — solche Kultivare sind nicht zwingend im Backbone abgedeckt.
- **Deckt ausdrücklich nicht:**
  - Deutsche Trivialnamen. Die Match-Antwort liefert keine, und die deutschen Namen im Berliner Datensatz (`art_dtsch`, `gattung_deutsch`) sind damit **nicht** normiert. Der Berliner Wert „Berg-Ahorn, Weiss-Ahorn" für *Acer pseudoplatanus* zeigt, dass dort mehrere Namen in einem Feld stehen können.
  - Kultivare/Sorten. Ob und wie GBIF Sortennamen auflöst, wurde nicht geprüft.
  - Der Backbone hat den Stand `pubDate` 2023-08-28; er ist keine tagesaktuelle Nomenklaturquelle.

## Nicht zugänglich

| Norm/Quelle | Warum | Status | Was dadurch in BIOME NICHT belegbar ist |
|---|---|---|---|
| FLL-Baumkontrollrichtlinien 2020 (3. Ausgabe, 54 S.), Volltext | Kostenpflichtig. Shop-Seite abrufbar, Volltext nur nach Kauf: 44,00 € inkl. 7 % MwSt. (Broschüre), 44,00 € (PDF-Download), 66,00 € (Kombipaket). Frei ist nur eine 9-seitige Leseprobe (Vorwort, Inhaltsverzeichnis, Auszug Abschnitt 5.1). Bezugsweg: https://shop.fll.de/de/baumkontrollrichtlinien-richtlinien-fuer-baumkontrollen-zur-ueberpruefung-der-verkehrssicherheit.html, Artikelnummer 10212001 | Produktseite HTTP 200; Leseprobe HTTP 200; Volltext nicht abrufbar | Der Begriff **„FLL-Felder"** als Feldkatalog — es gibt keinen frei belegten Katalog. Ebenso nicht belegbar: Abschnitt 5.2.1 „Faktoren für die Häufigkeit von Baumkontrollen", 5.2.2 „Umfang, Durchführung", 5.2.4 „Weiteres Vorgehen", 5.2.5 „Fachliche Eignung zur Durchführung von Baumkontrollen", 5.2.6 „Dokumentation", 5.4 „Grenzen von Regelkontrollen", 6 „Baumuntersuchungen" und der normative Anhang A „Begriffsbestimmungen" (S. 37–51). Damit sind **Zustands- und Vitalitätsstufen nach FLL nicht belegbar** und dürfen in BIOME nicht angeboten werden. Der Kontrollturnus ist nur über die BADK/GALK-Wiedergabe belegt (BAUM-DE-12), nicht aus der Richtlinie selbst. |
| FLL ZTV-Baumpflege 2017 (6. Ausgabe, 90 S.), Volltext | Kostenpflichtig: 44,00 € (Broschüre), 44,00 € (Download), 66,00 € (Kombipaket). Bezugsweg: https://shop.fll.de/de/ztv-baumpflege-zusaetzliche-technische-vertragsbedingungen-und-richtlinien-fuer-baumpflege-2017-broschuere.html. Frei ist eine 17-seitige „informative Inhaltsübersicht; Keine vollständige Publikation!" | Produktseite HTTP 200; Leseprobe HTTP 200; Volltext nicht abrufbar | Alle Pflegemaßnahmen-Begriffe und ihre Definitionen: Kronenpflege, Lichtraumprofilschnitt, Totholzentfernung, Form- und Pflegeschnitt, Kopfbaumschnitt, Jungbaumpflege, Sofortmaßnahmen. BIOME darf keine Maßnahmen-Auswahlliste als „nach ZTV-Baumpflege" beschriften. Auch der in BAUM-DE-12 zitierte Verweis „bedarfsgerechte Jungbaumpflege gemäß ZTV-Baumpflege" bleibt inhaltlich unbelegt. |
| FLL-Baumuntersuchungsrichtlinien 2013 | Kostenpflichtig; im FLL-Shop nur als Themenpaket mit den Baumkontrollrichtlinien gesehen: „Themenpaket: Baumkontroll- + Baumuntersuchungsrichtlinien, 2020/2013 – 70,00 €". Eine eigene Produktseite wurde nicht geöffnet. | Nicht abgerufen | Die Abgrenzung „Regelkontrolle vs. eingehende Untersuchung" auf Methodenebene (Zugversuch, Schalltomografie, Bohrwiderstand) und alle Untersuchungsergebnis-Felder. |
| Berliner Baumschutzverordnung (BaumSchVO), amtliche Fassung auf gesetze.berlin.de | Die Seite liefert nur eine JavaScript-Hülle ohne Textinhalt („Wenn Sie diese Meldung sehen, haben Sie in Ihrem Browser kein JavaScript aktiviert."). Getestet: `/bsbe/document/jlr-BaumSchVBErahmen`, `/perma?d=jlr-BaumSchVBErahmen`, `/bsbe/document/jlr-BaumSchVBEV7P5/part/X`, `/bsbe/document/jlr-BaumSchVBEV7P2/part/X`, `/jportal/?quelle=jlink&query=BaumSchV+BE&psml=bsbeprod.psml&max=true`. Die Seite setzt zudem `<meta name='tdm-reservation' content='1'>`. | Jeweils HTTP 200, aber 5.519 Byte Rahmenseite ohne Normtext | Ein rechtsverbindliches Zitat der geltenden Fassung inkl. Änderungsstand. BAUM-BE-06 stützt sich deshalb auf die FAOLEX-Wiedergabe und den Senatsflyer. Für rechtliche Aussagen in BIOME (Schutzstatus, Genehmigungspflicht, Ersatzpflanzung nach § 6) reicht das nicht. |
| Bildreihe Meining et al. (2007) zur Kronenansprache | Im WZE-Leitfaden als in Deutschland angewandte Referenz genannt, aber nicht mitgeliefert und nicht gesucht/abgerufen. | Nicht abgerufen | Die Kalibrierung einer Kronenverlichtungsschätzung. BIOME kann das Feld anbieten (BAUM-DE-08), aber keine Erfassungshilfe/Bildreihe. |
| ROLOFF 2001, „Baumkronen – Verständnis und praktische Bedeutung eines komplexen Naturphänomens", Ulmer Verlag; ROLOFF 2008 „Baumpflege"; ROLOFF 2010 „Bäume – Lexikon der praktischen Baumbiologie" | Buchpublikationen im Verlagshandel; aus dem DDG-Dokument nur als Literaturverweis bekannt, kein freier Volltext gesucht/gefunden. | Nicht abgerufen | Die Abbildungen zu VS 0–3 (Winter-/Sommerzustand) und die baumartspezifische Ausdifferenzierung der Roloff-Stufen. |
| FIS-Broker-Sachdatenbeschreibung über WebFetch | Der Host `fbinter.stadt-berlin.de` antwortete über WebFetch mit HTTP 503; der direkte Abruf mit korrektem CA-Bundle lieferte HTTP 200. | WebFetch HTTP 503 / curl HTTP 200 | Nichts — die Quelle ist unter BAUM-BE-05 gedeckt. Hier nur als Warnung notiert, damit ein 503 nicht als Ausfall der Quelle fehlgedeutet wird. |

## Offene Fragen an Malte

- **Messhöhe im Berliner Kataster.** BAUM-BE-06 belegt 1,30 m als rechtliche Messhöhe für den Schutzstatus. Für `stammumfg` im GRIS ist **keine** Messhöhe dokumentiert. Soll BIOME den Katasterwert stillschweigend als „in 1,30 m gemessen" behandeln, oder als „Messhöhe unbekannt" führen? Für den Vergleich mit eigenen Messungen ist das entscheidend. Klärbar über die auf der Datensatzseite genannte Kontaktperson (Hr. Dejoks, SenMVKU).
- **Einheit von `standalter`.** Nicht dokumentiert (BAUM-BE-04). Soll BIOME das Feld ignorieren und das Alter selbst aus `pflanzjahr` rechnen? Das wäre belegbar, `standalter` ist es nicht.
- **Nullwert-Konvention.** `kronedurch = 0` betrifft 38.590 von 434.765 Straßenbäumen, `baumhoehe = 0` weitere 3.305. Ich habe keine Dokumentation gefunden, ob 0 „nicht erhoben" bedeutet. Soll BIOME 0 bei diesen Feldern grundsätzlich als Fehlwert behandeln? Ich empfehle ja, aber das ist eine Setzung, keine Ableitung.
- **Welche Zustandsskala führt BIOME überhaupt?** Frei belegbar sind drei zueinander inkompatible Systeme: Kronenverlichtung 0–100 in 5-%-Stufen mit Schadstufen 0–4 (Wald, BAUM-DE-08/09), Roloff VS 0–3 plus S/K (Einzelbaum, BAUM-DE-10) und die zweistufige kontrollbezogene Einteilung „gesund, leicht geschädigt" / „stärker geschädigt" (BAUM-DE-12). Eine vierstufige „FLL-Zustandsstufe" ist **nicht** belegbar. Welche davon ist die Leitskala, und welche werden nur als optionale Zusatzfelder geführt?
- **Kauf der FLL-Regelwerke.** Baumkontrollrichtlinien 2020 und ZTV-Baumpflege 2017 kosten zusammen 88,00 € als PDF (bzw. 70,00 € für das Themenpaket Baumkontroll- + Baumuntersuchungsrichtlinien). Ohne sie bleiben Begriffskatalog, Zustandsstufen und Maßnahmenliste dauerhaft unbelegt. Soll ich den Kauf vorbereiten? Zu beachten: Auch nach Kauf gilt „Alle Rechte vorbehalten. Nachdruck nur in vollständiger Fassung mit ausdrücklicher Genehmigung des Herausgebers" — der Wortlaut dürfte dann in Registern zitiert, aber nicht als BIOME-Inhalt ausgeliefert werden.
- **Geltungsbereich Welle 1.** Der Berliner Datensatz enthält ausschließlich Bäume in Zuständigkeit der Bezirksämter (BAUM-BE-05). Bäume auf Privatflächen, bei Wohnungsbaugesellschaften, auf Friedhöfen und Sportanlagen fehlen vollständig. Ist Welle 1 auf den öffentlichen Bestand beschränkt, oder braucht BIOME von Anfang an ein Feld für die Datenherkunft (Kataster vs. Eigenerfassung)?
- **Anlagenbäume ohne Adresse.** Das Anlagenbaum-Schema hat keine Adressfelder (BAUM-BE-03). Reicht `namenr` + Koordinate als Ortsangabe in der Oberfläche, oder braucht BIOME einen eigenen Ortsbezug (Grünanlage, Flurstück)?
