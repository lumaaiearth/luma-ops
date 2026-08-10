# Standards-Register — Boden und Bodenleben

> Stand: 2026-08-10. Nur frei zugängliche, wörtlich belegte Quellen.
> Regel: Was hier nicht gedeckt ist, darf die BIOME-Oberfläche nicht anbieten.
>
> Abrufhinweis für Nachprüfungen: `www.berlin.de` kettet auf eine Wurzel, die im
> Container-CA-Bundle fehlt (curl-Fehler 60). Abruf daher mit
> `curl --cacert <(cat /root/.ccr/ca-bundle.crt https://curl.se/ca/cacert.pem)`.
> Die Gesetzestexte wurden nicht aus der HTML-Ansicht, sondern aus dem amtlichen
> XML-Abzug von gesetze-im-internet.de gelesen
> (`https://www.gesetze-im-internet.de/<abk>/xml.zip`), weil nur dort die Anlagen
> mit ihren Tabellen vollständig und maschinenlesbar enthalten sind.

## Gedeckte Definitionen

### BOD-DE-01 · Boden und die drei Bodenfunktionen — gesetzliche Definition
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz — Bundes-Bodenschutzgesetz (BBodSchG)
- **Quelle:** https://www.gesetze-im-internet.de/bbodschg/ · Volltext-XML: https://www.gesetze-im-internet.de/bbodschg/xml.zip (Datei `BJNR050210998.xml`)
- **Abgerufen:** 2026-08-10 (HTTP 200 / HTTP 200)
- **Wörtlich** (§ 2 Absatz 1):
  „Boden im Sinne dieses Gesetzes ist die obere Schicht der Erdkruste, soweit sie Träger der in Absatz 2 genannten Bodenfunktionen ist, einschließlich der flüssigen Bestandteile (Bodenlösung) und der gasförmigen Bestandteile (Bodenluft), ohne Grundwasser und Gewässerbetten."
- **Wörtlich** (§ 2 Absatz 2, vollständig):
  „Der Boden erfüllt im Sinne dieses Gesetzes 1. natürliche Funktionen als a) Lebensgrundlage und Lebensraum für Menschen, Tiere, Pflanzen und Bodenorganismen, b) Bestandteil des Naturhaushalts, insbesondere mit seinen Wasser- und Nährstoffkreisläufen, c) Abbau-, Ausgleichs- und Aufbaumedium für stoffliche Einwirkungen auf Grund der Filter-, Puffer- und Stoffumwandlungseigenschaften, insbesondere auch zum Schutz des Grundwassers, 2. Funktionen als Archiv der Natur- und Kulturgeschichte sowie 3. Nutzungsfunktionen als a) Rohstofflagerstätte, b) Fläche für Siedlung und Erholung, c) Standort für die land- und forstwirtschaftliche Nutzung, d) Standort für sonstige wirtschaftliche und öffentliche Nutzungen, Verkehr, Ver- und Entsorgung."
- **Wörtlich** (§ 2 Absatz 3):
  „Schädliche Bodenveränderungen im Sinne dieses Gesetzes sind Beeinträchtigungen der Bodenfunktionen, die geeignet sind, Gefahren, erhebliche Nachteile oder erhebliche Belästigungen für den einzelnen oder die Allgemeinheit herbeizuführen."
- **Deckt in BIOME:**
  - **Abgeschlossene Auswahlliste `bodenfunktion`** mit genau drei Obergruppen und ihren Untergruppen: `natuerlich.lebensraum`, `natuerlich.naturhaushalt`, `natuerlich.filter_puffer`, `archiv`, `nutzung.rohstoff`, `nutzung.siedlung_erholung`, `nutzung.land_forstwirtschaft`, `nutzung.sonstige`. Andere „Bodenfunktionen" (etwa „Klimafunktion", „Kohlenstoffspeicher") sind hier **nicht** gedeckt und dürfen nicht als gesetzliche Funktion beschriftet werden.
  - **Abgrenzung des Objekts „Boden":** Grundwasser und Gewässerbetten gehören nicht dazu; Bodenlösung und Bodenluft schon. Ein BIOME-Bodendatensatz darf Grundwassermesswerte nicht als Bodenwerte führen.
  - Der Begriff „schädliche Bodenveränderung" ist funktionsbezogen definiert, nicht schwellenwertbezogen — BIOME darf einen Messwertvergleich nicht automatisch als „schädliche Bodenveränderung" beschriften.
