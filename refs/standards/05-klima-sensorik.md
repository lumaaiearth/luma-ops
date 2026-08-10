# Standards-Register — Klima und Sensorik

> Stand: 2026-08-09. Nur frei zugängliche, wörtlich belegte Quellen.
> Regel: Was hier nicht gedeckt ist, darf die BIOME-Oberfläche nicht anbieten.
>
> Abrufhinweise für Nachprüfungen:
> - `gdi.berlin.de` kettet auf die Wurzel „Telekom Security TLS RSA Root 2023“, die im
>   Container-CA-Bundle fehlt. Abruf mit
>   `curl --cacert <(cat /root/.ccr/ca-bundle.crt <(curl -s https://curl.se/ca/cacert.pem))`.
>   Ohne das schlägt jeder Zugriff mit TLS-Fehler 60 fehl — das ist kein Ausfall der Quelle.
> - `library.wmo.int` liefert an automatisierte Clients eine Slider-Captcha-Seite
>   (HTTP 200, 10.535 Byte, kein Inhalt). Siehe „Nicht zugänglich".
> - Die DWD-Glossarseiten verlinken Fachwörter innerhalb der Sätze. Alle unten zitierten
>   Sätze wurden zusätzlich im Roh-HTML des Seitenkörpers verifiziert (nicht nur im
>   `<meta name="description">`, das die Linktexte verschluckt).

## Gedeckte Definitionen