- **Deckt ausdrücklich nicht:** Zahlenwerte, Skalen, Messverfahren oder eine Bewertung der Funktionserfüllung. Das Gesetz enthält keine Bewertungsstufen für Bodenfunktionen.

### BOD-DE-02 · Oberboden, Unterboden, Untergrund, durchwurzelbare Bodenschicht
- **Herausgeber:** BMJ/BfJ — Bundes-Bodenschutz- und Altlastenverordnung (BBodSchV) vom 9. Juli 2021 (BGBl. I S. 2598), in Kraft seit 1. August 2023
- **Quelle:** https://www.gesetze-im-internet.de/bbodschv_2023/ · Volltext-XML: https://www.gesetze-im-internet.de/bbodschv_2023/xml.zip (Datei `BJNR271600021.xml`)
- **Abgerufen:** 2026-08-10 (HTTP 200 / HTTP 200)
- **Wörtlich** (§ 2 Nummern 1 bis 5):
  „1. Bodenansprache: Beschreibung von Bodenhorizonten und -profilen sowie die bodenkundliche und sensorische Beurteilung von Bodenproben in dem Umfang, in dem er jeweils für den vorsorgenden Bodenschutz oder für die Gefahrenbeurteilung nach dieser Verordnung erforderlich ist;"
  „2. Oberboden: oberer Teil des Mineralbodens, der einen der jeweiligen Bodenbildung entsprechenden Anteil an Humus und Bodenorganismen enthält und der sich meist durch dunklere Bodenfarbe vom Unterboden abhebt, in der Regel Ah-, Aa-, Al-, Ac- und Ap-Horizonte; die organischen O- und L-Horizonte zählen zum Oberboden im Sinne dieser Verordnung; Mutterboden im Sinne des § 202 Baugesetzbuch entspricht dem Oberboden;"
  „3. Unterboden: Bereich zwischen Oberboden und Untergrund, der im Allgemeinen die B-Horizonte umfasst, je nach Bodentyp auch P-, T-, S-, G-, M-, und Yo-Horizonte;"
  „4. Untergrund: Bereich unterhalb des Unterbodens mit durch Verwitterung und Bodenbildung nicht beeinflusstem Gestein, einschließlich Lockersedimenten, der in der Regel das Ausgangsgestein der Bodenbildung darstellt; in der Regel C-Horizonte; auch H-, G- und S-Horizonte, wenn bei Stau- und Grundwasserböden sowie Mooren keine C-Horizonte erkennbar sind und mehr als die Hälfte der Horizontmächtigkeit tiefer als 120 Zentimeter unterhalb der Erdoberfläche liegt;"
  „5. durchwurzelbare Bodenschicht: Bodenschicht, die von den Pflanzenwurzeln in Abhängigkeit von den natürlichen Standortbedingungen durchdrungen werden kann; sie schließt in der Regel den Oberboden und den Unterboden ein;"
- **Deckt in BIOME:**
  - **Auswahlliste `bodenbereich`** mit genau drei Werten: `oberboden`, `unterboden`, `untergrund`. Die Abgrenzung ist **horizontbezogen**, nicht tiefenbezogen — BIOME darf „Oberboden" nicht als feste Tiefenspanne (z. B. „0–30 cm") definieren.
  - **Horizontsymbole als belegte Werte:** Ah, Aa, Al, Ac, Ap, O, L (Oberboden); B, P, T, S, G, M, Yo (Unterboden); C, H, G, S (Untergrund). Ein Feld `horizont` darf diese Symbole anbieten; die Liste ist im Verordnungstext ausdrücklich mit „in der Regel"/„im Allgemeinen" relativiert und damit **nicht abgeschlossen**.
  - **Die einzige Zahl in diesen Definitionen** ist die 120-cm-Grenze, und sie gilt nur für den Sonderfall Stau-/Grundwasserböden und Moore ohne erkennbare C-Horizonte.
  - `Mutterboden` (§ 202 BauGB) ist rechtlich gleichbedeutend mit `oberboden` — BIOME darf beide nicht als getrennte Kategorien führen.