### KLIM-DWD-01 · Klimareferenzperiode — zwei Bezugszeiträume, nicht einer
- **Herausgeber:** Deutscher Wetterdienst (DWD), Wetter- und Klimalexikon, Eintrag „Klimatologische Referenzperiode"
- **Quelle:** https://www.dwd.de/DE/service/lexikon/begriffe/K/Klimatologische_Referenzperiode.html
- **Abgerufen:** 2026-08-09 (HTTP 200). Die Einträge „Klimareferenzperiode" und „Normalperiode" sind reine Verweise auf diese Seite (jeweils HTTP 200, Inhalt: „Siehe hierzu: Klimatologische Referenzperiode").
- **Wörtlich** (Abschnitt „Hintergrund"):
  „Gemäß den Empfehlungen der Weltorganisation für Meteorologie (WMO) ist es üblich, zur Erfassung des Klimas und seiner Änderungen Mittelwerte über einen Zeitraum von 30 Jahren zu bilden, um den Einfluss der natürlichen Variabilität aus der statistischen Betrachtung des Klimas auszuklammern."
  „Mit Ende des Jahres 2020 wurde die Referenzperiode Vergleichsperiode für aktuelle klimatologische Bewertungen durch die Periode 1991 bis 2020 ersetzt." (Satzbau so im Original [sic])
- **Wörtlich** (Abschnitt „Empfehlung der WMO"):
  „Da mit einer Klimareferenzperiode nicht mehr alle Anforderungen erfüllt werden können, empfiehlt die WMO die Nutzung von zwei Bezugszeiträumen:"
  „Für die Bewertung langfristiger Klimaentwicklung wird die WMO-Referenzperiode 1961-1990 beibehalten, da dieser Zeitraum nur zum Teil von der aktuell zu beobachteten beschleunigten Erwärmung betroffen ist."
  „Für Aufgaben des Klimamonitorings, wie z. B. monatliche und saisonale oder jährliche Anomalienkarten, die nicht auf die Überwachung des längerfristigen Klimawandels ausgerichtet sind, sowie als Basis für Klimavorhersagen, werden die Klimanormalperioden zukünftig alle zehn Jahre aktualisiert."
  „Die WMO weist auch darauf hin, dass Definition und Verwendung von Klimanormalen klar und präzise dokumentiert und kommuniziert werden müssen, um Fehlinterpretationen zu vermeiden."
- **Wörtlich** (Abschnitt „Umsetzung durch den DWD"):
  „Der DWD wird daher für Auswertungen im Zusammenhang des längerfristigen Klimawandels weiterhin den Zeitraum 1961-1990 als Referenzperiode (WMO-Referenzperiode) verwenden. Im Kontext des zeitnahen Klimamonitorings wird daneben die aktuelle Klimanormalperiode 1991-2020 eingesetzt."
- **Deckt in BIOME:**
  - **Pflicht-Metafeld `referenzperiode` an jedem Klima-Kennwert**, mit exakt zwei belegten Ausprägungen: `1961-1990` (WMO-Referenzperiode, Langfristvergleich) und `1991-2020` (aktuelle Klimanormalperiode, Monitoring). Eine Kennzahl ohne diese Angabe ist nicht interpretierbar — die Quelle verlangt ausdrücklich klare Dokumentation.
  - **Die „aktuell geltende" Periode für Ist-Zustands-Aussagen ist 1991-2020.** Für „ist das viel oder wenig gegenüber früher"-Aussagen ist 1961-1990 die belegte Bezugsgröße.
  - **Länge einer Periode: 30 Jahre.** Aktualisierungstakt der Normalperiode: alle zehn Jahre. BIOME darf daraus ableiten, dass 1991-2020 bis Ende 2030 gilt — aber nur als Erwartung, nicht als Zusage.
  - Bezugsgröße `1981-2010` ist als **frühere** Normalperiode belegt und darf in Altbeständen erklärt, aber nicht als aktuell ausgegeben werden.
- **Deckt ausdrücklich nicht:**
  - Keine Aussage, welche Periode für eine *Stadtklima*-Bewertung zu nehmen ist. Die Berliner Klimaanalyse 2022 nutzt für die autochthonen Nächte 1991-2020 (KLIM-BE-07), die Umweltatlaskarte 04.12 laut Umweltatlas-Text den Referenzzeitraum 1971-2000 — drei verschiedene Zeiträume in einem Anwendungsfeld.
  - Keine Regel für Perioden kürzer als 30 Jahre. Eine BIOME-Kennzahl „Mittel der letzten 5 Jahre" ist durch nichts hier gedeckt.

### KLIM-DWD-02 · Klimatologische Kenntage — exakte Schwellen und die abgeschlossene Liste
- **Herausgeber:** Deutscher Wetterdienst (DWD), Wetter- und Klimalexikon
- **Quelle:** https://www.dwd.de/DE/service/lexikon/begriffe/K/Klimatologische_Kenntage.html · .../S/Sommertag.html · .../H/Heisser_Tag.html · .../S/Sehr_heisser_Tag.html · .../E/Extrem_heisser_Tag.html · .../T/Tropennacht.html · .../F/Frosttag.html · .../E/Eistag.html
- **Abgerufen:** 2026-08-09 (alle HTTP 200)
- **Wörtlich** (Oberbegriff):
  „Ein "Klimatologischer Kenntag" ist ein Tag, an dem ein definierter Schwellenwert eines klimatischen Parameters erreicht beziehungsweise über- oder unterschritten wird (z. B. Sommertag als Tag mit Temperaturmaximum ≥ 25 °C) oder ein Tag, an dem ein definiertes meteorologisches Phänomen auftrat (z. B. Gewittertag als Tag, an dem irgendwann am Tag ein Gewitter (hörbarer Donner) auftrat)."
- **Wörtlich** (die Schwellendefinitionen, jeweils erster Satz des Eintrags):
  „Ein Sommertag ist ein Tag, an dem das Maximum der Lufttemperatur ≥ 25 °C beträgt."
  „Ein Heißer Tag ist ein Tag, an dem das Maximum der Lufttemperatur ≥ 30 °C beträgt. Ein Heißer Tag wurde früher auch als Tropentag bezeichnet."
  „Ein sehr heißer Tag ist ein Tag, an dem das Maximum der Lufttemperatur ≥ 35 °C beträgt."
  „Ein extrem heißer Tag ist ein Tag, an dem das Maximum der Lufttemperatur ≥ 40 °C beträgt."
  „Eine Tropennacht ist eine Nacht in der das Minimum der Lufttemperatur ≥ 20 °C beträgt (täglicher Messzeitraum: 18 UTC bis 06 UTC)."
  „Ein Frosttag ist ein Tag, an dem das Minimum der Lufttemperatur unterhalb des Gefrierpunktes (0 °C) liegt (ohne Beachtung des Lufttemperatur-Maximums)."
  „Ein Eistag ist ein Tag, an dem das Maximum der Lufttemperatur unterhalb des Gefrierpunktes (unter 0 °C) liegt, d.h. es herrscht durchgehend Frost."
- **Wörtlich** (Mengenverhältnisse, aus den Einträgen Sommertag / Heißer Tag / Frosttag / Eistag):
  „Die Menge der Sommertage enthält auch die Untermenge der Heißen Tage."
  „Die Anzahl der Heißen Tage ist immer ≤ der Anzahl der Sommertage."
  „Die Anzahl der Eistage ist somit eine Untermenge der Anzahl der Frosttage."
- **Wörtlich** (vollständige Liste der auf der Kenntage-Seite geführten Kenntage):
  „Eistag · Frosttag · Gewittertag · Hageltag · Heißer Tag · Heiterer Tag · Nebeltag · Niederschlagstag · Regentag · Schneedeckentag · Sommertag · Sturmtag · Trüber Tag · Tropennacht · Tropentag"
- **Deckt in BIOME:**
  - **Feld `kenntag_typ` mit einer abgeschlossenen Werteliste** aus genau den 15 oben aufgezählten Begriffen. Alles andere ist eine BIOME-Erfindung.
  - **Schwellen, hart rechenbar** (Tagesmaximum = `TXK`, Tagesminimum = `TNK` aus KLIM-DWD-03):
    | Kennzahl | Bedingung | Bezugsgröße |
    |---|---|---|
    | Sommertag | `TXK ≥ 25 °C` | Lufttemperatur-Maximum |
    | Heißer Tag | `TXK ≥ 30 °C` | Lufttemperatur-Maximum |
    | Sehr heißer Tag | `TXK ≥ 35 °C` | Lufttemperatur-Maximum |
    | Extrem heißer Tag | `TXK ≥ 40 °C` | Lufttemperatur-Maximum |
    | Frosttag | `TNK < 0 °C` | Lufttemperatur-Minimum |
    | Eistag | `TXK < 0 °C` | Lufttemperatur-Maximum |
    | Tropennacht | Minimum der Lufttemperatur `≥ 20 °C` im Fenster **18 UTC – 06 UTC** | Nachtminimum, eigenes Zeitfenster |
  - **Alle Schwellen sind ≥ bzw. < , nicht > bzw. ≤.** Ein Tag mit exakt 25,0 °C ist ein Sommertag; ein Tag mit exakt 0,0 °C Minimum ist **kein** Frosttag.
  - **Die Mengenverhältnisse sind Prüfregeln,** die BIOME als Plausibilitätstest fahren kann: Heiße Tage ≤ Sommertage, Eistage ≤ Frosttage.
  - **Korrekte Benennung in der Oberfläche: „Heißer Tag".** Der Begriff **„Hitzetag" ist kein DWD-Begriff** — https://www.dwd.de/DE/service/lexikon/begriffe/H/Hitzetag.html liefert **HTTP 404**. BIOME darf „Hitzetag" höchstens als Synonym-Suchbegriff führen, nicht als Feldbezeichnung.
- **Deckt ausdrücklich nicht:**
  - **Die Tropennacht ist nicht aus dem Tageswert `TNK` berechenbar.** Die Definition nennt ausdrücklich das Fenster 18 UTC – 06 UTC; `TNK` in den DWD-Tageswerten ist seit 2001-04-01 ein Minimum über „00:00 - 24:00 UTC" (KLIM-DWD-04). Wer aus `TNK` Tropennächte zählt, zählt etwas anderes als der DWD. Dafür sind Stundenwerte nötig.
  - Keine Definition von „Hitzewelle", „Hitzeperiode", „Dürretag", „Trockentag", „Vegetationstag", „Gradtag". Diese Begriffe sind über diese Quelle **nicht** belegt.
  - Keine Aussage, in welcher Höhe die Lufttemperatur zu messen ist — dafür KLIM-WMO-06 und KLIM-DWD-04.

### KLIM-DWD-03 · opendata.dwd.de — Endpunkte, Dateiformat, Spalten, Qualitätscodes, Lizenz
- **Herausgeber:** Deutscher Wetterdienst, Climate Data Center (CDC), Datensatzbeschreibung „Tägliche Stationsbeobachtungen (Temperatur, Druck, Niederschlag, Sonnenscheindauer, etc.) für Deutschland", Version v24.3, Ausgabedatum 2024
- **Quelle:** https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/BESCHREIBUNG_obsgermany-climate-daily-kl_de.pdf (14 S., PDF)
- **Abgerufen:** 2026-08-09 (HTTP 200, 34.789 Byte)
- **Wörtlich** (Kopf):
  „Datensatz-ID: urn:wmo:md:de-dwd-cdc:obsgermany-climate-daily-kl"
  „Datensatz-URL: https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/recent/"
  „Datensatz-URL: https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/historical/"
  „Projektion WGS 84 (EPSG:4326)"
  „Zeitliche Abdeckung 1781-01-01 -- ..."
- **Wörtlich** (Aufteilung und Pflege):
  „Der Datensatz ist aufgeteilt in einen versionierten Teil mit abgeschlossener Qualitätsprüfung, im Verzeichnis ./historical/. Und einen sich kontinuierlich aktualisierenden Teil, für den die Qualitätsprüfung noch nicht abgeschlossen ist, im Verzeichnis ./recent/."
  „Im Verzeichnis recent/ werden die Daten täglich aktualisiert. Dabei werden die Daten der letzten 500 Tage - bis gestern rollierend ausgetauscht. Die Qualitätskontrolle ist für diese Daten noch nicht abgeschlossen, so dass sich immer wieder Änderungen in den Werten ergeben können."
  „Im Verzeichnis historical/ werden die Datendateien jährlich aktualisiert. Die Qualitätskontrolle für diese Daten ist abgeschlossen, so dass die Werte für die Version konstant sind."
- **Wörtlich** (Dateinamenschema und Inhalt der ZIP-Archive):
  „Das Namensschema der zip-Archive ist *_{product_code}_{station_id}_akt.zip"
  „Das Namensschema der zip-Archive ist *_{product_code}_{station_id}_{begin_date}_{end_date}_hist.zip"
  „- produkt_*.txt, enthält die Beobachtungsdaten"
  „- Metadaten_Parameter*, enthält Zusatzinformationen zu den, in der produkt_*.txt Datei bereitgestellten, Parametern, wie Beginn, Ende, Einheit, Messvorschrift, etc."
  „- Metadaten_Geraete*, enthält die Historie der Sensor- bzw Geberhöhen, Gerätetypen und Messverfahren."
  „- Metadaten_Stationsname*, enthält die Historie der Stationsnamen und ggf. die Betreiber der Station"
  „- Metadaten_Geographie*, enthält die Historie der geographischen Metadaten der Station (geografische Länge und Breite, Stationshöhe)."
- **Wörtlich** (CSV-Dialekt und Spalten — „CSV Dialekt Beschreibung": Trennzeichen `;`, Zeilenende `\r\n`, Kopfzeile `true`, Zitatzeichen `"`):
  „TMK Tagesmittel der Lufttemperatur in 2m Höhe °C" · „TXK Tagesmaximum der Lufttemperatur in 2m Höhe °C" · „TNK Tagesminimum der Lufttemperatur in 2m Höhe °C" · „TGK Minimum der Lufttemperatur am Erdboden in 5cm Höhe °C" · „FX Tagesmaximum Windspitze m/s" · „FM Tagesmittel Windgeschwindigkeit m/s" · „RSK tägliche Niederschlagshöhe mm" · „RSKF Niederschlagsform numerical code" · „SDK tägliche Sonnenscheindauer h" · „SHK_TAG Tageswert Schneehöhe cm" · „NM Tagesmittel des Bedeckungsgrades 1/8" · „VPM Tagesmittel des Dampfdruckes hPa" · „PM Tagesmittel des Luftdrucks hPa" · „UPM Tagesmittel der Relativen Feuchte %" · „MESS_DATUM Referenzdatum NUMBER YYYYMMDD" · „QN_3 Qualitaetsniveau der nachfolgenden Spalten" · „QN_4 Qualitaetsniveau der nachfolgenden Spalten"
- **Wörtlich** (Qualitätscodes, vollständig):
  „QN = 1 : nur formale Prüfung; QN = 2 : nach individuellen Kriterien geprüft; QN = 3 : automatische Prüfung und Korrektur; QN = 5 : historische, subjektive Verfahren; QN = 7 : geprüft, gepflegt, nicht korrigiert; QN = 8 : Qualitätsicherung ausserhalb ROUTINE; QN = 9 : nicht alle Parameter korrigiert; QN = 10 : Qualitätsprüfung und Korrektur beendet."
  „Daten vor und bis einschliesslich 1980, können als höchstes Qualitätsniveau QN=5 erreichen. Für Daten nach 1980 ist das höchstmögliche Qualitätsniveau QN=10."
  „QB = 0 : nicht geflagt; QB = 1 : nicht beanstandet …; QB = 2 : korrigiert; QB = 3 : trotz Beanstandung bestätigt; QB = 4 : ergänzt oder berechnet; QB = 5 : beanstandet; QB = 6 : nur formal geprüft,fachliche Prüfung nicht möglich; QB = 7 : formal beanstandet, QB = -999 : Qualitätsbyte nicht vorhanden."
- **Wörtlich** (Hinweise und Lizenz):
  „Bei einer Auswertung der Daten sollten die in den *.zip-files enthaltenen Metadaten berücksichtigt werden."
  „Die Stationen sind nach den WMO-Vorschriften eingerichtet und betrieben. Somit werden die lokalen Effekte besonders gering gehalten. Je nach Anwendung sollten mögliche lokale, regionale und zeitlich sich ändernde Einflüsse untersucht werden, die orts- und parameterspezifisch sein können."
  „COPYRIGHT — Es gelten die Bedingungen der Lizenz Creative Commons BY 4.0 "CC BY 4.0"."
- **Beobachtet** (Kopfzeile und erste Datenzeile aus `tageswerte_KL_00433_akt.zip`, Datei `produkt_klima_tag_20250205_20260808_00433.txt`, unverändert):
  „STATIONS_ID;MESS_DATUM;QN_3;  FX;  FM;QN_4; RSK;RSKF; SDK;SHK_TAG;  NM; VPM;  PM; TMK; UPM; TXK; TNK; TGK;eor"
  „        433;20250205;   10;   9.1;   2.8;    9;   0.0;   0;-999;   0;   5.9;   6.0; 1029.10;    1.2;   88.00;    3.8;   -3.2;   -7.5;eor"
- **Deckt in BIOME:**
  - **Zwei Bezugsquellen mit unterschiedlichem Vertrauensgrad, die BIOME trennen muss:** `historical/` (versioniert, Qualitätsprüfung abgeschlossen, Werte konstant) und `recent/` (letzte 500 Tage, rollierend, Werte ändern sich noch). Ein BIOME-Datensatz braucht ein Feld `quelle_zweig` ∈ {`historical`, `recent`} und darf `recent`-Werte nicht als endgültig ausgeben.
  - **Einheiten, amtlich benannt und direkt übernehmbar:** °C (Temperaturen), m/s (Wind), mm (Niederschlag), h (Sonnenscheindauer), cm (Schneehöhe), Achtel bzw. 1/8 (Bedeckungsgrad), hPa (Druck, Dampfdruck), % (relative Feuchte).
  - **Feldzuordnung für die Kenntage aus KLIM-DWD-02:** Sommertag/Heißer Tag/Eistag ← `TXK`; Frosttag ← `TNK`.
  - **Pflicht-Begleitfeld `qualitaetsniveau`** je Wert, mit der oben vollständig belegten Codeliste {1,2,3,5,7,8,9,10}. BIOME darf QN=10 als „geprüft und korrigiert" ausweisen und muss QN<10 sichtbar machen.
  - **Fehlwertkennung:** In den Produktdateien steht `-999` (Beispiel oben, Spalte `SDK`). BIOME muss `-999` vor jeder Rechnung ausfiltern.
  - **Format-Parser-Vertrag:** Semikolon-getrennt, Zeilenende CRLF, Kopfzeile vorhanden, Zeilenendemarke `eor`, Werte mit führenden Leerzeichen (trimmen!), Datum als `YYYYMMDD`-Ganzzahl.
  - **Lizenz:** CC BY 4.0 — Namensnennung „Deutscher Wetterdienst" ist Pflicht, Weiterverwendung sonst frei.
- **Deckt ausdrücklich nicht:**
  - **Keine Bodenfeuchte, keine Strahlungsbilanz, keine gefühlte Temperatur, kein UTCI/PET** in diesem Datensatz.
  - Keine Stundenwerte. Für die Tropennacht (18–06 UTC) reicht dieser Datensatz nicht.
  - Die Beschreibung nennt VuB 2/VuB 3 (Beobachterhandbuch, Technikerhandbuch, Wetterschlüsselhandbuch) als Ort der genauen Messverfahren. Diese Handbücher liegen hier nicht vor (siehe „Nicht zugänglich").

### KLIM-DWD-04 · Stationsmetadaten und Sensor-Geberhöhen — belegt am Beispiel Berlin
- **Herausgeber:** Deutscher Wetterdienst, CDC
- **Quelle:** https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/historical/KL_Tageswerte_Beschreibung_Stationen.txt (1.388.997 Byte, Latin-1) · Metadaten-Dateien aus https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/recent/tageswerte_KL_00433_akt.zip
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200; die ZIP-Metadaten tragen den Vermerk „generiert: 09.08.2026 -- Deutscher Wetterdienst --")
- **Wörtlich** (Kopfzeile der Stationsliste):
  „Stations_id von_datum bis_datum Stationshoehe geoBreite geoLaenge Stationsname Bundesland Abgabe"
- **Wörtlich** (Berliner Klimastationen mit Tageswerten, Auszug der Liste, Format wie geliefert):
  „00400 19510101 20260808  60  52.6310  13.5021 Berlin-Buch  Berlin  Frei"
  „00403 19500101 20260808  51  52.4537  13.3017 Berlin-Dahlem (FU)  Berlin  Frei"
  „00420 19930501 20260808  61  52.5447  13.5598 Berlin-Marzahn  Berlin  Frei"
  „00433 19480101 20260808  48  52.4676  13.4020 Berlin-Tempelhof  Berlin  Frei"
  „00427 19570101 20260808  46  52.3805  13.5304 Berlin Brandenburg  Brandenburg  Frei"
- **Wörtlich** (`Metadaten_Geraete_Lufttemperatur_00433.txt`, Kopf und letzte Zeile):
  „Stations_ID;Stationsname;Geo. Laenge [Grad];Geo. Breite [Grad];Stationshoehe [m];Geberhoehe ueber Grund [m];Von_Datum;Bis_Datum;Geraetetyp Name;Messverfahren;eor;"
  „433;Berlin-Tempelhof;13.4;52.47;47.74;2;20220913;20260808;PT 100 (Luft);Temperaturmessung, elektr.;eor;"
  Alle sechs Zeitscheiben seit 1948-01-01 tragen die Geberhöhe **2**.
- **Wörtlich** (`Metadaten_Geraete_Windgeschwindigkeit_00433.txt`, letzte Zeile):
  „433;Berlin-Tempelhof;13.4;52.47;47.74;10;20220913;20260808;Ultrasonic Anemometer 2D compact;Windmessung, elektr.;eor;"
  Alle elf Zeitscheiben seit 1974-01-01 tragen die Geberhöhe **10**.
- **Wörtlich** (`Metadaten_Geraete_Lufttemp_Am_Erdb_Minimum_00433.txt`): Geberhöhe durchgehend „.05" (= 0,05 m = 5 cm).
- **Wörtlich** (`Metadaten_Parameter_klima_tag_00433.txt`, Kopf und die für BIOME entscheidenden Zeilen):
  „Stations_ID;Von_Datum;Bis_Datum;Stationsname;Parameter;Parameterbeschreibung;Einheit;Datenquelle (Strukturversion=SV);Zusatz-Info;Besonderheiten;Literaturhinweis;eor;"
  „433;20010401;20260808;Berlin-Tempelhof;TXK;Tagesmaximum der Lufttemperatur in 2m Höhe;°C;…;00:00 - 24:00 UTC gemessen;;;eor;"
  „433;19480101;20010331;Berlin-Tempelhof;TXK;Tagesmaximum der Lufttemperatur in 2m Höhe;°C;…;21:30 VT. - 21:30 MEZ (bis 1986 MOZ);;;eor;"
  Analog `TNK`. Weitere belegte Bezugsfenster derselben Datei: `TMK` „arithm.Mittel aus mind. 21 Stundenwerten" bzw. „TMK=(TT1+TT2+(TT3*2))/4"; `RSK` „06:00 - 06:00 FT. UTC (05:51-05:50 FT.UTC)"; `SDK` „00:00 - 24:00 UTC"; `SHK_TAG` „06 UTC"; `FX` „23:51 - 23:50 UTC"; `TGK` „00:00 - 24:00 UTC gemessen".
- **Wörtlich** (`Metadaten_Geographie_00433.txt`, Kopf und zwei Zeilen):
  „Stations_id;Stationshoehe;Geogr.Breite;Geogr.Laenge;von_datum;bis_datum;Stationsname"
  „433; 51.00; 52.4719; 13.4191;19570501;19700909;Berlin-Tempelhof"
  „433; 47.74; 52.4676; 13.4020;20250923; ;Berlin-Tempelhof"
- **Wörtlich** (`Metadaten_Fehldaten_00433_20250205_20260808.txt`):
  „433;Berlin-Tempelhof;SDK;05.02.2025;08.08.2026; - ;SDK wurde nicht gemessen.;eor;"
- **Deckt in BIOME:**
  - **Stationsstammsatz, Felder amtlich benannt:** `Stations_id` (5-stellig, führende Nullen!), `von_datum`/`bis_datum` (YYYYMMDD), `Stationshoehe` (m), `geoBreite`/`geoLaenge` (Dezimalgrad, WGS 84 laut KLIM-DWD-03), `Stationsname`, `Bundesland`, `Abgabe`.
  - **Messhöhen sind pro Station und Zeitraum dokumentiert, nicht pauschal.** BIOME muss `geberhoehe_m` als Feld je Messreihe führen und aus `Metadaten_Geraete_*` befüllen — nicht als Konstante hart kodieren. Belegte Werte für Berlin-Tempelhof: Lufttemperatur **2 m**, Wind **10 m**, Erdbodenminimum **0,05 m**.
  - **Der Standortwechsel ist Teil der Metadaten.** Berlin-Tempelhof hat seit 1918 sieben verschiedene Koordinaten/Höhen (`Metadaten_Geographie`). Eine BIOME-Zeitreihe an einer Station ist damit **keine** Messung am selben Punkt. Ein Feld `standort_epoche` ist Pflicht, wenn BIOME Trends ausweist.
  - **Das Tagesbezugsfenster hat 2001-04-01 gewechselt** (von „21:30 VT. - 21:30 MEZ" auf „00:00 - 24:00 UTC gemessen"). BIOME darf Kenntag-Zeitreihen über diesen Bruch hinweg nicht als homogen ausgeben.
  - **`SDK` wird an dieser Station nicht gemessen.** Nicht jeder Parameter existiert an jeder Station; BIOME braucht ein „nicht gemessen" getrennt von „Fehlwert".
  - **Berliner Bezugsstationen für BIOME, aktiv am Abrufdatum:** 00400 Berlin-Buch, 00403 Berlin-Dahlem (FU), 00420 Berlin-Marzahn, 00433 Berlin-Tempelhof, dazu 00427 Berlin Brandenburg (liegt in Brandenburg). Berlin-Tegel (00430) endet 2021-05-05, Berlin-Alexanderplatz (00399) 2015-06-30.
- **Deckt ausdrücklich nicht:**
  - Die Geberhöhen sind hier **für Berlin-Tempelhof** belegt. Dass alle DWD-Stationen 2 m / 10 m führen, ist nicht geprüft und darf nicht behauptet werden — die Metadaten sind je Station abzurufen.
  - Keine Angabe zur Umgebung/Exposition der Station (Bebauung, Verschattung, Untergrund). Eine Aussage „diese Station repräsentiert den Stadtteil X" ist durch nichts hier gedeckt.
  - Die Spalte `Abgabe` („Frei") ist nirgends in einer Legende erklärt.

### KLIM-DWD-05 · Vieljährige Mittelwerte 1991-2020 — was der DWD als Kennwert liefert und was nicht
- **Herausgeber:** Deutscher Wetterdienst, CDC, Verzeichnis `multi_annual/mean_91-20`
- **Quelle:** https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/multi_annual/mean_91-20/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (vollständiger Verzeichnisinhalt): `Beschreibung_Datenquelle.html`, `Beschreibung_Datenquelle.txt`, `Eistage_1991-2020.txt`, `Frosttage_1991-2020.txt`, `Heissetage_1991-2020.txt`, `Niederschlag_1991-2020.txt`, `Sommertage_1991-2020.txt`, `Sonnenscheindauer_1991-2020.txt`, `Temperatur_1991-2020.txt` — jeweils mit einer zugehörigen `*_Stationsliste.txt`. Nebenverzeichnisse: `mean_61-90/`, `mean_71-00/`, `mean_81-10/` (plus je ein `*_obsolete/`).
- **Wörtlich** (`Beschreibung_Datenquelle.txt`, Datenquellen-Codes):
  „44;Vieljährige Mittelwerte an Klimastationen für verschiedene Bezugsperioden, berechnet aus ausreichend vielen Werten (>= 25 Jahre) und bezogen auf den Stationsstandort.;eor;"
  „42;Vieljährige Mittelwerte an Klimastationen für verschiedene Bezugsperioden, bezogen auf den aktuellen Standort. Bei nicht ausreichend vielen Werten (< 25 Jahre) am aktuellen Standor;eor;" (Text im Original abgeschnitten)
  „46;Vieljährige Mittelwerte an Klimastationen für verschiedene Bezugsperioden, berechnet aus Monatswerten, ergänzt durch Rasterdaten zur Vervollständigung der Zeitreihen auf 30 Jahre.;eor;"
  „51;Homogenisierte Tages-, Monats- und Jahreswerte für den Messzeitraum: Beginn bis 2020 sowie vieljährige Mittelwerte nach dem Verfahren von L. Hannak.;eor;"
- **Wörtlich** (`Sommertage_1991-2020.txt`, Kopfzeile und die Berliner Zeilen):
  „Stations_id;Bezugszeitraum;Datenquelle;Jan.;Feb.;März;Apr.;Mai;Jun.;Jul.;Aug.;Sept.;Okt.;Nov.;Dez.;Jahr;"
  „400;1991-2020;44;0;0;0;1.1;5.3;10.3;15;14.4;4;.1;0;0;50.8;"
  „403;1991-2020;44;0;0;0;1;4.9;9.6;14.3;13.6;4.1;.2;0;0;47.7;"
  „433;1991-2020;44;0;0;0;1;4.6;9.8;15.5;14.3;4.2;.2;0;0;49.5;"
- **Wörtlich** (`Heissetage_1991-2020.txt`, Berliner Zeilen, Jahreswert letzte Spalte): 400 → „13.3"; 403 → „11.9"; 433 → „12.7".
- **Wörtlich** (`Temperatur_1991-2020.txt`, Datenquelle 51, Jahreswert): 400 → „9.9"; 403 → „9.8"; 433 → „10.4".
- **Wörtlich** (`Frosttage` / `Eistage`, Jahreswerte): Frosttage 400 → „72.9", 403 → „75.3", 433 → „67.6"; Eistage 400 → „16.3", 403 → „17.2", 433 → „17.1".
- **Deckt in BIOME:**
  - **Belegte Normalwerte für Berlin (Periode 1991-2020), direkt zitierfähig:** Berlin-Tempelhof 49,5 Sommertage und 12,7 Heiße Tage im Jahr, Jahresmitteltemperatur 10,4 °C; Berlin-Dahlem (FU) 47,7 / 11,9 / 9,8 °C; Berlin-Buch 50,8 / 13,3 / 9,9 °C. BIOME darf einen aktuellen Wert gegen genau diese Zahlen als „normal" einordnen.
  - **Monatsauflösung ist mitgeliefert** — BIOME kann Kenntage je Monat gegen den Normalwert stellen.
  - **Pflicht-Metafeld `datenquelle_code`** ∈ {42, 43, 44, 45, 46, 51} an jedem Normalwert. Der Code entscheidet, ob der Wert am Stationsstandort gerechnet, auf den aktuellen Standort bezogen, mit Rasterdaten ergänzt oder homogenisiert wurde. Temperatur (51, homogenisiert) und Sommertage (44) sind **nicht** methodisch gleich erzeugt.
  - **Zahlenformat-Falle:** Werte < 1 stehen ohne führende Null (`.1`, `.2`). Ein naiver Parser liest sie sonst als leer.
  - Die Verzeichnisse `mean_61-90`, `mean_71-00`, `mean_81-10` decken die anderen in KLIM-DWD-01 genannten Perioden ab.
- **Deckt ausdrücklich nicht:**
  - **Es gibt in `mean_91-20` keine Datei für Tropennächte.** Ein Normalwert „Tropennächte pro Jahr" ist über dieses Verzeichnis **nicht** belegbar und darf in BIOME nicht als DWD-Normalwert erscheinen.
  - Keine Kennwerte für Wind, Luftfeuchte, Luftdruck, Schneedecke in diesem Verzeichnis.
  - Keine Unsicherheitsangabe zu den Normalwerten. Die Codes 42/46 verraten, dass Werte teils ergänzt sind, aber nicht, wie stark.

### KLIM-WMO-06 · Messhöhen — Lufttemperatur 1,25 bis 2 m, Wind 10 m (WMO-No. 8)
- **Herausgeber:** World Meteorological Organization, „Guide to Instruments and Methods of Observation, Volume I – Measurement of Meteorological Variables", 2023 edition, WMO-No. 8, ISBN 978-92-63-10008-5, © WMO 2023
- **Quelle:** Die WMO-eigene Bibliothek war nicht automatisiert abrufbar (siehe „Nicht zugänglich"). Abgerufen wurde eine unveränderte PDF-Kopie derselben Ausgabe vom Server der mongolischen Wetterbehörde NAMEM: https://amc.namem.gov.mn/wp-content/uploads/WMO/1.%208_I-2023_en.pdf — **HTTP 200, 20.380.933 Byte, 574 PDF-Seiten**, Titelblatt „Guide to Instruments and Methods of Observation / Volume I – Measurement of Meteorological Variables / 2023 edition / WMO-No. 8". Zusätzlich zur Gegenprobe die 7. Ausgabe 2008 auf einem Server des US-Wetterdienstes: https://www.weather.gov/media/epz/mesonet/CWOP-WMO8.pdf (HTTP 200, 32 S.).
- **Abgerufen:** 2026-08-09
- **Wörtlich** (2023er Ausgabe, Abschnitt 2.1.4.2.1 „Measuring air temperatures", PDF-S. 116 = Druckseite 94):
  „In order to achieve representative results when comparing thermometer readings at different places and at different times, a standardized exposure of the screen and, hence, of the thermometer itself is also indispensable. For general meteorological work, the observed air temperature should be representative of the free air conditions surrounding the station over as large an area as possible, at a height of between 1.25 and 2 m above ground level. For reasons of comparability the measurement should be taken over natural ground, preferably over grass. The height above ground level is specified because large vertical temperature gradients may exist in the lowest layers of the atmosphere that can influence the temperature measurement."
  „The most appropriate site for the measurements is, therefore, over level ground, freely exposed to sunshine and wind and not shielded by, or close to, trees, buildings and other obstructions. Sites on steep slopes or in hollows are subject to exceptional conditions and should be avoided. In towns and cities, local peculiarities are expected to be more marked than in rural districts. Temperature observations on the top of buildings are of doubtful significance and use because of the variable vertical temperature gradient and the effect of the building itself on the temperature distribution."
- **Wörtlich** (2023er Ausgabe, Abschnitt 5.9.1, PDF-S. 237 = Druckseite 215):
  „Wind speed increases considerably with height, particularly over rough terrain. For this reason, a standard height of 10 m above open terrain is specified for the exposure of wind instruments."
- **Wörtlich** (2023er Ausgabe, Abschnitt 5.9.2 „Anemometers over land", PDF-S. 238 = Druckseite 216):
  „The standard exposure of wind instruments over open, level terrain is 10 m above the ground. Open terrain is defined as an area where the distance between the anemometer and any obstruction is at least 10 times the height of the obstruction. Wind measurements that are taken in the direct wake of tree rows, buildings or any other obstacle are of little value and contain little information about the unperturbed wind. Since wakes can easily extend downwind to 12 or 15 times the obstacle height, the requirement of 10 obstruction heights is an absolute minimum."
  „(a) Obstacles at a distance of more than 30 times their height: no correction needs to be applied; (b) Obstacles at a distance of more than 20 times their height: correction can be applied; (c) Obstacles at a distance of more than 10 times their height: correction may be applied in some situations, taking special care."
- **Wörtlich** (2008er Ausgabe, Part II Chapter 11 „Urban observations", zum Stadtfall):
  „At non‑urban stations recommended screen height is between 1.25 and 2 m above ground level. While this is also acceptable for urban sites, it may be better to relax this requirement to allow greater heights."
  „Measurements at heights of 3 or 5 m are not very different from those at the standard height, have slightly greater source areas and place the sensor beyond easy reach, thus preventing damage, and away from the path of vehicles."
- **Deckt in BIOME:**
  - **Der Standard für Lufttemperatur ist ein Intervall, kein Punkt: 1,25 bis 2 m über Grund.** Die verbreitete Kurzform „2 m" ist der obere Rand dieses Intervalls und in Deutschland die tatsächlich verwendete Geberhöhe (KLIM-DWD-04), aber sie ist **nicht** der Wortlaut der WMO. Ein BIOME-Sensorprofil muss `messhoehe_m` als Zahl führen und gegen 1,25 ≤ h ≤ 2,0 validieren, wenn es „WMO-konform" behauptet.
  - **Untergrund ist Teil der Vorschrift:** „over natural ground, preferably over grass". Ein Temperatursensor über Asphalt ist nach diesem Wortlaut nicht standardkonform — BIOME braucht ein Feld `untergrund` am Sensorstandort.
  - **Wind: 10 m über Grund, und „open terrain" ist definiert** — Abstand zu jedem Hindernis ≥ 10 × Hindernishöhe, wobei 10× ausdrücklich „an absolute minimum" ist und Nachlaufeffekte bis 12–15 × reichen. BIOME kann daraus eine harte Standort-Prüfregel bauen: `abstand_hindernis_m / hindernishoehe_m ≥ 10` → Warnung; ≥ 20 → korrigierbar; ≥ 30 → keine Korrektur nötig.
  - **Messungen auf Dächern sind ausdrücklich abgewertet** („of doubtful significance and use"). BIOME darf einen Dachstandort nicht kommentarlos wie einen Bodenstandort behandeln.
  - **Für Stadtstandorte erlaubt die Quelle ausdrücklich größere Höhen** (3 bis 5 m) mit Begründung. Ein BIOME-Stadtsensor auf 3 m ist damit belegbar begründbar — aber er ist dann nicht mit einer DWD-2-m-Reihe gleichzusetzen.
- **Deckt ausdrücklich nicht:**
  - Die zitierte Datei ist eine **Spiegelung** auf einem fremden Server, keine Ausgabe von der WMO-Bibliothek. Inhalt, Ausgabe (2023) und Copyright-Vermerk sind im PDF selbst enthalten; ein Abgleich gegen das Original bei der WMO war nicht möglich. Für ein rechtssicheres Zitat ist die WMO-Fassung heranzuziehen.
  - Die Siting-Klassifikation (Annex 1.D, Klassen 1–5 für Standortgüte) wurde **nicht** ausgewertet. Eine BIOME-Aussage „Standortklasse 2" ist damit nicht gedeckt.
  - Keine Vorgabe zur Mittelungsdauer, Abtastrate oder Genauigkeitsanforderung — diese Kapitel wurden nicht gelesen.

### KLIM-BE-07 · Umweltatlas Berlin, Klimaanalyse 2022 — Verfahren, Rasterweite, Bezugszustand
- **Herausgeber:** Senatsverwaltung für Stadtentwicklung, Bauen und Wohnen Berlin, Umweltatlas Berlin, Karten 04.10.1–04.10.9 „Klimaanalyse 2022"
- **Quelle:** https://www.berlin.de/umweltatlas/klima/klimaanalyse/2022/methode/ · .../einleitung/ · .../datengrundlage/ · .../zusammenfassung/ · Technische Dokumentation: https://www.berlin.de/umweltatlas/_assets/literatur/doku_klimaanalyse_2022.pdf („Klimamodellierung 2022 - Dokumentation der Klimamodellierung", 48 S., Stand 03. Juni 2025)
- **Abgerufen:** 2026-08-09 (alle HTTP 200; Dokumentations-PDF 6.247.409 Byte)
- **Wörtlich** (Methode, Modell und Version):
  „Die Klimaanalyse basiert auf der Durchführung einer Modellierung der Wind- und Temperaturverhältnisse im Land Berlin. Die Modellierung wurde im Jahr 2022 durchgeführt und es wurde die Software FITNAH 3D (Flow over Irregular Terrain with Natural and Anthropogenic Heat Sources) in der Version 2022v003 der GEO-NET Umweltconsulting GmbH genutzt."
- **Wörtlich** (Methode, Gitter):
  „Die verwendete räumliche Maschenweite, also der Abstand zwischen den Gitterpunkten, beträgt in beide horizontale Raumrichtungen 10 m. Die vertikale Gitterweite ist nicht äquidistant und in der bodennahen Atmosphäre sind die Rechenflächen besonders dicht angeordnet, um die starke Variation der meteorologischen Größen realistisch zu erfassen. So liegen die untersten Rechenflächen bis in eine Höhe von 22 m bei 2 m, darüber hinaus bei 4 m. … die Modellobergrenze liegt in einer Höhe von 3.000m über Grund."
- **Wörtlich** (Methode, meteorologischer Antrieb):
  „Für den Modellantrieb wurden langjährige Messdaten der DWD-Stationen Tegel und Tempelhof herangezogen."
  „Die Auswertung der langjährigen Messdaten ergab eine Häufigkeitsverteilung der Lufttemperatur um 21 Uhr während der betrachteten austauscharmen sommerlichen Wetterlage an der Station Tegel 21,2 °C in 2 m über Grund bzw. 20,7 °C an der Station Tempelhof. Die Werte beider Stationen sind somit ähnlich ausgeprägt, wobei letztere für den Modellantrieb verwendet wurde."
  „Bei der durchgeführten Klimamodellierung wurden die großräumigen synoptischen Rahmenbedingungen entsprechend festgelegt, die autochthonen Wetterlage entsprechen: Starttemperatur: 20,7 °C um 21 Uhr, Bedeckungsgrad 0/8, Sonnenhöchststand am 21. Juni, relative Feuchte der Luftmasse 50 %, Nesting mit der „Deutschland-Rechnung" (GEO-NET 2022)."
- **Wörtlich** (Methode, Bezugszeitraum der Wetterlagenstatistik):
  „Die langjährige mittlere Anzahl an autochthonen Nächten im Land Berlin in der Periode 1991 – 2020 zeigt Abbildung 3. Dabei treten die Monate August und September mit 9 bzw. 8,5 Tagen hervor. Während der Sommermonate Juni, Juli und August beträgt die Summe 23 Tage, was einem Anteil von etwa 25 % der Nächte entspricht. Im Durchschnitt sind 65,6 Tage pro Jahr festzustellen."
- **Wörtlich** (Methode, Auswertezeitpunkte):
  „Der Termin 22:00 Uhr repräsentiert kurz nach Sonnenuntergang den Umschwung von der Einstrahlungs- zur Ausstrahlungssituation … Der Termin 04:00 Uhr steht für die maximale Abkühlung innerhalb des Stadtkörpers in einer hochsommerlichen Strahlungsnacht. … Der Zeitschnitt 14:00 Uhr ist darüber hinaus für die Beurteilung der bioklimatischen Situation am Tag geeignet"
- **Wörtlich** (Datengrundlage, Gebiet und Eingangsdaten):
  „Daher untergliedert sich das Untersuchungsgebiet in das 890 km² große Stadtgebiet von Berlin sowie einen rund 900 km² großen Bereich des Umlandes"
  „Die Landnutzung wurde in 11 Nutzungsklassen übertragen, die den Erfordernissen des Modells FITNAH 3D entsprechen."
  „Über den Bestand der rund 770.000 ALKIS-Gebäudeobjekte (Stand 11/2022) hinaus, konnten aus dem erwähnten Bestand der Gebäude- und Vegetationshöhen-Erfassung etwa 70.000 zusätzliche Gebäudeobjekte wie Schuppen, Garagen, Lauben und andere Nicht-ALKIS-Objekte berücksichtigt werden."
- **Wörtlich** (Einleitung / Zusammenfassung, Auflösung und Aggregate):
  „Zudem werden die Originaldaten aus dem Klimamodell FITNAH-3D in einem 10 × 10 Meter Raster angeboten sowie aggregiert auf Block(teil)flächen."
  „Neben den Daten auf Rasterebene werden alle Informationen auch für ca. 25.000 Block- und Blockteilflächen sowie ca. 32.000 Straßenflächen aufbereitet."
- **Wörtlich** (Technische Dokumentation, Vertikalschichten):
  „So liegen die untersten Rechenflächen in Höhen von 2, 4, 6, 8, 10, 15, 20, 40 und 70 m über Grund (ü. Gr.)."
  „Für die Analysen im vorliegenden Projekt wurde eine horizontale Modellauflösung von 10 m gewählt, das entspricht für das gewählte Modellgebiet Berlin und angrenzendes Umland rd. 17,8 Mio. Rasterzellen."
- **Deckt in BIOME:**
  - **Rasterweite: 10 m × 10 m horizontal**, unterste Rechenflächen bei 2 m über Grund. Ein BIOME-Kartenausschnitt darf nicht feiner interpoliert dargestellt werden, als diese Zellgröße hergibt.
  - **Zwei belegte Bezugsflächen-Ebenen:** Raster (10 m) und Aggregate — ca. 25.000 Block-/Blockteilflächen, ca. 32.000 Straßenflächen. BIOME braucht `bezugsflaeche_typ` ∈ {`raster_10m`, `blockteilflaeche`, `strassenflaeche`}.
  - **Der Bezugszustand ist keine Zeitreihe, sondern ein Szenario:** eine autochthone sommerliche Strahlungsnacht mit Starttemperatur 20,7 °C um 21 Uhr, Bedeckungsgrad 0/8, Sonnenstand 21. Juni, 50 % relative Feuchte. Diese fünf Randbedingungen gehören in BIOME als Fußnote an jede Karte.
  - **Die drei einzigen belegten Auswertezeitpunkte: 22:00, 04:00, 14:00 Uhr (MEZ).** Andere Uhrzeiten gibt es nicht.
  - **Statistische Grundlage der Wetterlagenwahl: Periode 1991-2020**, 65,6 autochthone Nächte pro Jahr im Mittel, davon 23 in Juni–August. BIOME darf damit sagen, wie oft der modellierte Zustand typischerweise eintritt.
  - **Gebäudestand 11/2022** — BIOME muss den Bezugsstand anzeigen; jeder Neubau danach ist nicht enthalten.
- **Deckt ausdrücklich nicht:**
  - Keine Sommertage, Heißen Tage oder Tropennächte. Der Umweltatlas verweist dafür ausdrücklich auf eine andere Karte: „Die meteorologischen Kennwerte (Hitzetage, Sommertage, Tropennächte) werden für drei Zeiträume, dem Referenzzeitraum 1971-2000 und den zukünftigen Perioden 2031-2060 und 2071-2100 in der Umweltatlaskarte 04.12 beschrieben." Karte 04.12 wurde hier **nicht** abgerufen.
  - Keine Aussage über andere Wetterlagen (Westwind, Winter, bedeckte Sommertage). Das Modell rechnet genau ein Szenario.
  - Keine Messwerte. Alles in dieser Karte ist Modellergebnis.

### KLIM-BE-08 · Was die Klimaanalysekarte aussagt — und was ausdrücklich nicht
- **Herausgeber:** Senatsverwaltung für Stadtentwicklung, Bauen und Wohnen Berlin (Textdokumentation „Kartenbeschreibung"); Diensteanbieter GDI Berlin
- **Quelle:** https://www.berlin.de/umweltatlas/klima/klimaanalyse/2022/kartenbeschreibung/ · https://gdi.berlin.de/services/wfs/ua_klimaanalyse_2022?request=GetCapabilities&service=WFS
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200, 145.319 Byte)
- **Wörtlich** (Kartenbeschreibung, Grenzen der Vergleichbarkeit — der wichtigste Satz):
  „Bei der Darstellung des bodennahen Temperaturfeldes handelt es sich um das Rastermittel der Temperatur in der bodennahen Schicht der Atmosphäre (0 – 5 m über Grund). Sind innerhalb einer Rasterzelle mehrere Landnutzungen mit unterschiedlichem Flächenanteil vorhanden, so berechnet sich die gezeigte Temperatur aus der anteilsmäßigen Wichtung. Insofern sind die simulierten Temperaturwerte nur für größere Gebiete mit einheitlicher bzw. entsprechender Landnutzung mit bodengebundenen Messwerten vergleichbar."
- **Wörtlich** (Kartenbeschreibung, zur Oberflächentemperatur):
  „Die berechneten Größen in °C dürfen jedoch aufgrund dieser komplexen Werte-Zusammensetzung nicht direkt mit den Lufttemperaturwerten des betrachteten Rasters bzw. Blockes gleichgesetzt werden."
- **Wörtlich** (Kartenbeschreibung, Aggregationsregel und Sonderstellung von 04.10.7):
  „Die Analysekarten 04.10.1 bis 04.10.5 sowie 04.10.8 und 04.10.9 liegen sowohl rasterbasiert als auch in blockbezogener Form vor. Dabei wird der statistische, nicht gewichtete Mittelwert aller Block(teil)flächen bzw. die Straßenflächen schneidenden Rasterzellen dargestellt. Die Klimaanalysekarte (Karte 04.10.7) liegt hingegen nur blockbezogen vor, da diese nicht direkt modelliert, sondern aus den rasterbasierten Ergebnissen der Klimamodellierung abgeleitet wurde."
- **Wörtlich** (Kartenbeschreibung, Sach- statt Bewertungsebene):
  „Grundlage dafür ist die Abweichung der jeweiligen mittleren nächtlichen Lufttemperatur pro Fläche vom Mittelwert über alle Flächen, welcher um 04:00 Uhr 17,5°C beträgt."
  „Da die Klimaanalysekarte die stadtklimatischen Prozesse in der Nacht zusammenfasst und sich somit auf der Sachebene befindet, soll hier noch keine Bewertung erfolgen. Daher wird in der Aktualisierung 2022 die Überwärmung als absolute Abweichung vom Mittelwert der Siedlungs- und Verkehrsflächen (17,5 °C) abgeleitet. Eine Bewertung erfolgt in einem weiteren Schritt erst auf Ebene der Planungshinweiskarte Stadtklima."
- **Wörtlich** (Kartenbeschreibung, Definition der Kaltluftvolumenstromdichte und Schwellen):
  „Unter dem Begriff Kaltluftvolumenstromdichte … versteht man das Produkt aus der Fließgeschwindigkeit der Kaltluft, ihrer vertikalen (Schichthöhe) und horizontalen Ausdehnung des durchflossenen Querschnitts (Durchflussbreite). Er beschreibt somit diejenige Menge an Kaltluft in der Einheit m³, die in jeder Sekunde über eine Breite von 1 m strömt"
  „Da er ein über die Höhe integrierter Parameter ist, erfolgt keine Darstellung für das Dachniveau. Abgebildet sind alle Zellen des 10m x 10m Rasters mit einem Wert von >7 m³/s, für die eine potenzielle klimaökologische Wirksamkeit bestimmt wird."
  „Das Windfeld in Form der Strömungsrichtung und Strömungsgeschwindigkeit wird über die Pfeilrichtung und Pfeillänge in Form von Vektoren für alle Zellen des Modellrasters mit einer klimatisch relevanten Mindestgeschwindigkeit von ≥ 0,1 m/s abgebildet."
  „Die Einstufung der rasterbasierten Kaltluftvolumenstromdichte orientiert sich an dem in der VDI-Richtlinie 3785 Blatt 1 (VDI 2008) beschriebenen Verfahren zur Z-Transformation. … Als Resultat ergeben sich mittels dieser Methode vier Bewertungskategorien der Stufung gering / mittel / hoch / sehr hoch."
  „Die Kaltluft wirkt, abhängig von der Größe einer Kaltluft produzierenden Fläche und der umgebenden Bebauung, zwischen 50 m und 300 m in die Bebauung ein." (Zeitschnitt 22:00 Uhr) — „Die Spanne der Eindringtiefe variiert spürbar und beträgt, abhängig von den baustrukturellen Bedingungen, zwischen 100 m und mehr als 1000 m." (Zeitschnitt 04:00 Uhr)
- **Wörtlich** (Kartenbeschreibung, Definition der Karte nach VDI):
  „Entsprechend der VDI-Richtlinien 3787, Blatt1 stellt die Klimaanalysekarte „die räumlichen Klimaeigenschaften einer Bezugsfläche dar, die sich aufgrund Flächennutzung und Topografie einstellen. Dargestellt werden die thermischen, dynamischen sowie lufthygienischen Verhältnisse. Anmerkung: Die Klimaanalysekarte beinhaltet und ersetzt die ehemalige synthetische Klimafunktionskarte." (VDI 2015)"
- **Wörtlich** (Kartenbeschreibung, Begriffsdefinition Ausgleichs-/Wirkungsraum, zitiert nach Mosimann et al. 1999):
  „Ein Ausgleichsraum ist dabei ein vegetationsgeprägter, unbebauter Raum, der durch Bildung kühlerer und frischerer Luft über funktionsfähige Austauschbeziehungen lufthygienische oder bioklimatische Belastungen in Wirkungsräumen vermindern oder abbauen kann. Ein Wirkungsraum ist ein belasteter, bebauter oder zur Bebauung vorgesehener Raum, der über Luftaustauschprozesse an einen angrenzenden oder über eine Luftleitbahn erschlossenen Ausgleichsraum angebunden ist."
- **Wörtlich** (WFS-Capabilities, Dienstidentität und Lizenz):
  „<ows:Title>Klimaanalysekarten 2022 (Umweltatlas)</ows:Title>"
  „<ows:Abstract>… Die Karten der Klimaanalyse werden teilweise in einer Rasterdarstellung mit einer hohen räumlichen Auflösung von 10 m x 10 m sowie aggregiert auf etwa 25.000 Block- und Blockteilflächen angeboten.</ows:Abstract>"
  „<ows:Fees>Für die Nutzung der Daten ist die Datenlizenz Deutschland - Zero - Version 2.0 anzuwenden. Die Lizenz ist über https://www.govdata.de/dl-de/zero-2-0 abrufbar.</ows:Fees>"
  „<ows:AccessConstraints>Es gelten keine Zugriffsbeschränkungen.</ows:AccessConstraints>"
  „<DefaultCRS>urn:ogc:def:crs:EPSG::25833</DefaultCRS>" (einziges DefaultCRS im gesamten Dienst)
- **Wörtlich** (WFS-Layertitel — die amtlichen Einheiten stehen im Titel):
  „Siedlungsflächen: Lufttemperatur um 04:00 Uhr [°C] 2022" · „Siedlungsflächen: Oberflächentemperatur um 14:00 Uhr [°C] 2022" · „Siedlungsflächen: Nächtliche Abkühlung zwischen 22:00 Uhr und 04:00 Uhr [K] 2022" · „Grün- und Freiflächen: Kaltluftvolumenstromdichte um 04:00 Uhr [m³/(m*s)] 2022" · „Grün- und Freiflächen: Bewertungsindex Physiologisch Äquivalente Temperatur um 14:00 Uhr (PET) [°C] 2022" · „Verkehrsflächen: Bewertungsindex Universeller Thermischer Klimaindex um 14:00 Uhr (UTCI) [°C] 2022" · „Windfeld um 04:00 Uhr [m/s] 2022 (ab Maßstab 1:2500)"
- **Deckt in BIOME:**
  - **Einheiten, amtlich aus dem Dienst:** Lufttemperatur und Oberflächentemperatur in **°C**; nächtliche Abkühlung in **K** (Differenz, nicht °C!); Kaltluftvolumenstromdichte in **m³/(m·s)**; Windgeschwindigkeit in **m/s**; PET und UTCI in **°C**.
  - **Lagebezug: EPSG:25833 (ETRS89 / UTM 33N)** — identisch zum Baumkataster, also direkt verschneidbar.
  - **Lizenz dl-de/zero-2-0** — Weiterverwendung und Veränderung ohne Namensnennungspflicht.
  - **Drei Flächenkulissen je Thema:** `siedlg` (Siedlungsflächen), `str` (Verkehrs-/Straßenflächen), `grfrei` (Grün- und Freiflächen). BIOME muss wissen, aus welcher Kulisse ein Wert stammt — dieselbe Größe existiert dreifach.
  - **Harte Anzeigeschwellen, die BIOME übernehmen kann:** Windvektoren erst ab ≥ 0,1 m/s; Kaltluftvolumenstromdichte erst ab > 7 m³/s je Rasterzelle; Bezugsmittelwert der nächtlichen Überwärmung = 17,5 °C um 04:00 Uhr über alle Siedlungs- und Verkehrsflächen.
  - **Vier belegte Klassen** der Kaltluftvolumenstromdichte: `gering` / `mittel` / `hoch` / `sehr hoch` (Z-Transformation nach VDI 3785 Blatt 1). Die Klassengrenzen selbst stehen in einer Bildtabelle und wurden **nicht** ausgelesen.
  - **Belegte Reichweiten für Wirkungsaussagen:** Kaltlufteinwirkung 50–300 m um 22:00 Uhr, 100 bis > 1000 m um 04:00 Uhr.
  - **Zwei belegte Begriffe für ein BIOME-Raumtypfeld:** `Ausgleichsraum`, `Wirkungsraum`, jeweils mit der oben wörtlich zitierten Definition.
- **Deckt ausdrücklich nicht:**
  - **Der Kartenwert ist kein Messwert an einem Punkt.** Die Quelle sagt selbst: nur „für größere Gebiete mit einheitlicher bzw. entsprechender Landnutzung mit bodengebundenen Messwerten vergleichbar". BIOME darf einen Rasterwert **nicht** als erwartete Temperatur an einem Einzelbaum, an einer Bank oder an einer Haustür ausgeben und nicht gegen einen BIOME-Sensor validieren.
  - **Oberflächentemperatur ≠ Lufttemperatur** — ausdrücklich untersagt gleichzusetzen.
  - **Die Klimaanalysekarte (04.10.7) ist bewusst keine Bewertung.** Handlungsempfehlungen stehen erst in der Planungshinweiskarte 04.11, die hier **nicht** abgerufen wurde. Jede BIOME-Empfehlung („hier Baum pflanzen") ist aus 04.10 **nicht** ableitbar.
  - Die Klassengrenzen der PET-/UTCI-Belastungsstufen (Tab. 4 und 5) und der Kaltluftvolumenstrom-Klassen stehen in Bilddateien und sind damit hier nicht belegt.
  - Der Dienst listet in den Capabilities keine `FeatureType`-Namen mit dem erwarteten `wfs:`-Präfix aus; die Layernamen wurden aus den `<Name>`-Elementen gelesen (z. B. `ua_klimaanalyse_2022:fa_ua_lufttemp_siedlg_t2m_04h_2022`). Ein `DescribeFeatureType` je Layer wurde **nicht** ausgeführt — die Attributschemata sind damit unbelegt.

### KLIM-OGC-09 · SensorThings API — die Kernbegriffe des Sensordatenmodells
- **Herausgeber:** Open Geospatial Consortium, „OGC SensorThings API Part 1: Sensing Version 1.1", OGC-Dokument 18-088, Approved OGC® Implementation Standard, Publication Date 2021-08-04, Editors Steve Liang, Tania Khalafbeigi, Hylke van der Schaaf
- **Quelle:** https://docs.ogc.org/is/18-088/18-088.html
- **Abgerufen:** 2026-08-09 (HTTP 200, 1.730.821 Byte)
- **Wörtlich** (Modellüberblick, Abschnitt 8.1):
  „The Sensing part is designed based on the OGC/ISO Observation and Measurement (O&M) model [OGC 10-004r3 and ISO 19156:2011]. The key to the model is that an Observation is modeled as an act that produces a result whose value is an estimate of a property of the observation target or FeatureOfInterest. An Observation instance is classified by its event time (e.g., resultTime and phenonmenonTime), FeatureOfInterest, ObservedProperty, and the procedure used (often a Sensor)."
  „A Thing also can have multiple Datastreams. A Datastream is a collection of Observations grouped by the same ObservedProperty and Sensor. An Observation is an event performed by a Sensor that produces a result whose value is an estimate of an ObservedProperty of the FeatureOfInterest."
- **Wörtlich** (8.2.1 Thing):
  „The OGC SensorThings API follows the ITU-T definition, i.e., with regard to the Internet of Things, a thing is an object of the physical world (physical things) or the information world (virtual things) that is capable of being identified and integrated into communication networks [ITU-T Y.2060]."
  Pflichtfelder: „name — A property provides a label for Thing entity, commonly a descriptive name. CharacterString — One (mandatory)"; „description — This is a short description of the corresponding Thing entity. CharacterString — One (mandatory)"; optional „properties — A JSON Object containing user-annotated properties as key-value pairs."
  Beziehungen: „The Location entity locates the Thing. Multiple Things MAY be located at the same Location. A Thing MAY not have a Location. A Thing SHOULD have only one Location." · „A Thing MAY have zero-to-many Datastreams."
- **Wörtlich** (8.2.2 Location):
  „The Location entity locates the Thing or the Things it associated with. A Thing's Location entity is defined as the last known location of the Thing."
- **Wörtlich** (8.2.4 Datastream):
  „A Datastream groups a collection of Observations measuring the same ObservedProperty and produced by the same Sensor."
  „unitOfMeasurement — A JSON Object containing three key-value pairs. The name property presents the full name of the unitOfMeasurement; the symbol property shows the textual form of the unit symbol; and the definition contains the URI defining the unitOfMeasurement. The values of these properties SHOULD follow the Unified Code for Unit of Measure (UCUM). JSON Object — One (mandatory)"
  „Note: When a Datastream does not have a unit of measurement (e.g., a OM_TruthObservation type), the corresponding unitOfMeasurement properties SHALL have null values."
  „observationType — The type of Observation (with unique result type), which is used by the service to encode observations. ValueCode — One (mandatory)"
  „observedArea — The spatial bounding box of the spatial extent of all FeaturesOfInterest that belong to the Observations associated with this Datastream."
  „phenomenonTime — The temporal interval of the phenomenon times of all observations belonging to this Datastream. TM_Period (ISO 8601 Time Interval) — Zero-to-one (optional)"
  „The Observations in a Datastream are performed by one-and-only-one Sensor." · „The Observations of a Datastream SHALL observe the same ObservedProperty." · „A Datastream has zero-to-many Observations. One Observation SHALL occur in one-and-only-one Datastream."
  Beispielwert aus dem Standard: „"unitOfMeasurement" : { "name" : "degree Celsius", "symbol" : "°C", "definition" : "http://unitsofmeasure.org/ucum.html#para-30" }"
- **Wörtlich** (8.2.5 Sensor):
  „A Sensor is an instrument that observes a property or phenomenon with the goal of producing an estimate of the value of the property."
  Pflichtfelder: `name`, `description`, „encodingType — The encoding type of the metadata property." (belegte Codes: „application/pdf", „http://www.opengis.net/doc/IS/SensorML/2.0", „text/html"), „metadata — The detailed description of the Sensor or system. The metadata type is defined by encodingType. — One (mandatory)"
- **Wörtlich** (8.2.6 ObservedProperty):
  „An ObservedProperty specifies the phenomenon of an Observation."
  „definition — The URI of the ObservedProperty. Dereferencing this URI SHOULD result in a representation of the definition of the ObservedProperty. URI — One (mandatory)"
  Ebenfalls Pflicht: `name`, `description`.
- **Wörtlich** (8.2.7 Observation):
  „An Observation is the act of measuring or otherwise determining the value of a property [OGC 10-004r3 and ISO 19156:2011]"
  „phenomenonTime — The time instant or period of when the Observation happens. … One (mandatory)"
  „result — The estimated value of an ObservedProperty from the Observation. Any (depends on the observationType defined in the associated Datastream) — One (mandatory)"
  „resultTime — The time of the Observation's result was generated. … TM_Instant (ISO 8601 Time string) — One (mandatory)"
  „resultQuality — Describes the quality of the result. DQ_Element — Zero-to-many"
  „validTime — The time period during which the result may be used."
  „parameters — Key-value pairs showing the environmental conditions during measurement."
  „Note: … When a SensorThings service receives a POST Observations without phenonmenonTime, the service SHALL assign the current server time to the value of the phenomenonTime."
  „Note: … When a SensorThings service receives a POST Observations without resultTime, the service SHALL assign a null value to the resultTime."
  „An Observation observes on one-and-only-one FeatureOfInterest."
- **Wörtlich** (8.2.8 FeatureOfInterest):
  „An Observation results in a value being assigned to a phenomenon. The phenomenon is a property of a feature, the latter being the FeatureOfInterest of the Observation [OGC and ISO 19156:2011]. In the context of the Internet of Things, many Observations' FeatureOfInterest can be the Location of the Thing."
- **Deckt in BIOME:**
  - **Das komplette Tabellenschema für Sensordaten**, eins zu eins übernehmbar:
    | BIOME-Tabelle | Pflichtspalten (SHALL) | Kardinalität |
    |---|---|---|
    | `thing` | `name`, `description` | 0..n Datastreams, 0..1 Location empfohlen |
    | `location` | (letzte bekannte Lage des Thing) | 1 Thing SHOULD 1 Location |
    | `sensor` | `name`, `description`, `encoding_type`, `metadata` | 1 Sensor → n Datastreams |
    | `observed_property` | `name`, `definition` (URI!), `description` | 1 → n Datastreams |
    | `datastream` | `name`, `description`, `unit_of_measurement` (JSON mit name/symbol/definition), `observation_type` | genau 1 Thing, genau 1 Sensor, genau 1 ObservedProperty |
    | `observation` | `phenomenon_time`, `result`, `result_time` | genau 1 Datastream, genau 1 FeatureOfInterest |
  - **Die harte Integritätsregel: ein Datastream = eine ObservedProperty × ein Sensor.** Ein BIOME-„Messreihe"-Datensatz, der Temperatur und Feuchte desselben Geräts in einen Strom schreibt, ist nach diesem Standard falsch modelliert.
  - **`observed_property.definition` ist eine Pflicht-URI, kein Freitext.** BIOME darf „Lufttemperatur" nicht als bloßen String führen; es braucht eine auflösbare Definitions-URI.
  - **Einheiten sind ein Objekt aus drei Feldern** (`name`, `symbol`, `definition`), nicht ein String. Nullwerte nur bei Datenströmen ohne Einheit.
  - **`result_quality` und `parameters` sind die belegten Orte** für Messgüte bzw. Randbedingungen der Messung — BIOME braucht dafür keine eigenen Erfindungen.
  - **Zeitstempel-Datentypen:** `phenomenonTime` ist ein Zeitpunkt **oder** ein Intervall (ISO 8601), `resultTime` immer nur ein Zeitpunkt.
  - **Lizenz:** Der Standard trägt eine gebührenfreie Lizenz („available on a royalty free, non-discriminatory basis").
- **Deckt ausdrücklich nicht:**
  - Keine Vorgabe, **welche** ObservedProperties oder Einheiten für Stadtklima zu verwenden sind. Der Standard liefert den Rahmen, nicht den Katalog.
  - Keine Kalibrier- oder Wartungsentität. Sensorkalibrierung existiert im Modell nur als Freitext in `Sensor.metadata` oder in `properties`.
  - Keine Vorgabe für Messhöhe, Standortgüte oder Aggregation.

### KLIM-OGC-10 · resultTime gegen phenomenonTime — die maßgebliche Abgrenzung
- **Herausgeber:** Open Geospatial Consortium, „OGC Abstract Specification Topic 20: Observations, measurements and samples", OGC-Dokument 20-082r4, Version 3.0.0, Publication Date 2023-05-26, Editors Katharina Schleidt, Ilkka Rinne (identisch mit ISO/DIS 19156)
- **Quelle:** https://docs.ogc.org/as/20-082r4/20-082r4.html
- **Abgerufen:** 2026-08-09 (HTTP 200, 12.247.959 Byte)
- **Wörtlich** (Abschnitt 8.2.3 „Attribute phenomenonTime"):
  „If the phenomenonTime is described, this shall be provided by the attribute phenomenonTime:TM_Object"
  „1: The phenomenonTime is often the time of interaction with a real-world feature either by a SamplingProcedure (time at which a Sample has been taken) or by an ObservingProcedure."
  „2: If the result is the average of multiple samples taken at different times, then the phenomenonTime is the time interval over which these measurements were taken."
  „An Observation shall have exactly 1 phenomenonTime."
- **Wörtlich** (Abschnitt 8.2.4 „Attribute resultTime"):
  „EXAMPLE 1 The resultTime typically corresponds to when the Procedure associated with the Observation was completed. For some observations this is identical to the phenomenonTime. However, there are important cases where they differ."
  „EXAMPLE 2 Where a measurement is made on a specimen in a laboratory, the phenomenonTime is the time the specimen was retrieved from its host, while the resultTime is the time the laboratory procedure was applied."
  „EXAMPLE 3 The resultTime also supports disambiguation of repeat measurements made of the same property of a feature using the same procedure."
  „EXAMPLE 4 Where sensor observation results are post-processed, the resultTime is the post-processing time, while the phenomenonTime is the time of initial interaction with the world."
  „EXAMPLE 5 Simulations can be used to estimate the values for phenomena in the future or past. The phenomenonTime is the time to which the result applies, while the resultTime is the time at which the simulation was executed."
  „An Observation shall have exactly 1 resultTime."
- **Wörtlich** (Abschnitt 3, Terms and Definitions — die tragenden Begriffe):
  „3.8 feature-of-interest — subject of the observation"
  „3.13 observation — act carried out by an observer to determine the value of an observable property of an object (feature-of-interest) by using a procedure, with the value provided as the result"
  „3.14 observation result — estimate of the value of a property determined through a known observation procedure"
  „3.15 observer — identifiable entity that can generate observations pertaining to an observable property by implementing a procedure. Note 1 to entry: An observer is an instance of a sensor, instrument, implementation of an algorithm or a being such as a person."
  „3.16 procedure — specified way to carry out an activity or a process [SOURCE: ISO 9000:2015, 3.4.5 …]"
  „3.18 property — facet or attribute of an object referenced by a name. Note 1 to entry: In some communities, the observed property is referred to as the measurand."
  „3.24 sensor — element of a measuring system that is directly affected by a phenomenon, body, or substance carrying a quantity to be measured [SOURCE: JCGM 200:2012, 3.8 …]"
  „3.26 unit of measure — reference quantity chosen from a unit equivalence group"
  „3.10 in situ — on-site — referring to the study, maintenance or conservation of a specimen or population without removing it from its natural surroundings"
- **Deckt in BIOME:**
  - **Zwei Zeitspalten, nicht eine, und ihre Semantik ist verbindlich verschieden:**
    - `phenomenon_time` = Zeit, **für die** das Ergebnis gilt (Interaktion mit der Welt). Bei Mittelwerten ein **Intervall**.
    - `result_time` = Zeit, **zu der** das Ergebnis entstand (Abschluss der Prozedur, Nachverarbeitung, Laborlauf, Simulationslauf).
  - **Konkrete BIOME-Fälle, direkt aus den EXAMPLES ableitbar:**
    - Ein 10-Minuten-Mittel eines Bodenfeuchtesensors: `phenomenon_time` = das 10-Minuten-Intervall, `result_time` = Ende der Mittelung.
    - Eine nachträglich kalibrierte oder korrigierte Messreihe (EXAMPLE 4): `result_time` wandert auf den Zeitpunkt der Nachverarbeitung, `phenomenon_time` bleibt.
    - Ein Modellwert wie die Berliner FITNAH-Klimaanalyse (EXAMPLE 5): `phenomenon_time` = der modellierte Zeitpunkt (04:00 Uhr), `result_time` = 2022, der Zeitpunkt des Modelllaufs. **Damit ist auch ein Modellergebnis sauber in das Sensordatenmodell einzuhängen.**
    - Wiederholmessungen am selben Objekt mit derselben Prozedur werden über `result_time` unterschieden (EXAMPLE 3) — das ist die belegte Eindeutigkeitsregel für BIOME-Duplikate.
  - **Beide Felder sind Pflicht („exactly 1").** Ein BIOME-Messwert ohne beide Zeiten ist nicht standardkonform. (Achtung Abweichung: SensorThings erlaubt beim POST das Weglassen und setzt dann `resultTime = null` — KLIM-OGC-09.)
  - **Begriffsdefinitionen für die BIOME-Dokumentation**, wörtlich belegt: Beobachtung, Beobachtungsergebnis („estimate", also ausdrücklich eine Schätzung), Beobachter (schließt Menschen ausdrücklich ein — deckt BIOME-Handerfassung), Prozedur, Sensor, Maßeinheit, in situ.
  - **„observation result = estimate of the value"** — BIOME darf einen Sensorwert nirgends als „den wahren Wert" beschriften.
- **Deckt ausdrücklich nicht:**
  - Kein Vokabular für konkrete Eigenschaften oder Einheiten.
  - Keine Aussage zu Zeitzonen-Handhabung oder zur Auflösung von Zeitstempeln (das regelt ISO 8601, hier nur referenziert).
  - Die zugrunde liegende Norm **ISO 19156** selbst wurde nicht geöffnet (siehe „Nicht zugänglich"); dieser OGC-Text ist die frei zugängliche, inhaltsgleiche Abstract Specification.

### KLIM-OGC-11 · unitOfMeasurement — UCUM als belegtes Einheitensystem
- **Herausgeber:** Regenstrief Institute, Inc. und die UCUM Organization, „The Unified Code for Units of Measure"
- **Quelle:** https://ucum.org/ucum (identischer Inhalt unter https://unitsofmeasure.org/ucum)
- **Abgerufen:** 2026-08-09 (HTTP 200, 545.570 Byte)
- **Wörtlich** (Abschnitt 1, Introduction):
  „The Unified Code for Units of Measure is a code system intended to include all units of measures being contemporarily used in international science, engineering, and business. The purpose is to facilitate unambiguous electronic communication of quantities together with their units. The focus is on electronic communication, as opposed to communication between humans."
- **Wörtlich** (Tabelle der SI-Einheiten, Zeile Grad Celsius, Spalten Name | Kind of quantity | print symbol | c/s | c/i | metric | value | definition):
  „degree Celsius | temperature | °C | Cel | CEL | yes | • | cel(1 K)"
- **Wörtlich** (Copyright):
  „Copyright © 1998-2024, Regenstrief Institute, Inc. and the UCUM Organization. All rights reserved." · „See https://unitsofmeasure.org/license for the full UCUM License and Copyright notice."
- **Deckt in BIOME:**
  - **Die Belegung des Pflichtfelds `unitOfMeasurement` aus KLIM-OGC-09** für die wichtigste BIOME-Einheit: `name` = „degree Celsius", `symbol` = „°C" (Druckzeichen), UCUM-Code (case sensitive) = **`Cel`**, case insensitive = `CEL`.
  - **Wichtig für die Datenhaltung:** Der UCUM-Code für Grad Celsius ist **`Cel`, nicht `°C` und nicht `C`** (`C` ist Coulomb). Ein BIOME-Feld, das „°C" als maschinellen Einheitencode speichert, ist nicht UCUM-konform.
- **Deckt ausdrücklich nicht:**
  - Die UCUM-Codes für die übrigen BIOME-Einheiten (m/s, mm, hPa, %, m³/(m·s), K, m³/m³) wurden **nicht** einzeln aus der Tabelle verifiziert und sind damit hier nicht belegt.
  - UCUM ist im SensorThings-Standard nur ein „SHOULD", keine Pflicht.

### KLIM-BF-12 · Bodenfeuchte — dielektrische Verfahren und die Kalibrierfrage
- **Herausgeber:** (a) WMO, „Guide to Instruments and Methods of Observation, Volume I", 2023 edition, WMO-No. 8, Chapter 11 „Measurement of soil moisture"; (b) Kanso, T.; Tedoldi, D.; Gromaire, M.-C.; Ramier, D.; Dubois, P.; Chebbo, G. (2020): „An Investigation of the Accuracy of EC5 and 5TE Capacitance Sensors for Soil Moisture Monitoring in Urban Soils — Laboratory and Field Calibration", Sensors 20(22):6510, doi:10.3390/s20226510, Open Access unter CC BY 4.0
- **Quelle:** https://amc.namem.gov.mn/wp-content/uploads/WMO/1.%208_I-2023_en.pdf (PDF-S. 383–390 = Druckseiten 361–368) · https://pmc.ncbi.nlm.nih.gov/articles/PMC7698305/
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (WMO, 11.1.1 Definitions):
  „Soil water content. An expression of the mass or volume of water in the soil, while the soil water potential is an expression of the soil water energy status. The relation between content and potential is not universal and depends on the characteristics of the local soil, such as soil density and soil texture."
  „The volumetric soil moisture content of a soil sample, θv, is defined as: θv = Vwater/Vsample … Again, the ratio is usually expressed in %, although many research communities are now adopting volumetric water content (m3/m3) as the standard for expressing soil moisture."
  „The basic technique for measuring soil water content is the gravimetric method, described in 11.2. Because this method is based on direct measurements, it is the standard with which all other methods are compared."
- **Wörtlich** (WMO, 11.3.2 „Soil water dielectrics"):
  „Therefore, the volumetric content of free soil water can be determined from the dielectric characteristics of wet soil by reliable, fast, non-destructive measurement methods … At present, two methods which evaluate soil water dielectrics are commercially available and used extensively, namely time-domain reflectometry and frequency-domain measurement."
- **Wörtlich** (WMO, 11.3.2.1 „Time-domain reflectometry"):
  „The most widely used relation between soil dielectrics and soil water content was experimentally summarized by Topp et al. (1980) … This empirical relationship has proved to be applicable in many soils, roughly independent of texture and gravel content (Drungil et al., 1989). However, soil-specific calibration is desirable for soils with low density or with a high organic content."
  „Generally, the parallel probes are separated by 5 cm and vary in length from 10 to 50 cm … The sampling volume is essentially a cylinder of a few centimetres in radius around the parallel probes (Knight, 1992)."
- **Wörtlich** (WMO, 11.3.2.2 „Frequency-domain measurement"):
  „As a single, small probe tip is used, only a small volume of soil is ever evaluated, and soil contact is therefore critical. As a result, this method is excellent for laboratory or point measurements, but is likely to be subject to spatial variability problems if used on a field scale (Dirksen, 1999)."
- **Wörtlich** (Kanso et al. 2020, Einleitung):
  „Many of these sensors assess the relative dielectric permittivity of the bulk soil … which is then converted to volumetric water content through a calibration equation. Multiple studies have stressed the need of a site-specific calibration equation. Manufacturers provide calibration equations. These equations has been occasionally recognized for its over-estimation, or under-estimation of the actual water content, but also for having a lower precision than the specified ± 0.03 m3∙m−3."
- **Wörtlich** (Kanso et al. 2020, Ergebnisse und Schlussfolgerungen):
  „Thus, a soil-specific calibration could improve sensors outputs and especially for 5TE sensor. Besides, the manufacturer recommends a soil-specific calibration equation for this type of sensors to increase their accuracy."
  „Results show that field points do not completely fit into the manufacturer calibration equation even if its ± 0.03 m3∙m−3 accuracy interval is taken into account. Thus, the application of a calibration equation to a wide range of soil texture class is not accurate, as demonstrated by the present study and other research. Therefore, a soil-specific calibration equation is crucial to obtain an accurate measurement of soil water content."
  „A direct calibration method relating directly the sensor output to the volumetric water content takes into account the effect of soil texture in the interpretation. Conversely, the two-step procedure, conducted in solution, may lead to significant errors by omitting the direct effect of soil texture."
  „It should be emphasized that even with a soil-specific calibration, the uncertainty on water content measurement with this type of sensor remains significant, and often greater than that given by the manufacturer."
  „This study suggests the use of the direct procedure and a soil-specific calibration equation to obtain accurate measurements of water content. Among the direct procedures, the proposed the most reliable method is the field"
  Die untersuchten Böden sind ausdrücklich städtische Böden: „Soils used in this research are mineral urban soils with different textural classes (sandy loam, silt loam, and silt clay loam)."
- **Deckt in BIOME:**
  - **Für kapazitive / frequenzdomänen-Sensoren (der typische Low-Cost-Fall) ist die Aussage belastbar belegt:** die Herstellerkennlinie deckt nicht alle Bodenarten ab, eine bodenspezifische Kalibriergleichung ist „crucial", und die verbleibende Unsicherheit ist auch danach oft größer als die Herstellerangabe. Das Zitat stammt aus einer Studie an **städtischen** Böden — genau der BIOME-Fall.
  - **Pflichtfelder an jeder BIOME-Bodenfeuchte-Messreihe:** `sensorprinzip` ∈ {`kapazitiv/FDR`, `TDR`, `gravimetrisch`, `Tensiometer`, `Widerstandsblock`}; `kalibrierung` ∈ {`Herstellerkennlinie`, `bodenspezifisch_feld`, `bodenspezifisch_labor`, `keine`}; `bodenart` (Texturklasse); `kalibrierdatum`; `unsicherheit_m3_m3`.
  - **Rohwerte müssen als Rohwerte gespeichert und angezeigt werden.** Belegt ist: der Sensor misst eine dielektrische Größe (Permittivität bzw. Spannung), der Volumenwassergehalt entsteht erst durch eine Kalibriergleichung. BIOME darf ohne dokumentierte Kalibrierung höchstens einen relativen Trend („feuchter/trockener als gestern") ausgeben, keinen Volumenwassergehalt in m³/m³ oder %.
  - **Einheit:** Volumenwassergehalt θv in **m³/m³** (von der WMO als der von der Fachwelt übernommene Standard benannt), alternativ %. `m³/m³` ist die vorzuziehende BIOME-Einheit.
  - **Referenzverfahren für jede BIOME-Kalibrierung: die gravimetrische Methode** — von der WMO wörtlich als „the standard with which all other methods are compared" bezeichnet.
  - **Messvolumen als Pflichtangabe:** bei TDR „a cylinder of a few centimetres in radius around the parallel probes", Sondenlängen 10–50 cm bei 5 cm Stababstand; bei Frequenzdomänen-Spitzen „only a small volume of soil". Ein einzelner Sensor an einem Baum repräsentiert damit nur wenige Liter Boden.
  - **Bodenkontakt ist ein Qualitätsmerkmal**, nicht Montagedetail („soil contact is therefore critical") — BIOME braucht ein Einbau-Protokollfeld.
- **Deckt ausdrücklich nicht:**
  - **Der Auftragssatz „auch TDR-Sensoren müssen bodenartabhängig kalibriert werden" ist so nicht belegbar — die frei zugängliche Quelle sagt für TDR das Gegenteil in der Tendenz.** Die WMO schreibt zur Topp-Gleichung: „roughly independent of texture and gravel content", und schränkt nur ein: „soil-specific calibration is desirable for soils with low density or with a high organic content". „Desirable" ist keine Pflicht. Für TDR ist in BIOME also belegbar: bodenspezifische Kalibrierung ist bei lockeren und humusreichen Böden nötig — bei Stadtbaumsubstraten und Kompostanteilen ist das der Regelfall, aber das ist eine Ableitung, kein Beleg.
  - Kein Beleg für Zahlenwerte einer konkreten Kalibriergleichung für Berliner Stadtböden oder Baumsubstrate.
  - Keine Aussage über Temperatur- und Salzgehaltsabhängigkeit der Sensoren (in der Literatur benannt, hier nicht wörtlich erfasst).
  - Der Kanso-Artikel prüft zwei konkrete Sensormodelle (METER EC5, 5TE). Eine Übertragung auf beliebige Billigsensoren ist eine Annahme.

### KLIM-BF-13 · Der DWD misst keine Bodenfeuchte — er rechnet sie, in %nFK, für zwei Modellböden
- **Herausgeber:** Deutscher Wetterdienst, CDC, Datensatzbeschreibung „Berechnete historische Tageswerte von charakteristischen Elementen aus dem Boden und dem Pflanzenbestand", Version v2, Ausgabedatum 2024-01-01
- **Quelle:** https://opendata.dwd.de/climate_environment/CDC/derived_germany/soil/daily/historical/BESCHREIBUNG_derived_ermany_soil_daily_historical_de_v2.pdf (Dateiname im Original mit Tippfehler „ermany")
- **Abgerufen:** 2026-08-09 (HTTP 200, 23.480 Byte)
- **Wörtlich** (Zusammenfassung):
  „Für verschiedene Orte in Deutschland wurden Verdunstungswerte, Bodenfeuchte und -temperaturwerte berechnet. Die Werte können für viele Fragestellungen des Wasser- und Wärmehaushaltes verwendet werden und werden normalerweise messtechnisch nicht erfasst."
- **Wörtlich** (Datensatzbeschreibung):
  „Parameter — Frosteindringtiefe, Reale Verdunstung, Erdbodentemperatur, Potentielle Verdunstung, Erdbodenfeuchte"
  „Einheit(en) — % nFK, mm, °C, cm"
  „Zeitliche Abdeckung — 1991-01-01 --"
- **Wörtlich** (Datenherkunft — die entscheidende Stelle):
  „Alle berechneten Werte zur Bodenfeuchte und der Evapotranspiration stammen aus dem agrarmeteorologischen Modell AMBAV. Der im Modell benutze Boden lehmiger Schluff hat ein Welkepunkt von 13 Volumen% und eine Feldkapazität von 37 Volumen% und der lehmige Sand einen Welkepunkt von 3 Volumen% und eine Feldkapazität von 17 Volumen%."
- **Wörtlich** (Unsicherheiten):
  „Die Güte der berechneten Werte hängt zum einen von der Modellgüte aber auch von der Güte des verwendeten Modellinputs ab."
  „Die berechneten Bodenfeuchten werden nur punktuell bei Sondermeßkampagnen überprüft und zeigen auch hier gute Übereinstimmung."
- **Wörtlich** (Parameterliste, Auszug):
  „- Bodenfeuchte unter Gras bei lehmigem Schluff zwischen 0 - 10cm (BFGL01_AG) in %nFK" (analog 10-20, 20-30, 30-40, 40-50, 50-60 cm)
  „- Bodenfeuchte unter Gras und Sandboden (0-60 cm) (BFGS_AG) in %nFK"
  „- Bodenfeuchte unter Gras und lehmigem Schluff (0-60 cm) (BFGL_AG) in %nFK"
  „- Bodenfeuchte unter Wintergetreide und Sandboden (0-60 cm) (BFWS_AG) in %nFK"
  „- mittlere Bodentemperatur eines typischen unbewachsenen Bodens in 5 cm Tiefe (TS05) in °C" (analog 10, 20, 50 cm, 1 m)
- **Deckt in BIOME:**
  - **Der Beleg dafür, dass Bodenfeuchte ohne Bodenangabe bedeutungslos ist**, aus amtlicher Quelle: derselbe DWD-Wert in %nFK bedeutet bei lehmigem Schluff (Welkepunkt 13 Vol.-%, Feldkapazität 37 Vol.-%) einen völlig anderen Volumenwassergehalt als bei lehmigem Sand (3 Vol.-% / 17 Vol.-%). Das ist die Zahl, mit der BIOME die Kalibrierpflicht aus KLIM-BF-12 gegenüber Nutzern begründen kann.
  - **Zwei Einheitensysteme, die BIOME strikt trennen muss:** `%nFK` (Anteil der nutzbaren Feldkapazität, bodenabhängig, DWD-Produkt) und `m³/m³` bzw. Volumen-% (absoluter Volumenwassergehalt, Sensorgröße aus KLIM-BF-12). **Eine Umrechnung zwischen beiden ist nur mit bekanntem Welkepunkt und bekannter Feldkapazität möglich.**
  - **Feld `datenherkunft` ∈ {`gemessen`, `modelliert`}** an jedem BIOME-Bodenfeuchtewert. Der DWD-Wert ist modelliert (AMBAV), nicht gemessen — der DWD sagt selbst, solche Werte würden „normalerweise messtechnisch nicht erfasst".
  - **Belegte Tiefenstufen des DWD-Produkts:** 0-10, 10-20, 20-30, 30-40, 40-50, 50-60 cm sowie das Integral 0-60 cm; Bodentemperaturen in 5, 10, 20, 50 und 100 cm.
  - **Belegte Bestandsvarianten:** Gras, Wintergetreide, Mais — jeweils über Sandboden oder lehmigem Schluff. **Es gibt keine Variante „Baum" und keine Variante „Stadtboden".**
  - Zeitliche Abdeckung des Produkts: ab 1991-01-01.
- **Deckt ausdrücklich nicht:**
  - **Keine Übertragbarkeit auf Stadtbäume.** Die verfügbaren Kombinationen sind landwirtschaftlich/grasbestanden auf zwei idealisierten Böden. Ein BIOME-Bewässerungshinweis für einen Straßenbaum ist aus diesem Produkt **nicht** ableitbar.
  - Keine Validierungszahl. Die Quelle sagt nur „nur punktuell bei Sondermeßkampagnen überprüft" und „gute Übereinstimmung", ohne Fehlermaß.
  - Die Modellbeschreibungen AMBAV und AMBETI selbst wurden nicht gelesen (die Datei `AMBETI.pdf` liegt im selben Verzeichnis, wurde aber nicht abgerufen).

## Nicht zugänglich

| Norm/Quelle | Warum | Status | Was dadurch in BIOME NICHT belegbar ist |
|---|---|---|---|
| WMO-No. 8 „Guide to Instruments and Methods of Observation" von der WMO-eigenen Bibliothek | `library.wmo.int` beantwortet automatisierte Abrufe mit einer Slider-Captcha-Seite („Verification in progress … Please complete the slider below to prove you are human", `POST /api/is_human_challenge`). Getestet: `/records/item/68661-…`, `/records/item/68695-…`, `/viewer/68661`, `/viewer/68661/download?file=…`, `/idurl/4/68661`, `/api/records/68661`, `/doc_num.php?explnum_id=12407`. Auch WebFetch erhielt nur die Captcha-Hülle. | Jeweils HTTP 200 mit 10.535 Byte Captcha-Seite (bzw. HTTP 404 bei `/api/…` und `doc_num.php`) | Nichts inhaltlich — der Volltext der Ausgabe 2023 liegt über die NAMEM-Spiegelung vor (KLIM-WMO-06). Aber: **kein Zitat direkt von der Herausgeberquelle.** Für eine förmliche Normreferenz in BIOME-Dokumentation ist das nachzuholen (manueller Download über einen Browser). |
| WMO-No. 8, Volume I, Annex 1.D „Siting classification for surface observing stations on land" | Im heruntergeladenen PDF enthalten, aber nicht ausgewertet — außerhalb des Auftragsumfangs und ohne Prüfung nicht zitierbar. | Nicht gelesen | Standortgüteklassen 1–5 für BIOME-Sensorstandorte. Eine Aussage „unser Sensor entspricht Klasse 2" ist nicht gedeckt. |
| DWD VuB 2 „Wetterschlüsselhandbuch" (Band D, Nov 2013), VuB 3 „Beobachterhandbuch (BHB)" (März 2014), VuB 3 „Technikerhandbuch (THB)" (März 2014) | In der DWD-Datensatzbeschreibung als Ort der „Genaueren Angaben zu den aktuellen Beobachtungs- und Messverfahren" benannt. Kein freier Downloadort gesucht/gefunden. | Nicht abgerufen | Die genauen Mess- und Beobachtungsvorschriften hinter den DWD-Tageswerten: Fühlerhütten-Typ, Strahlungsschutz, Abtastrate, Mittelungsverfahren im Detail. BIOME darf nicht behaupten, eigene Messungen seien „nach DWD-Vorschrift" erhoben. |
| VDI 3787 Blatt 1 „Umweltmeteorologie — Klima- und Lufthygienekarten für Städte und Regionen" (2015-09, 54 S.) | Kostenpflichtig. Produktseite abrufbar, Volltext nur nach Kauf: „Preis ab 145,40 EUR inkl. MwSt.", Bezug über DIN Media. Herausgeber: VDI/DIN-Kommission Reinhaltung der Luft. | Produktseite HTTP 200; Volltext nicht abrufbar | Die normative Definition von Klimaanalysekarte, Klimafunktionskarte und Planungshinweiskarte. In BIOME nur der eine Satz nutzbar, den der Umweltatlas daraus zitiert (KLIM-BE-08). Die Kartentypologie insgesamt, die Legendenvorgaben und die Bewertungsverfahren sind unbelegt. |
| VDI 3785 Blatt 1 „Umweltmeteorologie — Methodik und Ergebnisdarstellung von Untersuchungen zum planungsrelevanten Stadtklima" (2008-12, 36 S.) | Kostenpflichtig: „Preis ab 109,80 EUR inkl. MwSt.", Bezug über DIN Media. | Produktseite HTTP 200; Volltext nicht abrufbar | Das Z-Transformationsverfahren, auf das sich die vierstufige Klassifikation der Kaltluftvolumenstromdichte in der Berliner Klimaanalyse stützt. BIOME kann die vier Klassennamen anzeigen, aber ihre Grenzen und ihre Herleitung nicht erklären oder nachrechnen. |
| ISO 19156 „Geographic information — Observations and measurements" | `https://www.iso.org/standard/32574.html` antwortet auf automatisierte Abrufe mit HTTP 403. Die Norm ist zudem kostenpflichtig. | HTTP 403 | Nichts Inhaltliches — die frei zugängliche OGC Abstract Specification Topic 20 (KLIM-OGC-10) ist die inhaltsgleiche Fassung. Für ein ISO-Normzitat in BIOME-Dokumentation reicht das nicht. |
| Umweltatlaskarte 04.12 (meteorologische Kennwerte Hitzetage/Sommertage/Tropennächte für 1971-2000, 2031-2060, 2071-2100) | Im Umweltatlas-Text als zuständige Karte benannt, aber im Rahmen dieses Auftrags nicht geöffnet. | Nicht abgerufen | Berliner Kennwerte für Sommertage/Heiße Tage/Tropennächte inkl. Zukunftsperioden aus dem Umweltatlas. BIOME muss dafür bis auf Weiteres die DWD-Stationswerte 1991-2020 nutzen (KLIM-DWD-05) und darf beide Quellen nicht mischen — sie haben verschiedene Bezugszeiträume. |
| Umweltatlaskarte 04.11 „Planungshinweise Stadtklima 2022" | Vom Kartenbeschreibungstext mehrfach als die Ebene benannt, auf der die Bewertung stattfindet. Nicht abgerufen. | Nicht abgerufen | **Jede Handlungsempfehlung.** Solange 04.11 nicht ausgewertet ist, darf BIOME aus der Klimaanalyse keine Maßnahme, keine Priorisierung und keine Planungsaussage ableiten. |
| SenStadt 2025b — separate Auswertung der langjährigen DWD-Messreihen für vier Klimareferenzperioden an den Stationen Buch, Tegel, Tempelhof, Alexanderplatz, Dahlem | In Datengrundlage und Kartenbeschreibung als eigene Quelle referenziert, kein direkter Link auf der abgerufenen Seite verfolgt. | Nicht abgerufen | Die Berliner Perioden-Auswertung, die dem Modellantrieb zugrunde liegt. Die Zahl „21,2 °C bzw. 20,7 °C um 21 Uhr" ist über KLIM-BE-07 belegt, ihre Herleitung nicht. |
| Klassengrenzen-Tabellen der Berliner Klimaanalyse (Tab. 3 Kaltluftvolumenstromdichte, Tab. 4 PET-Schwellenwerte, Tab. 5 UTCI-Schwellenwerte) | Im Umweltatlas als Bilddateien eingebunden („Bild: Umweltatlas Berlin"), nicht als Text. Die zugehörigen XLSX-Tabellen (`t0410_1_2022.xlsx` u. a.) sind verlinkt, wurden aber nicht heruntergeladen und geöffnet. | Seiten HTTP 200, Werte nicht als Text vorhanden | Die numerischen Grenzen der PET- und UTCI-Belastungsstufen und der Kaltluftklassen. BIOME darf keine farbige Ampel „starke Wärmebelastung ab X °C PET" anzeigen. |
| DWD-Modellbeschreibungen AMBAV und AMBETI | `AMBETI.pdf` liegt im selben opendata-Verzeichnis wie die Bodenfeuchte-Beschreibung, wurde aber nicht abgerufen; AMBAV wurde nicht gesucht. | Nicht abgerufen | Wie die %nFK-Werte des DWD zustande kommen und für welche Standorte sie gültig sind. |
| ISO 11461 (Bestimmung des Bodenwassergehalts als Volumenanteil) und vergleichbare DIN/ISO-Bodenmessnormen | Nicht gesucht, vermutlich kostenpflichtig. | Nicht abgerufen | Ein Normbezug für das BIOME-Bodenfeuchte-Erfassungsverfahren. Die Deckung stammt derzeit aus WMO-No. 8 und einer Zeitschriftenveröffentlichung (KLIM-BF-12), nicht aus einer Norm. |

## Offene Fragen an Malte

- **Welche Referenzperiode ist die BIOME-Leitperiode?** Frei belegbar sind drei nebeneinander benutzte Zeiträume: DWD-Monitoring 1991-2020, DWD-Langfristvergleich 1961-1990, Umweltatlas-Kennwerte 1971-2000. Wenn BIOME „5 Sommertage mehr als normal" anzeigt, muss genau eine davon die Leitperiode sein und die Angabe muss an der Zahl kleben. Mein Vorschlag: 1991-2020 als Leitperiode, 1961-1990 nur in einer expliziten „Langfristvergleich"-Ansicht.
- **Tropennächte: Stundenwerte holen oder das Feld streichen?** Die DWD-Definition verlangt das Fenster 18–06 UTC; die frei verfügbaren Tageswerte liefern nur ein 00–24-UTC-Minimum, und im Normalwert-Verzeichnis 1991-2020 gibt es **keine** Tropennacht-Datei. Entweder BIOME zieht die stündlichen Stationsdaten (`climate/hourly/air_temperature`) und rechnet selbst — dann braucht es einen eigenen Verarbeitungsschritt —, oder das Feld „Tropennächte" fällt in Welle 1 weg. Eine Näherung aus `TNK` wäre eine stille Falschangabe.
- **„Hitzetag" aus der Oberfläche entfernen?** Der Begriff existiert im DWD-Lexikon nicht (HTTP 404); der amtliche Begriff ist „Heißer Tag". Der Berliner Umweltatlas benutzt allerdings „Hitzetage". Soll BIOME durchgängig „Heißer Tag" schreiben und „Hitzetag" nur als Suchsynonym führen?
- **Wie weit darf BIOME die Klimaanalysekarte auf einen Einzelbaum herunterbrechen?** Die Quelle sagt ausdrücklich, die simulierten Temperaturen seien nur für „größere Gebiete mit einheitlicher … Landnutzung" mit Messwerten vergleichbar. Trotzdem ist die naheliegende BIOME-Funktion „welche Temperatur hat es nachts an diesem Baum". Ich schlage vor: Anzeige nur auf Blockteilflächen-Ebene mit sichtbarem Hinweis, keine Punktabfrage. Einverstanden?
- **Modellwerte und Messwerte im selben Datenmodell — ja oder nein?** OGC-Topic-20 EXAMPLE 5 deckt es sauber ab (`phenomenonTime` = modellierter Zeitpunkt, `resultTime` = Modelllauf). Damit könnte BIOME FITNAH-Rasterwerte und eigene Sensoren in derselben `observation`-Tabelle führen, unterschieden über `sensor`/`procedure`. Das ist elegant, aber verwechslungsanfällig in der Oberfläche. Soll ich es so bauen oder zwei getrennte Speicher?
- **Bodenfeuchte in Welle 1: Rohwert oder Volumenwassergehalt?** Ohne bodenspezifische Kalibrierung ist ein m³/m³-Wert nicht belegbar (KLIM-BF-12), und %nFK ist ohne Welkepunkt/Feldkapazität des konkreten Substrats nicht umrechenbar (KLIM-BF-13). Vorschlag: BIOME speichert immer den Rohwert plus Kalibrierstatus und zeigt ohne Kalibrierung nur einen relativen Trend. Für echte Volumenwerte bräuchten wir je Standorttyp eine Feldkalibrierung gegen gravimetrische Proben — das ist Aufwand im Feld, keine Softwarefrage.
- **Kauf der VDI-Richtlinien?** VDI 3787 Blatt 1 (145,40 €) und VDI 3785 Blatt 1 (109,80 €), zusammen 255,20 €. Ohne sie bleiben die Kartentypologie, die Legendenvorgaben und die Klassengrenzen der Kaltluftbewertung dauerhaft unbelegt, obwohl der Berliner Umweltatlas darauf aufsetzt. Soll ich den Kauf vorbereiten?
- **Welche DWD-Station ist die BIOME-Bezugsstation für Berlin?** Aktiv sind Buch (00400), Dahlem FU (00403), Marzahn (00420), Tempelhof (00433). Die Normalwerte unterscheiden sich messbar (Sommertage 1991-2020: 50,8 / 47,7 / — / 49,5). Eine Stadt, vier Antworten. Soll BIOME die nächstgelegene Station je Objekt wählen (dann braucht die Oberfläche eine Stationsangabe an jeder Zahl) oder eine feste Referenzstation setzen?
- **WMO-No. 8 aus der Originalquelle nachziehen.** Ich habe die Ausgabe 2023 nur als Spiegelung auf einem fremden Behördenserver bekommen, weil die WMO-Bibliothek ein Captcha vorschaltet. Für förmliche Zitate in BIOME-Dokumenten sollte jemand das PDF einmal manuell über einen Browser von `library.wmo.int` laden und im Repo ablegen.