- **Deckt ausdrücklich nicht:** eine Definition von Bodentypen, Bodenarten oder eine vollständige Horizontsystematik. Die Verordnung verweist dafür auf die Kartieranleitung KA 5 (siehe BOD-DE-04 und „Nicht zugänglich").

### BOD-DE-03 · Beprobungstiefen — die einzigen amtlich festgelegten Tiefenstufen
- **Herausgeber:** BMJ/BfJ — BBodSchV, § 20, § 22 und Anlage 3 Tabelle 3 (Fundstelle laut Anlage: BGBl. I 2021, 2740–2745)
- **Quelle:** https://www.gesetze-im-internet.de/bbodschv_2023/ (Volltext-XML wie oben)
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (Anlage 3 Tabelle 3 „Nutzungsorientierte Beprobungstiefe bei Untersuchungen zu den Wirkungspfaden Boden-Mensch und Boden-Nutzpflanze", vollständig):

  | Wirkungspfad | Nutzungsarten | Beprobungstiefe |
  |---|---|---|
  | Boden-Mensch | Kinderspielflächen, Wohngebiete | 0 – 10 cm; 10 – 30 cm |
  | Boden-Mensch | Park- und Freizeitanlagen | 0 – 10 cm |
  | Boden-Mensch | Industrie- und Gewerbegrundstücke | 0 – 10 cm |
  | Boden-Nutzpflanze | Ackerflächen, Nutzgärten | 0 – 30 cm; 30 – 60 cm |
  | Boden-Nutzpflanze | Grünlandflächen | 0 – 10 cm; 10 – 30 cm |

- **Wörtlich** (Fußnoten zu Anlage 3 Tabelle 3):
  „Kontaktbereich für orale und dermale Schadstoffaufnahme, zusätzlich 0 – 2 cm bei Relevanz des inhalativen Aufnahmepfades. 30 cm durchschnittliche Mächtigkeit aufgebrachter Bodenschichten, zugleich von Kindern erreichbare Tiefe. Bei abweichender Mächtigkeit des Bearbeitungshorizontes bis zur Untergrenze des Bearbeitungshorizontes. Bei abweichender Mächtigkeit des Hauptwurzelbereiches bis zur Untergrenze des Hauptwurzelbereiches."
- **Wörtlich** (§ 20 Absatz 1 und 2):
  „(1) Böden sind in der Regel horizontweise zu beproben. Grundlage für die Ermittlung der Horizontabfolge ist die „Arbeitshilfe für die Bodenansprache im vor- und nachsorgenden Bodenschutz – Auszug aus der Bodenkundlichen Kartieranleitung KA 5". Ist eine eindeutige Horizontansprache nicht möglich, sind für den Wirkungspfad Boden-Nutzpflanze die Beprobungstiefen nach Anlage 3 Tabelle 3 heranzuziehen. (2) Zur Bestimmung der Beprobungstiefe für den Wirkungspfad Boden-Mensch gilt bei Untersuchung auf anorganische und schwerflüchtige organische Schadstoffe die Anlage 3 Tabelle 3."
- **Wörtlich** (§ 22 Absatz 2, Sätze 3 und 4):
  „Für die inhalative Aufnahme von Bodenpartikeln sind in der Regel die obersten 2 Zentimeter des Bodens maßgebend. Bei Überschreitung der Prüfwerte ist zur Bewertung der inhalativen Wirkung die Feinkornfraktion bis 63 Mikrometer heranzuziehen."
- **Deckt in BIOME:**
  - **Feld `beprobungstiefe`** als abgeschlossene Auswahlliste mit genau diesen Intervallen: `0–2 cm` (nur inhalativ), `0–10 cm`, `10–30 cm`, `0–30 cm`, `30–60 cm`. Einheit **cm**, Untergrenze inklusive/Obergrenze wie im Verordnungstext geschrieben. Freie Tiefeneingaben sind für normkonforme Werte nicht gedeckt.
  - **Pflicht-Begleitfelder:** Ein Bodenmesswert ohne `wirkungspfad` (`boden-mensch`, `boden-nutzpflanze`, `boden-grundwasser`) und ohne `nutzungsart` ist nicht interpretierbar, weil die Tiefe nutzungsabhängig festgelegt ist.
  - **Auswahlliste `nutzungsart`** — die in § 2 Nummern 18 bis 24 BBodSchV definierten und in Tabelle 3 verwendeten Werte: `kinderspielflaechen`, `wohngebiete`, `park_und_freizeitanlagen`, `industrie_und_gewerbegrundstuecke`, `ackerflaechen`, `nutzgaerten`, `gruenlandflaechen`.
  - **Vorrangregel:** horizontweise Beprobung ist der Regelfall; die Tabellentiefen greifen nur, wenn keine eindeutige Horizontansprache möglich ist (Boden-Nutzpflanze) bzw. für Boden-Mensch bei anorganischen und schwerflüchtigen organischen Schadstoffen. BIOME muss also ein Kennzeichen `tiefenbezug = horizont | tabelle` führen.
  - **Korngrößenschwelle 63 µm** für die inhalative Bewertung — belegte Einheit Mikrometer.
- **Deckt ausdrücklich nicht:** Beprobungstiefen für Wald, Straßenbegleitgrün, Baumscheiben oder Dachbegrünung. Diese Nutzungsarten kommen in der Tabelle nicht vor; für sie gibt es hier keine gedeckte Tiefenvorgabe.

### BOD-DE-04 · Untersuchungsverfahren und Bezugsgröße der Messwerte
- **Herausgeber:** BMJ/BfJ — BBodSchV, § 24 und Anlage 3 Tabelle 1
- **Quelle:** https://www.gesetze-im-internet.de/bbodschv_2023/ (Volltext-XML wie oben)
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (Anlage 3 Tabelle 1 „Verfahren zur Bestimmung der physikalisch-chemischen Eigenschaften", vollständig, Spalten Eigenschaft | Methode | Norm):

  | Eigenschaft | Methode | Norm |
  |---|---|---|
  | Bestimmung der Trockenmasse | feldfrische oder luftgetrocknete Bodenproben | DIN EN 14346:2007-03 Verfahren A; DIN EN 15934:2012-11 |
  | Organischer Kohlenstoff und Gesamtkohlenstoff nach trockener Verbrennung | luftgetrocknete Bodenproben | DIN EN 15936:2012-11; DIN 19539:2016-12 |
  | Organischer Kohlenstoff (TOC 400) nach trockener Verbrennung bis 400 °C | luftgetrocknete Bodenproben | DIN 19539:2016-12 |
  | pH-Wert (CaCl₂) | Suspension der feldfrischen oder luftgetrockneten Bodenprobe in CaCl₂-Lösung; Konzentration (CaCl₂): 0,01 mol/l | DIN EN 15933:2012-11 |
  | Bodenart | Fingerprobe im Gelände | Bodenkundliche Kartieranleitung, 5. Auflage Hannover 2009 (KA 5); Arbeitshilfe für die Bodenansprache im vor- und nachsorgenden Bodenschutz, Hannover 2009; DIN ISO 11277:2002-08 |
  | Korngrößenverteilung/Bodenart | Siebung, Dispergierung, Pipett-Analyse | DIN ISO 11277:2002-08 |
  | Korngrößenverteilung/Bodenart | Siebung, Dispergierung, Aräometermethode | DIN ISO 11277:2002-08; DIN EN ISO 17892-4:2017-04 |
  | Rohdichte | Trocknung einer volumengerecht entnommenen Bodenprobe bei 105 °C, rückwiegen | DIN EN ISO 11272:2017-07 |

- **Wörtlich** (§ 24 Absatz 3, Satz 2 und 3):
  „Die Schadstoffgehalte sind auf Trockenmasse zu beziehen, die bei 105 °C nach der DIN EN 14346 Methode A gewonnen wurde. Bei summarischen Messgrößen, wie etwa PCB, LHKW, BTEX und PAK, sind neben der Summe auch die zugrunde gelegten Einzelergebnisse anzugeben. Für die Summenbildung bleiben Ergebnisse unterhalb der Bestimmungsgrenze unberücksichtigt."
- **Wörtlich** (§ 24 Absatz 1 und § 19 Absatz 1 Satz 2):
  „Die physikalisch-chemische und chemische Analyse der Proben ist durch eine nach DIN EN ISO/IEC 17025 akkreditierte Untersuchungsstelle durchzuführen."
  „Die Probennahme ist von einer nach DIN EN ISO/IEC 17025 oder DIN EN ISO/IEC 17020 akkreditierten oder nach Regelungen der Länder gemäß § 18 Satz 2 des Bundes-Bodenschutzgesetzes notifizierten Untersuchungsstelle durchzuführen."
- **Deckt in BIOME:**
  - **Bezugsgröße aller Schadstoffgehalte: Trockenmasse, gewonnen bei 105 °C.** Ein BIOME-Feld für Schadstoffgehalte trägt die Einheit **mg/kg TM** und darf nicht ohne Umrechnungskennzeichen mit Frischmassewerten gemischt werden.
  - **`ph_wert`:** die amtlich vorgesehene Methode ist **pH in 0,01 mol/l CaCl₂-Suspension** nach DIN EN 15933. Ein BIOME-pH-Feld braucht daher ein Pflicht-Begleitfeld `ph_medium` (mindestens `CaCl2_0.01M` vs. `H2O` vs. `KCl`), weil pH(CaCl₂) und pH(H₂O) systematisch verschieden sind und die Verordnung nur ersteren adressiert.
  - **`rohdichte`:** Verfahren nach DIN EN ISO 11272:2017-07, Trocknung bei 105 °C, volumengerechte Probe. Die Verordnung nennt das Verfahren, aber **keine** Einheit und **keine** Klassengrenzen (siehe „Deckt ausdrücklich nicht").
  - **`bodenart`:** zwei belegte, ausdrücklich nebeneinander stehende Erfassungsmethoden — `fingerprobe_gelaende` (KA 5) und `korngroessenanalyse_labor` (DIN ISO 11277, Pipett- oder Aräometermethode). BIOME muss die Methode mitführen; die beiden sind nicht dasselbe Messverfahren.
  - **Summenparameter:** bei PCB, LHKW, BTEX, PAK sind Summe **und** Einzelwerte zu speichern; Werte unterhalb der Bestimmungsgrenze gehen **nicht** in die Summe ein. Das ist eine harte Regel für die Datenhaltung und für jede Aggregation in BIOME.
  - **Akkreditierungsanforderung** als Metadatum je Messwert: Labor nach DIN EN ISO/IEC 17025; Probennahme durch 17025-/17020-akkreditierte oder landesnotifizierte Stelle. Ein BIOME-Wert aus Bürgererhebung darf nicht als BBodSchV-konform ausgewiesen werden.
- **Deckt ausdrücklich nicht:**
  - Die **Wortlaute** der genannten DIN-Normen. Die BBodSchV zitiert nur Nummer und Ausgabestand; der Norminhalt ist kostenpflichtig (siehe „Nicht zugänglich"). BIOME darf aus dieser Quelle keine Messanweisung, keinen Wertebereich und keine Genauigkeitsangabe ableiten.
  - Klassengrenzen für Rohdichte, pH-Klassen, Humusklassen oder Bodenartendreieck — nichts davon steht in der Verordnung.
  - **DIN ISO 10390** (pH) wird in der BBodSchV **nicht** genannt; die Verordnung verweist für den pH-Wert auf DIN EN 15933. Wer in BIOME „pH nach DIN ISO 10390" beschriftet, hat dafür hier keine Deckung.

### BOD-DE-05 · Probennahme — Repräsentativität, Mischproben, Flächenteilung
- **Herausgeber:** BMJ/BfJ — BBodSchV, §§ 19, 21, 22, 23
- **Quelle:** https://www.gesetze-im-internet.de/bbodschv_2023/ (Volltext-XML wie oben)
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (§ 19 Absätze 2, 6, 8):
  „(2) Die Probennahme muss sicherstellen, dass die zu untersuchenden Böden oder Materialien, dem Ziel der Untersuchung entsprechend, hinreichend repräsentativ erfasst werden."
  „(6) Wenn die jeweilige Fragestellung Mischproben erfordert, sollen diese in der Regel aus 20 Einzelstichproben je Teilbereich hergestellt werden."
  „(8) Grobe Materialien mit einer Korngröße von mehr als 2 Millimetern sowie Fremdbestandteile und Störstoffe, die möglicherweise Schadstoffe enthalten oder denen diese anhaften können, sind bei Feststoffuntersuchungen aus der gesamten Probenmenge zu entnehmen und gesondert der Laboruntersuchung zuzuführen. Ihr Masseanteil an dem beprobten Bodenhorizont oder der Schichteinheit ist zu ermitteln, zu dokumentieren und bei der Bewertung der Messergebnisse einzubeziehen."
- **Wörtlich** (§ 22 Absätze 3 und 4 — Bezugsflächen):
  „(3) Beim Wirkungspfad Boden-Mensch kann bei Flächen unter 500 Quadratmetern sowie in Hausgärten oder sonstigen Gärten entsprechender Nutzung auf eine Teilung verzichtet werden. Für Flächen über 10 000 Quadratmetern sollen mindestens jedoch zehn Teilflächen beprobt werden."
  „(4) Beim Wirkungspfad Boden-Nutzpflanze ist bei Ackerflächen oder Grünlandflächen mit annähernd gleichmäßiger Bodenbeschaffenheit und Schadstoffverteilung auf Flächen bis 10 Hektar in der Regel für jeweils 1 Hektar, mindestens aber von drei Teilflächen, je eine Mischprobe nach § 19 Absatz 6 entsprechend den Beprobungstiefen zu entnehmen. Bei Flächen unter 5 000 Quadratmetern kann auf eine Teilung verzichtet werden. Für Flächen über 10 Hektar sollen mindestens jedoch zehn Teilflächen beprobt werden."
- **Wörtlich** (§ 22 Absatz 5, Sätze 2 und 3 — Tiefenintervalle im Untergrund):
  „Im Untergrund dürfen abweichend von § 20 Absatz 1 Satz 1 Proben aus Tiefenintervallen bis zu 1 Meter entnommen werden. In begründeten Fällen ist die Zusammenfassung engräumiger Bodenhorizonte oder -schichten bis zu 1 Meter Tiefenintervall zulässig."
- **Wörtlich** (§ 23 Absatz 3):
  „Repräsentative Teile der Proben sind mindestens bis zum Abschluss des Verfahrens als Rückstellproben nach der DIN 19747 aufzubewahren."
- **Deckt in BIOME:**
  - **Feld `probenart`** mit den zwei belegten Ausprägungen `einzelstichprobe` und `mischprobe`; bei `mischprobe` ein Pflichtfeld `anzahl_einzelstichproben` mit dem belegten Regelwert **20 je Teilbereich**.
  - **Bezugsflächen, wörtlich belegt und damit als Schwellen in BIOME nutzbar:** 500 m² (Boden-Mensch, Teilungsverzicht), 10 000 m² (Boden-Mensch, ab hier mindestens zehn Teilflächen), 5 000 m² (Boden-Nutzpflanze, Teilungsverzicht), 1 ha je Mischprobe und mindestens drei Teilflächen bis 10 ha, ab 10 ha mindestens zehn Teilflächen.
  - **Feldstruktur „Teilfläche":** Ein Bodenmesswert hängt nicht am Punkt allein, sondern an einer Teilfläche mit Flächengröße. BIOME braucht `teilflaeche_id` und `teilflaeche_groesse_m2`.
  - **Korngrenze 2 mm:** Material > 2 mm gehört nicht in die Feststoffprobe, sein Masseanteil ist aber zu dokumentieren → Pflichtfeld `masseanteil_grobmaterial_prozent`.
  - **Maximales Tiefenintervall im Untergrund: 1 m.**
- **Deckt ausdrücklich nicht:** eine Vorgabe zur Anzahl von Probennahmestellen je Fläche im Allgemeinen, zu Wiederholungsintervallen, zu Monitoring-Zeitreihen oder zu Probennahmezeitpunkten im Jahresverlauf. Die BBodSchV kennt keinen Erhebungsrhythmus.

### BOD-DE-06 · Vorsorgewerte — Werte, Einheit und ihre Bezugsgrößen
- **Herausgeber:** BMJ/BfJ — BBodSchV, § 3 und Anlage 1 Tabellen 1 bis 3 (Fundstelle laut Anlage: BGBl. I 2021, 2731–2733)
- **Quelle:** https://www.gesetze-im-internet.de/bbodschv_2023/ (Volltext-XML wie oben)
- **Abgerufen:** 2026-08-10 (HTTP 200)
- **Wörtlich** (Anlage 1 Tabelle 1 „Vorsorgewerte für anorganische Stoffe", Einheit laut Tabellenkopf `[mg/kg TM]`, vollständig):

  | Stoff | Bodenart Sand | Bodenart Lehm/Schluff | Bodenart Ton |
  |---|---|---|---|
  | Arsen | 10 | 20 | 20 |
  | Blei | 40 | 70 | 100 |
  | Cadmium | 0,4 | 1 | 1,5 |
  | Chrom gesamt | 30 | 60 | 100 |
  | Kupfer | 20 | 40 | 60 |
  | Nickel | 15 | 50 | 70 |
  | Quecksilber | 0,2 | 0,3 | 0,3 |
  | Thallium | 0,5 | 1 | 1 |
  | Zink | 60 | 150 | 200 |

- **Wörtlich** (Anlage 1 Tabelle 2 „Vorsorgewerte für organische Stoffe", `[mg/kg TM]`, vollständig):

  | Stoff | TOC-Gehalt ≤ 4 % | TOC-Gehalt > 4 % bis 9 % |
  |---|---|---|
  | Summe aus PCB 6 und PCB-118 | 0,05 | 0,1 |
  | Benzo(a)pyren | 0,3 | 0,5 |
  | PAK 16 | 3 | 5 |

- **Wörtlich** (§ 3 Absatz 1 Nummer 1 und Absatz 2):
  „Das Entstehen schädlicher Bodenveränderungen ist in der Regel zu besorgen, wenn 1. Böden Schadstoffgehalte aufweisen, die die Vorsorgewerte nach Anlage 1 Tabelle 1 oder 2 überschreiten,"
  „(2) Bei Böden mit naturbedingt oder großflächig siedlungsbedingt erhöhten Schadstoffgehalten besteht bei Überschreiten von Vorsorgewerten nach Anlage 1 Tabelle 1 oder 2 die Besorgnis des Entstehens schädlicher Bodenveränderungen nur dann, wenn eine erhebliche Freisetzung von Schadstoffen oder zusätzliche Einträge durch die nach § 7 Satz 1 des Bundes-Bodenschutzgesetzes Pflichtigen nachteilige Auswirkungen auf die Bodenfunktionen erwarten lassen."
- **Deckt in BIOME:**
  - **Einheit für Schadstoffgehalte: mg/kg TM.** Für Frachten (Anlage 1 Tabelle 3) lautet die belegte Einheit **g/(ha·a)**.
  - **Drei und nur drei Bodenart-Gruppen** als Bezugsgröße der anorganischen Vorsorgewerte: `Sand`, `Lehm/Schluff`, `Ton`. Ein BIOME-Vergleich gegen einen Vorsorgewert ist ohne dieses Feld nicht berechenbar.
  - **Zwei TOC-Klassen** als Bezugsgröße der organischen Vorsorgewerte: `≤ 4 %` und `> 4 % bis 9 %`. Oberhalb 9 % TOC ist **kein** Vorsorgewert festgesetzt — BIOME darf für Moor- und stark humose Böden keinen Vorsorgewertvergleich anzeigen.
  - **Semantik einer Überschreitung:** „in der Regel zu besorgen" — kein Grenzwert, keine automatische Gefahrenfeststellung. Die Ausnahme nach § 3 Absatz 2 (naturbedingt/siedlungsbedingt erhöhte Gehalte) muss BIOME als Vorbehalt anzeigen, sonst gibt die Oberfläche eine Rechtsfolge aus, die die Verordnung nicht kennt.
- **Deckt ausdrücklich nicht:** Prüf- und Maßnahmenwerte (Anlage 2) sind in dieser Verordnung ebenfalls enthalten, hier aber nicht wiedergegeben; sie sind wirkungspfad- und nutzungsspezifisch und dürfen nicht mit Vorsorgewerten in dieselbe Skala gelegt werden. Keine Aussage über Bodenwerte in Berlin, keine Messwerte, keine Flächenkulisse.
