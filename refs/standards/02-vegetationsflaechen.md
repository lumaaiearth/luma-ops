# Standards-Register — Vegetationsflächen, Biotoptypen

> Stand: 2026-08-09. Nur frei zugängliche, wörtlich belegte Quellen.
> Regel: Was hier nicht gedeckt ist, darf die BIOME-Oberfläche nicht anbieten.

Bearbeitete Teilfragen: (a) Biotoptypenliste Berlin und bundesweit, (b) Deckungsgradskalen,
(c) Mahd/Pflege von Wiesen, (d) Definition der Aufnahmefläche.

Kurzbefund vorweg: Für Berlin existiert eine vollständige, frei abrufbare amtliche
Biotoptypenliste samt Kartieranleitung, Geländebogen und Bewertungspunkten — das ist die
tragfähigste Grundlage dieses Registers. Bundesweit ist die BfN-Biotoptypenliste (Rote Liste
der gefährdeten Biotoptypen) **nicht** frei zugänglich; frei ist nur die FFH-Lebensraumtyp-Ebene.
Für die Braun-Blanquet-Skala gibt es keinen amtlichen Berliner Wortlaut; belegbar ist sie nur
über Quellen anderer Länder bzw. eines Fachvereins.

---

## Gedeckte Definitionen

### VEG-01 · Biotoptypenliste Berlins 2023 — amtliche Codeliste
- **Herausgeber:** Senatsverwaltung für Mobilität, Verkehr, Klimaschutz und Umwelt (SenMVKU),
  Landesbeauftragte für Naturschutz und Landschaftspflege. Bearbeitung: Dr. Hanna Köstler,
  Dr. Michael Fietz (Büro Luftbild + Vegetation).
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/naturschutz/biotopschutz/biotoptypenliste_2023.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; 31 Seiten, PDF gelesen)
- **Wörtlich:** „STAND überarbeitete Fassung 01. August 2023"
- **Wörtlich (Tabellenstruktur):** „1. Spalte: Zifferncode (fünf- bis achtstellig)" / „2. Spalte:
  Name des Biotoptyps" / „3. Spalte: Buchstabencode"
- **Wörtlich (Schutzstatus):** „4. Spalte: Schutzstatus nach § 30 BNatSchG beziehungsweise
  §§ 28 und 29 NatSchG Bln: §= in Berlin gesetzlich geschützte Biotope; (§) = in Berlin nur in
  bestimmten Ausprägungen oder im Komplex mit anderen geschützten Biotoptypen geschützt"
- **Wörtlich (Natura 2000):** „5. Spalte: NATURA-2000-Code (FFH): 7220 = Biotoptyp entspricht
  vollständig dem genannten NATURA-2000-Lebensraumtyp; (7220) = Biotoptyp entspricht nur unter
  bestimmten Voraussetzungen dem genannten NATURA-2000-Lebensraumtyp"
- **Wörtlich (Maßstabsebenen):** „6. bis 8. Spalte: Maßstabsebenen: 1= Biotoptypen für
  Geländeerhebungen und großmaßstäbige Planungskarten im Maßstabsbereich 1 : 500 bis 1 : 5 000;
  2= Biotoptypen für Kartierungen und Darstellungen in mittleren Maßstäben (M = 1 : 5 000 bis
  1 : 10 000); 3= Biotoptypen für Darstellungen in übergeordneten Planungskarten in kleinen
  Maßstäben (ab M = 1 : 10 000); Z= In der entsprechenden Maßstabsebene nur als Zusatzcode zulässig"
- **Deckt in BIOME:**
  - Feld `biotoptyp_code`: Zeichenkette, **5 bis 8 Ziffern**, linksbündig (siehe VEG-05). Keine
    Ganzzahl verwenden — führende Nullen sind bedeutungstragend („05110", nicht 5110).
  - Feld `buchstaben_code`: Zeichenkette (z. B. `GMF`, `GTSAK`).
  - Feld `schutzstatus`: Aufzählung mit genau drei Zuständen — `§` (gesetzlich geschützt),
    `(§)` (nur in bestimmten Ausprägungen/im Komplex geschützt), leer (nicht geschützt).
  - Feld `natura2000_code`: vierstelliger Code, plus Kennzeichen „nur unter Voraussetzungen"
    (in der Quelle durch Klammern ausgedrückt) — im Datenmodell als eigenes Boolean führen,
    nicht als Klammern im String.
  - Feld `massstabsebene`: Menge aus {1, 2, 3}, zusätzlich Kennzeichen `Z` = nur als Zusatzcode
    zulässig. Ein Biotoptyp kann in mehreren Ebenen zulässig sein.
- **Deckt ausdrücklich nicht:** Keinen Bewertungsrahmen. Die Herausgeberseite sagt wörtlich:
  „Die Biotoptypenliste gibt die Gliederung für im Gelände direkt erkennbare Einheiten vor,
  enthält aber keinen Bewertungsrahmen." Für Bewertung siehe VEG-10.

### VEG-02 · Umfang und Hierarchie der Berliner Liste
- **Herausgeber:** SenMVKU, Seite „Biotopkartierung"
- **Quelle:** https://www.berlin.de/sen/uvk/natur-und-gruen/naturschutz/biotopschutz/biotopkartierung/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:** „Die Berliner Biotoptypenliste (Köstler et al. 2003, aktualisiert Köstler 2023)
  umfasst rund 7.480 Biotoptypen und wird hier zum Download angeboten. Sie ist hierarchisch
  gegliedert in Biotoptypklasse, Biotoptypengruppe, Biotoptyp und ggf. Untertypen."
- **Wörtlich (Aktualität der Kartierung):** „Eine erste flächendeckende Kartierung der Biotope
  wurde zwischen 2003 und 2013 erstellt. Im Jahr 2024 erfolgte eine flächendeckende
  Aktualisierung der Biotoptypenkarte auf Grundlage von Luftbildern aus dem Jahr 2023 und
  terrestrischen Kartierungen zwischen 2015 und 2022."
- **Deckt in BIOME:** Vier Hierarchiestufen als Baum (Klasse → Gruppe → Typ → Untertyp),
  ableitbar aus der Codelänge. Größenordnung des Katalogs: rund 7.480 Einträge — eine
  Auswahlliste dieser Größe braucht zwingend Suche statt Dropdown.
- **Deckt ausdrücklich nicht:** Die exakte Zahl der Einträge (die Quelle sagt „rund").
  BIOME darf keine exakte Anzahl behaupten.

### VEG-03 · Klasse 05 „Grünland, Staudenfluren und Rasengesellschaften" — Codes wörtlich
- **Herausgeber:** SenMVKU
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/naturschutz/biotopschutz/biotoptypenliste_2023.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich (Zeilen der Liste, Code / Name / Buchstabencode / Schutz / Natura 2000):**
  - „05 Grünland, Staudenfluren und Rasengesellschaften — G — (§)"
  - „05100 Feuchtwiesen und Feuchtweiden — GF — (§) — (6410)"
  - „05101 Großseggenwiesen (Streuwiesen) — GFS — §"
  - „05102 Feuchtwiesen nährstoffarmer bis mäßig nährstoffreicher [Standorte] — GFP — § — 6410"
  - „05103 Feuchtwiesen nährstoffreicher Standorte — GFR — §"
  - „05106 Flutrasen — GFF — (§)"
  - „05110 Frischwiesen und Frischweiden — GM — (§) — (6510)"
  - „05111 Frischweiden (Fettweiden) — GMW — (§)"
  - „05112 Frischwiesen — GMF — (§) — (6510)"
  - „051121 Frischwiesen, typische Ausprägung — GMFR — § — 6510"
  - „051122 Frischwiesen, verarmte Ausprägung — GMFA — (§)"
  - „05113 ruderale Wiesen — GMR"
  - „051133 blütenreiche Ansaatwiese — GMRB"
  - „05114 Borstgrasrasen (frische bis wechselfeuchte Ausprägung) — GMB — §"
  - „05120 Trocken- und Magerrasen — GT — §"
  - „05150 Intensivgrünland — GI"
  - „05160 Zierrasen / Scherrasen — GZ"
  - „05170 Trittrasen — GL"
- **Deckt in BIOME:** Die Auswahlliste für Vegetationsflächen des Typs Grünland/Rasen. Wichtig
  für die Oberfläche: Die Unterscheidung „typische Ausprägung" / „verarmte Ausprägung" ist Teil
  des Codes (6-stellig), nicht ein separates Zustandsfeld — und sie verändert den Schutzstatus
  (051121 = `§`, 051122 = `(§)`).
- **Deckt ausdrücklich nicht:** Die Zuordnungskriterien, wann eine Wiese „typisch" und wann
  „verarmt" ist. Die Liste selbst enthält dafür keinen Schwellenwert; die Kriterien stehen in der
  „Beschreibung der Biotoptypen Berlins" (siehe Offene Fragen).

### VEG-04 · Deckungsgrad-Schwellen, die in der Berliner Liste selbst codiert sind
- **Herausgeber:** SenMVKU
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/naturschutz/biotopschutz/biotoptypenliste_2023.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:** „03100 vegetationsfreie und -arme Rohbodenstandorte (Deckungsgrad < 10 Prozent) — RR"
- **Wörtlich:** „03311 weitgehend ohne Gehölzbewuchs (Gehölzdeckung < 10 Prozent) — RXMO"
- **Wörtlich:** „03312 mit Gehölzbewuchs (Gehölzdeckung 10 bis 30 Prozent) — RXMG"
- **Wörtlich:** „0331x1 Deckungsgrad der Bodenvegetation 10 bis 50 Prozent — RXMxR"
- **Wörtlich:** „0331x2 Deckungsgrad der Bodenvegetation > 50 Prozent — RXMxD"
- **Deckt in BIOME:** Diese Prozentschwellen sind belegte, amtlich gesetzte Klassengrenzen —
  aber ausschließlich als **Zuordnungskriterium zu einem Biotoptypcode**, nicht als allgemeine
  Schätzskala. Wenn BIOME einen Deckungsgrad erfasst und daraus einen Code vorschlägt, sind
  genau diese Grenzen (10 %, 30 %, 50 %) verteidigbar.
- **Deckt ausdrücklich nicht:** Eine durchgehende Deckungsgradskala für beliebige Aufnahmen.
  Die Berliner Liste definiert Schwellen nur dort, wo sie Codes trennen.

### VEG-05 · Biotopdefinition, Mindestflächengrößen, Bezugssystem (Kartieranleitung 2023)
- **Herausgeber:** SenMVKU / Landesbeauftragte für Naturschutz und Landschaftspflege,
  „Kartieranleitung für Biotopkartierungen in Berlin", Stand September 2023
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/naturschutz/biotopschutz/kartieranleitung_2023.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; 14 Seiten, PDF gelesen)
- **Wörtlich (Biotopbegriff):** „Ein Biotop im Sinne der Biotopkartierung ist eine im Gelände klar
  abgrenzbare Fläche mit relativ einheitlicher Vegetations- und Nutzungsstruktur."
- **Wörtlich (Mindestgrößen):** „In der Regel werden Biotope als Flächen mit einer bestimmten
  Mindestgröße erfasst. Im Maßstab 1 : 2 000 bis 1 : 5 000 beträgt die Mindestgröße 500 bis 1.000
  Quadratmeter. Flächen, die schmaler als 10 Meter sind, werden als Linienbiotope erfasst. Die
  Mindestlänge von Linienbiotopen liegt bei 30 bis 50 Meter."
- **Wörtlich (Unterschreitung):** „Sind Biotope, die unterhalb der angegebenen Mindestgrößen /
  -längen liegen, von Naturschutzrelevanz, dürfen diese Mindestgrößen in Einzelfällen auch
  unterschritten werden oder sie werden als Punktbiotope erfasst."
- **Wörtlich (Kleinflächen als Begleitbiotop):** „Ist bereits im Gelände erkennbar, dass
  aufzunehmende Biotope die Flächenfallen unterschreiten, so muss der Kartierer sie entweder als
  Punktbiotope (oder Punktwolken) verorten, oder als Begleitbiotop erfassen mit Angabe des
  geschätzten Deckungsanteils in Prozent (Bemerkungsfeld)."
- **Wörtlich (Koordinatensystem):** „Zur Übernahme der Biotopkartierung in die landesweite
  Berliner Biotoptypenkarte ist die Verwendung des Landeskoordinatensystems obligatorisch."
  — benannt als „(ETRS89/UTM Zone 33N)".
- **Wörtlich (Geometrietyp und Nummer):** „Erfasst als: F Fläche / L Linie / P Punkt"
  (Geländekartierungsbogen, siehe VEG-06); „es können Werte von 1 bis 9.999 eingetragen werden"
  (Erfassungs-Nummer).
- **Wörtlich (Zusatz- vs. Begleitbiotop):** „Zusatzbiotope sind definiert als auf die volle
  räumliche Ausdehnung der Fläche des Hauptbiotops zutreffender, zusätzlich möglicher
  Biotoptypen"; „Als Begleitbiotop sind nicht auskartierbare (weil kleinteilig vorkommende)
  begleitende Biotope zu verstehen, die nicht für die volle räumliche Ausdehnung des Hauptbiotops
  zutreffen".
- **Deckt in BIOME:**
  - Geometrietyp: Aufzählung {Fläche, Linie, Punkt}.
  - `mindestflaeche_m2`: 500–1.000 m² im Maßstab 1:2.000–1:5.000; Unterschreitung zulässig, muss
    aber begründbar sein → als weiche Warnung umsetzen, nicht als harte Validierung.
  - Schwellenwert Linie/Fläche: Breite < 10 m ⇒ Linienbiotop. Mindestlänge Linie 30–50 m.
  - CRS: EPSG-Code für ETRS89/UTM 33N ist verbindlich für die Übernahme in die Landeskarte.
  - `erfassungsnummer`: Ganzzahl 1–9.999, eindeutig je Kartierprojekt.
  - Getrennte Felder für **Zusatzcode** (max. 1, gilt für die ganze Fläche) und **Begleitbiotop**
    (max. 1 in der Erfassungsliste, max. 2 auf dem Geländebogen, gilt nur für Teile).
- **Deckt ausdrücklich nicht:** Eine für alle Maßstäbe gültige Mindestgröße. Die Anleitung sagt
  wörtlich: „Die Kartiermindestgrößen („Flächenfallen") sind entsprechend dem Projektziel und
  Ausgabemaßstab vom Auftraggeber festzulegen und vom Kartierer gesondert zu dokumentieren."
  BIOME darf 500 m² also nicht als feste Systemkonstante setzen — der Wert ist projektabhängig
  und muss pro Projekt konfigurierbar und dokumentiert sein.

### VEG-06 · Vegetationsschichten und Deckung je Schicht (Geländekartierungsbogen 2023)
- **Herausgeber:** SenMVKU; Bogen erstellt von Dr. H. Köstler, Büro Grabowski & Moeck,
  Büro Luftbild + Vegetation, „Stand: 17.08.2023"
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/naturschutz/biotopschutz/erfassungsbogen.pdf
  sowie Kartieranleitung (wie VEG-05)
- **Abgerufen:** 2026-08-09 (HTTP 200; beide PDFs gelesen)
- **Wörtlich (Kartieranleitung):** „Flächenanteil: Die Flächendeckung wird für jede
  Vegetationsschicht gesondert in Prozent der Gesamtfläche angegeben. Es kann maximal ein
  Deckungsgrad von 100 Prozent je Schicht erreicht werden. Hydrophyten werden unter Krautschicht
  erfasst. Ebenfalls wird die Höhe der jeweiligen Vegetationsschicht erfasst."
- **Wörtlich (Bogen, Spalten „Flächenanteil" und „Höhe"):** „Baumschicht I … % … m";
  „Baumschicht II … % … m"; „Strauchschicht … % … m"; „Krautschicht * … % … cm";
  „Moosschicht … % … cm"; „ohne Vegetation … %"; Fußnote: „* auch Hydrophyten"
- **Deckt in BIOME:** Das Deckungsmodell für eine Vegetationsfläche ist **nicht** eine Zahl,
  sondern sechs Felder:
  - `baumschicht_1_prozent`, `baumschicht_2_prozent`, `strauchschicht_prozent`,
    `krautschicht_prozent`, `moosschicht_prozent`, `ohne_vegetation_prozent`
  - Wertebereich je Feld: 0–100 %, **Einheit Prozent der Gesamtfläche**.
  - Die Summe über die Schichten ist ausdrücklich **nicht** auf 100 begrenzt — nur je Schicht gilt
    die Obergrenze 100. Eine Validierung „Summe = 100 %" wäre ein Fehler.
  - Höhe je Schicht: Baum- und Strauchschicht in **Metern**, Kraut- und Moosschicht in
    **Zentimetern**. Die Einheit ist schichtabhängig und gehört ins Schema, nicht in die Anzeige.
  - Hydrophyten bekommen kein eigenes Feld, sie zählen zur Krautschicht.
- **Deckt ausdrücklich nicht:** Eine Klasseneinteilung des Deckungsgrads. Berlin erfasst hier
  **stufenlos in Prozent**, nicht in Braun-Blanquet-Klassen.

### VEG-07 · Stufenskalen Biotopausbildung und Erhaltungszustand (LRT)
- **Herausgeber:** SenMVKU, Kartieranleitung 2023
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/naturschutz/biotopschutz/kartieranleitung_2023.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich (Biotopausbildung):** „Es werden folgende Stufen der Biotopausbildung unterschieden:
  3= besonders typisch (nicht gestört) – besonders typische Ausbildungen bestimmter Biotope mit
  (relativ) vollständigem Arteninventar. Beeinträchtigungen nicht oder nur sehr geringfügig
  vorhanden. 2= typisch (gering gestört) – typisch ausgeprägte Biotope, mit geringen, oft nur
  randlichen Beeinträchtigungen. 1= untypisch (gestört) – stark beeinträchtigte oder geschädigte
  Biotope, besonders artenarme Ausbildungen von sonst artenreicheren Biotoptypen; Zuordnung zu
  einem bestimmten Biotoptyp oftmals problematisch. 9= nicht bewertbar."
- **Wörtlich (Bezugsmaßstab der Skala):** „Die Beurteilung der Ausbildung des erfassten
  Hauptbiotops erfolgt im Vergleich mit der durchschnittlichen Ausprägung eines Biotoptyps
  unabhängig von seinem naturschutzfachlichen Wert. Eine gut ausgeprägte Frischweide bekommt also
  die Ausbildung „3" ebenso wie ein gut ausgebildeter Erlenbruchwald, ohne dass damit ausgesagt
  wird, dass beide Biotope eine gleich hohe Bedeutung haben."
- **Wörtlich (Erhaltungszustand LRT):** „A= sehr gut bis hervorragend ausgeprägte Habitatstruktur,
  lebensraumtypisches Arteninventar vorhanden, keine bis geringe Beeinträchtigungen. B= gut bis
  gut ausgeprägte Habitatstruktur, lebensraumtypisches Arteninventar weitgehend vorhanden,
  mittlere Beeinträchtigungen. C= mittel bis schlecht … Habitatstruktur, lebensraumtypisches
  Arteninventar nur in Teilen vorhanden, starke Beeinträchtigungen. 9= nicht bewertbar, zum
  Beispiel eine zum Aufnahmezeitpunkt frisch gemähte Wiese, oder für eine Bewertung ungünstige
  Jahreszeit."
- **Wörtlich (Warnung zur Skalenmitte):** „Es ist zu beachten, dass bei dieser Skala
  durchschnittlich ausgeprägte Lebensraumtypen nicht zur mittleren Bewertungsstufe, sondern zur
  Stufe C zählen."
- **Deckt in BIOME:**
  - `biotopausbildung`: Aufzählung {1, 2, 3, 9} mit exakt dem obigen Wortlaut als Label.
    **9 ist kein Rang**, sondern „nicht bewertbar" — darf nie in Mittelwerte eingehen.
  - `erhaltungszustand_lrt`: Aufzählung {A, B, C, 9}, nur belegbar, wenn ein FFH-LRT zugeordnet ist.
  - Beide Skalen sind **biotoptyp-relativ**: Ein „3" bei Frischweide und ein „3" bei Erlenbruchwald
    sind nicht gleichwertig. BIOME darf aus diesen Stufen keine flächenübergreifende Rangliste
    oder Punktsumme bilden.
  - Die C-Warnung ist bedeutsam: Ein Durchschnittsbestand ist C, nicht B. Eine Oberfläche, die
    A/B/C als „gut/mittel/schlecht" beschriftet, führt in die Irre.
- **Deckt ausdrücklich nicht:** Eine Umrechnung zwischen Biotopausbildung (1/2/3/9) und
  Erhaltungszustand (A/B/C/9). Die Quelle stellt keinen Zusammenhang her.

### VEG-08 · Artmächtigkeitsskala nach Braun-Blanquet (1964) — Wortlaut
- **Herausgeber:** Landesumweltamt Nordrhein-Westfalen, „Merkblätter Nr. 39 — Kartieranleitung zur
  Erfassung und Bewertung der aquatischen Makrophyten der Fließgewässer in Nordrhein-Westfalen
  gemäß den Vorgaben der EU-Wasser-Rahmen-Richtlinie", Essen 2003 (heute LANUK NRW)
- **Quelle:** https://www.lanuk.nrw.de/fileadmin/lanuvpubl/0_lua/merk39.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; 61 Seiten, PDF gelesen; Tab. 4.3 auf S. 19)
- **Wörtlich („Tab. 4.3: Artmächtigkeit und Soziabilität nach BRAUN-BLANQUET (1964)",
  Spalte Artmächtigkeit):**
  - „+ spärlich mit sehr geringem Deckungswert"
  - „1 reichlich, aber mit geringem Deckungswert oder ziemlich spärlich, aber mit größerem
    Deckungswert"
  - „2 sehr zahlreich oder mindestens 1/10 bis 1/4 der Aufnahmefläche deckend, Individuenzahl
    beliebig"
  - „3 1/4 bis 1/2 der Aufnahmefläche deckend, Individuenzahl beliebig"
  - „4 1/2 bis 3/4 der Aufnahmefläche deckend, Individuenzahl beliebig"
  - „5 mehr als 3/4 der Aufnahmefläche deckend, Individuenzahl beliebig"
- **Deckt in BIOME:** Die klassische sechsstufige Skala {+, 1, 2, 3, 4, 5} mit genau diesen
  Grenzen. In Prozent ausgedrückt (aus den Brüchen der Quelle): 2 = 10–25 %, 3 = 25–50 %,
  4 = 50–75 %, 5 = > 75 %. Für „+" und „1" nennt die Quelle **keine** Prozentgrenze — sie sind über
  Individuenzahl und „geringer Deckungswert" definiert, nicht über eine Zahl.
- **Deckt ausdrücklich nicht:**
  - Die Stufe **„r"** — kommt in dieser Quelle nicht vor.
  - Die Unterteilungen **„2m", „2a", „2b"** — kommen in dieser Quelle nicht vor (siehe VEG-09).
  - Prozentgrenzen für „+" und „1".
  - **Wichtige Einschränkung zum Geltungsbereich:** Das Merkblatt ist eine Kartieranleitung für
    **aquatische Makrophyten in Fließgewässern**. Der Skalentext ist dort als allgemeine
    Methodenübersicht wiedergegeben, das Dokument ist aber keine Vorgabe für terrestrische
    Vegetationsflächen. Als Beleg für den *Wortlaut* der Skala trägt es; als Beleg dafür, dass
    Berlin oder der Bund diese Skala für Wiesen *vorschreibt*, trägt es nicht.

### VEG-09 · Erweiterte Braun-Blanquet-Skala mit 2a/2b und r — Wortlaut
- **Herausgeber:** Arbeitsgruppe Vegetationskunde in der Arbeitsgemeinschaft sächsischer Botaniker
  (AGsB) im Landesverein Sächsischer Heimatschutz (LVH) — **Fachverein, keine Behörde**.
  Tabelle bezeichnet als „Aufnahmeskala BR-BL-Sachsen, M. Hölzel, 01.01.2018".
- **Quelle:** https://www.saechsischer-heimatschutz.de/files/heimatschutz/pdf/ueber%20uns/Landesfacharbeitsgruppen/AG%20saechsische%20Botaniker/Kartierung/Kartieranleitung_AG_Vegetationskunde_2017-08-16.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; 12 Seiten, PDF gelesen. Hinweis: der Host antwortete bei
  Wiederholungsabrufen zeitweise mit „Connection reset by peer", danach wieder mit 200 —
  zeitweise Nichterreichbarkeit ist zu erwarten.)
- **Wörtlich (Symbol / Artmächtigkeit / Mittelwert):**
  - „5 — über 75 % Deckung — 87,5 %"
  - „4 — 51 % bis 75 % Deckung — 62,5 %"
  - „3 — 26 % bis 50 % Deckung — 37,5 %"
  - „2b — 13 bis 25 % Deckung — 20,0 %"
  - „2a — 5 bis 12,5 % Deckung — 8,8 %"
  - „1m — bis 5 % Deckung, mehr als 50 Individuen — 2,5 %"
  - „1 — 1 % bis 5 % Deckung, weniger als 50 Individuen — 2,5 %"
  - „+ — bis 1 %, 2 bis 50 Individuen — 0,5 %"
  - „r — 1 Individuum unter 1 % Deckung — 0,1 %"
- **Wörtlich (was gemessen wird):** „Zur Ermittlung der Deckung wird nur der Schattenwurf, die
  reelle oder absolute Deckung (keine Konturen, kein Kronenaußenrand) geschätzt. In einem
  Kiefernforst ergibt ein Kronenschlussgrad von 90 % eine geringere Deckung, beispielsweise von
  65 %, weil zwischen den Zweigen und Nadeln noch viel Himmel sichtbar ist."
- **Wörtlich (Summe über 100 %):** „Die Deckungssumme der einzelnen Arten ergibt – z.B. in einer
  Wiese – i.d.R mehr als die Gesamtdeckung der Krautschicht und übersteigt damit häufig 100 %,
  da sich Arten in der niederen, mittleren und hohen Krautschicht überlappen können."
- **Wörtlich (Moose/Flechten):** „Für Moose und Flechten sind keine Individuenzahlen zu beachten,
  daher entfallen „r" und „1m", dagegen bleiben "+" und "1" gültig."
- **Deckt in BIOME:** Die neunstufige Skala {r, +, 1, 1m, 2a, 2b, 3, 4, 5} mit exakten
  Prozentgrenzen **und** je Stufe einem definierten Mittelwert für rechnerische Auswertungen.
  Ebenso: Deckung ist als Schattenwurf (absolute Deckung) zu schätzen, nicht als Kronenschluss;
  und die Artensumme darf 100 % überschreiten — eine Validierung dagegen wäre falsch.
  Für Moos-/Flechtenarten sind r und 1m zu sperren.
- **Deckt ausdrücklich nicht:** Amtliche Verbindlichkeit. Dies ist die Regel eines Fachvereins für
  Sachsen, kein Landes- oder Bundesstandard und für Berlin nicht gesetzt. Die Stufengrenzen
  weichen zudem von VEG-08 ab (dort 3 = 25–50 %, hier 3 = 26–50 %; dort 2 ab 1/10 = 10 %, hier
  2a ab 5 %). **Die beiden Skalen sind nicht ineinander überführbar.** BIOME muss, wenn es
  Braun-Blanquet anbietet, die verwendete Skalenvariante als Pflichtangabe je Aufnahme speichern.

### VEG-10 · Dezimale Deckungsgradskala nach Londo (1974)
- **Herausgeber:** Landesumweltamt Nordrhein-Westfalen, Merkblätter Nr. 39, Essen 2003
- **Quelle:** https://www.lanuk.nrw.de/fileadmin/lanuvpubl/0_lua/merk39.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; Tab. 4.4 auf S. 19, PDF gelesen)
- **Wörtlich („Tab. 4.4: Schätzskala des Deckungsgrades nach LONDO (1974), leicht verändert";
  Stufe — Deckung (%)):**
  „+ — < 1"; „0.1 — 1"; „0.2 — > 1–3"; „0.4 — > 3–5"; „0.7 — > 5–10"; „1.2 — > 10–15";
  „2 — > 15–25"; „3 — > 25–35"; „4 — > 35–45"; „5 — > 45–55"; „6 — > 55–65"; „7 — > 65–75";
  „8 — > 75–85"; „9 — > 85–95"; „10 — 95–100"
- **Deckt in BIOME:** Eine 15-stufige Deckungsskala mit lückenlosen, exakten Prozentgrenzen —
  die einzige hier belegte Skala, die über den gesamten Bereich 0–100 % durchgehend definiert ist.
  Der Titel sagt ausdrücklich „leicht verändert"; BIOME muss sie daher als „Londo (1974) in der
  Fassung LUA NRW 2003" bezeichnen, nicht als „Londo-Skala" schlechthin.
- **Deckt ausdrücklich nicht:** Den unveränderten Originalwortlaut von Londo (1974) — die Quelle
  selbst kennzeichnet ihre Fassung als verändert. Ebenso wenig eine Vorgabe, diese Skala in Berlin
  zu verwenden; auch dieses Kapitel gehört zur Makrophyten-Kartieranleitung.

### VEG-11 · Aufnahmefläche (Plot): Definition, Form, Standardgröße
- **Herausgeber:** AG Vegetationskunde der AGsB im Landesverein Sächsischer Heimatschutz —
  **Fachverein, keine Behörde**; Tabelle „AG Vegetationskunde Sachsen, 01.01.2018"
- **Quelle:** https://www.saechsischer-heimatschutz.de/files/heimatschutz/pdf/ueber%20uns/Landesfacharbeitsgruppen/AG%20saechsische%20Botaniker/Kartierung/Kartieranleitung_AG_Vegetationskunde_2017-08-16.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; PDF gelesen)
- **Wörtlich (Form und Größe):** „Die Aufnahmefläche sollte (muss aber nicht immer) eine
  regelmäßige Form haben (Kreis, Quadrat, Rechteck). Die Größe der Aufnahmefläche sollte sich nach
  der Standardaufnahmefläche (s. Anhang) richten. Diese bildet die methodische Grundlage für die
  syntaxonomische Auswertung."
- **Wörtlich (Dokumentationspflicht):** „Die Aufnahmefläche ist in jedem Fall anzugeben. Die
  Bewertung, ob die Aufnahmefläche dem Standard (Standarderfassung in der Eingabemaske)
  entspricht, oder nur dem Nachweis dient, ist zusätzlich."
- **Wörtlich (Abweichung nach unten):** „Um eine Verletzung des Homogenitätskriteriums
  auszuschließen, sind Vegetationsaufnahmen in Einzelfällen auch von kleineren Flächen
  anzufertigen. Diese dienen dann als Nachweis für die Gesellschaft im Raster."
- **Wörtlich (Standardaufnahmeflächen in m², Auswahl aus der Tabelle
  „Standardaufnahmefläche für VA zur syntaxonomischen Auswertung (m2)"):**
  - „Frischwiesen O Arrhenatheretalia — 25"
  - „Feuchtwiesen O Molinietalia — 16"
  - „Magerrasen K Koelerio-Corynephoretea, K Festuco-Brometea — 16"
  - „Borstgrasrasen O Nardetalia strictae — 16"
  - „Ruderalges. K Galio-Urticetea K Artemisietea — 16"
  - „Säume K Trifolio-Geranietea — 9"
  - „Flutrasen O Polygono-Potentilletalia anser. — 9"
  - „Trittges. K Plantaginetea majoris — 2"
  - „Röhrichte/Großseggenriede K Phragmito-Magno. — 9"
  - „Gebüsche K Franguletea, K Rhamno-Prunetea, K Salicetea, anthropogene Gebüsche — 100"
  - „Moorwälder — 100"
  - „Wälder (incl. Vorwälder) — 400"
- **Wörtlich (Warnung):** „Achtung: In manchen Klassen gibt es Gesellschaften, die die
  Standardgröße nicht erreichen. Dann unbedingt Homogenität beachten und die Aufnahmefläche
  verkleinern!"
- **Deckt in BIOME:**
  - `aufnahmeflaeche_m2`: Pflichtfeld bei jeder Vegetationsaufnahme, Einheit m².
  - `aufnahmeflaeche_form`: Aufzählung {Kreis, Quadrat, Rechteck, unregelmäßig}.
  - `ist_standardflaeche`: Boolean — die Quelle verlangt ausdrücklich diese zusätzliche Angabe
    (Standarderfassung vs. reiner Nachweis).
  - Vorschlagswerte für die Flächengröße nach Vegetationstyp mit genau den obigen Zahlen —
    als **Vorschlag**, nie als erzwungener Wert, da Verkleinerung zugunsten der Homogenität
    ausdrücklich gefordert wird.
- **Deckt ausdrücklich nicht:** Verbindlichkeit für Berlin. Diese Standardgrößen sind eine
  sächsische Vereinsfestlegung für die syntaxonomische Auswertung. Für Berlin ist **keine**
  Standardaufnahmefläche belegt (siehe Offene Fragen).

### VEG-12 · Vegetationsaufnahme im Berliner Verfahren: Status und Dokumentation
- **Herausgeber:** SenMVKU, Kartieranleitung 2023 und Geländekartierungsbogen 2023
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/naturschutz/biotopschutz/kartieranleitung_2023.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:** „Vegetationsaufnahme: Bei bestimmten Aufgabenstellungen kann die Anfertigung von
  Vegetationsaufnahmen nach der Methode Braun-Blanquet (Belegaufnahmen) sinnvoll oder geboten
  sein. Zur Dokumentation soll hier dann ein Hinweis auf vorliegende Aufnahmen vorgenommen werden.
  Es ist anzugeben, ob und wie viele Vegetationsaufnahmen in dem jeweiligen erfassten Biotop
  angefertigt wurden. Die Vegetationsaufnahme erfolgt auf einem gesonderten Aufnahmebogen, auf dem
  die Erfassungsnummer des Biotops und bei mehreren Aufnahmen jeweils eine zusätzliche
  Aufnahmenummer zu vermerken ist."
- **Wörtlich (Bogen):** „Vegetationsaufnahme ja nein"; „Anzahl der Vegetationsaufnahmen für diese
  Erfassungs-Nr.:"
- **Wörtlich (Nacherhebung):** „Zusätzliche Erhebung nötig: Konnten im Rahmen der aktuellen
  Kartierung relevante Kriterien im Geländeerhebungsbogen nicht erfasst werden (zum Beispiel wegen
  Wiesenmahd oder Unzugänglichkeit eines Gebietes), soll hier auf die Notwendigkeit einer
  zusätzlichen Erhebung hingewiesen werden. … zum Beispiel: gemäht."
- **Deckt in BIOME:**
  - Datenmodell-Beziehung: Ein Biotop (Fläche) hat **0..n** Vegetationsaufnahmen. Die Aufnahme ist
    ein eigener Datensatz mit eigener Aufnahmenummer, verknüpft über die Erfassungsnummer des
    Biotops. Deckungsgrad je Schicht (VEG-06) gehört dagegen an das Biotop, nicht an die Aufnahme.
  - Felder `vegetationsaufnahme_vorhanden` (Boolean) und `anzahl_vegetationsaufnahmen` (Ganzzahl).
  - Feld `zusaetzliche_erhebung_noetig` (Boolean) mit Freitext-Grund — der in der Quelle genannte
    Beispielgrund „gemäht" ist für BIOME zentral: eine frisch gemähte Wiese ist nicht bewertbar
    (vgl. Stufe 9 in VEG-07).
- **Deckt ausdrücklich nicht:** Den Aufbau des Berliner Vegetationsaufnahme-Bogens selbst.
  Die Kartieranleitung verweist auf einen „gesonderten Aufnahmebogen", der auf der
  Biotopkartierungs-Seite **nicht** zum Download angeboten wird. Welche Skala Berlin auf diesem
  Bogen verlangt, ist damit nicht belegt — „nach der Methode Braun-Blanquet" ist die einzige
  Angabe, ohne Skalenvariante und ohne Klassengrenzen.

### VEG-13 · Mahd von Wiesen in Berlin: Zeitpunkt, Häufigkeit, Schnitthöhe, Mahdgut
- **Herausgeber:** Senatsverwaltung für Umwelt, Verkehr und Klimaschutz (heute SenMVKU),
  „Handbuch Gute Pflege — Pflegestandards für die Berliner Grün- und Freiflächen";
  Auftragnehmer gruppe F Landschaftsarchitekten; „Bearbeitungsstand: 7. Dezember 2016,
  Layoutanpassung: Mai 2017". Kapitel 2.13 „Landschaftsrasen, Wiesen und beweidete Flächen".
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/stadtgruen/pflegen-und-unterhalten/handbuch-gute-pflege/handbuch-gute-pflege_berlin.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; 218 Seiten, PDF gelesen, S. 168–172)
- **Wörtlich (Grundsatz Häufigkeit):** „Erfahrungsgemäß müssen Wiesen im Berliner Raum zweimal im
  Jahr gemäht werden, da sich sonst konkurrenzkräftigere Pflanzenarten, insbesondere Hochstauden,
  auf den Flächen ausbreiten."
- **Wörtlich (Typ 02 Frische bis feuchte Wiesen):** „Typ 02 Frische bis feuchte Wiesen sollten
  zweimal im Jahr gemäht werden. Der Mahdzeitpunkt richtet sich nach den Zielarten des
  Florenschutzes, den planungsrelevanten Arten der Fauna bzw. dem Entwicklungsziel der Fläche.
  Die erste Mahd liegt je nach Witterungsverlauf bei Mitte Juni, kann zielabhängig aber auch
  bereits Ende Mai/Anfang Juni stattfinden. Falls bodenbrütende Vogelarten zu erwarten sind, ist
  der Mahdzeitpunkt auf Ende Juli zu verschieben. Der zweite Mahdzeitpunkt liegt je nach
  Witterungsverlauf und naturschutzfachlicher Zielsetzung zwischen Ende August und Mitte
  September."
- **Wörtlich (Rotationsbrache Typ 02):** „Teile sollten in jährlichem Wechsel gar nicht gemäht
  werden, sondern als Überwinterungsmöglichkeit stehen bleiben (etwa ein Viertel bis ein Drittel
  der Fläche). Ist dies nicht möglich, sollten alternierend ausreichend breite, möglichst
  sonnenexponierte Saumstrukturen (zwei bis zehn Meter je nach Größe der Fläche) am Rande der
  Fläche oder an Gehölzbeständen über den Winter erhalten bleiben."
- **Wörtlich (Typ 03 Trockene bis halbtrockene Rasen und Wiesen):** „Typ 03 Trockene bis
  halbtrockene Rasen und Wiesen sind je nach Standortbedingungen (Nährstoffversorgung,
  Wüchsigkeit) möglichst zweimalig zu mähen. Auf besonders nährstoffarmen Standorten wie z. B.
  Silbergrasfluren reicht i. d. R. eine einmalige Mahd. … Der Mahdzeitpunkt der ersten Mahd liegt
  bei Mitte Juni. Falls bodenbrütende Vogelarten zu erwarten sind, ist der Mahdzeitpunkt auf Ende
  Juli zu verschieben. Zweiter Mahdzeitpunkt gemäß Witterungsverlauf und naturschutzfachlicher
  Zielsetzung ab Ende August bis Mitte September."
- **Wörtlich (Rotationsbrache Typ 03):** „Teile sollten in jährlichem Wechsel gar nicht gemäht
  werden, sondern als Überwinterungsmöglichkeit bis zur ersten Mahd stehen bleiben (etwa ein
  Drittel bis zur Hälfte der Fläche). Die Teilfläche, welche stehengelassen wird, sollte jährlich
  gewechselt werden (Rotationsbrache)."
- **Wörtlich (Typ 01 Landschaftsrasen):** „Typ 01 Ansaaten von Landschaftsrasen können zur
  Unterdrückung unerwünschten Auswuchses bis zu dreimal gemäht werden."
- **Wörtlich (Schnitthöhe):** „Typ 01 Ansaaten von Landschaftsrasen 6 bis 10 cm nach DIN 18919";
  „Typ 02 Frische bis feuchte Wiesen 5 bis 10 cm, bei Vorkommen von Lurcharten mindestens 10 bis
  15 cm"; „Typ 03 Trockene bis halbtrockene Rasen und Wiesen etwa 10 bis 15 cm"
- **Wörtlich (Mahdgutabfuhr, Grundsatz):** „Auf allen Wiesentypen und Landschaftsrasen ist eine
  Aushagerung anzustreben, denn dadurch kann sich eine höhere Artenvielfalt entwickeln. Deshalb
  ist das Schnittgut grundsätzlich zu entfernen."
- **Wörtlich (Liegezeit):** „Bei frischen bis feuchte Wiesen und ebenso bei trockenen bis
  halbtrockene Rasen und Wiesen sollte das Schnittgut ca. ein bis drei Tage auf der Fläche liegen
  bleiben, wenn es die Witterung zulässt, um beispielsweise anhaftenden Eiern, Larven oder Puppen
  von Wirbellosen die weitere Entwicklung und mobilen Tieren die Abwanderung zu ermöglichen.
  Außerdem können so auch die spät reifenden Samen noch ausfallen. Um eine optimale Aushagerung zu
  erreichen, sollte Mahdgut bei trockenem Wetter abgefahren werden."
- **Wörtlich (Verantwortung):** „Das Mahdgut ist durch den für die Mahd Verantwortlichen zu
  entfernen."
- **Wörtlich (Landschaftsrasen, DIN-Bezug):** „Wenn keine Regelungen getroffen wurden, ist Mahdgut
  mit einer Länge von mehr als 10 cm nach der DIN 18919 zu entfernen."
- **Wörtlich (Gerät):** „Flächen auf denen der Fokus auf Erhalt und Förderung insbesondere
  wertgebender Arten in ihrer Vielfalt gelegt wird, sind ausschließlich mit einem Balkenmäher zu
  mähen."
- **Wörtlich (Vorrang von Schutzgebietsrecht):** „In besonders geschützten Biotopen und
  Schutzgebieten sind die Pflegeerfordernisse des Pflege- und Entwicklungsplans bzw. der
  Schutzverordnung zu befolgen."
- **Deckt in BIOME:**
  - Pflegetyp als Aufzählung mit genau drei Werten: `Typ 01 Ansaaten von Landschaftsrasen`,
    `Typ 02 Frische bis feuchte Wiesen`, `Typ 03 Trockene bis halbtrockene Rasen und Wiesen`.
  - `schnitthaeufigkeit_pro_jahr`: Typ 01 bis 3; Typ 02 = 2; Typ 03 = 2, auf besonders
    nährstoffarmen Standorten 1.
  - `schnittzeitpunkt_1` und `schnittzeitpunkt_2` als Zeitfenster, nicht als Datum:
    1. Schnitt Mitte Juni (zielabhängig ab Ende Mai/Anfang Juni; **bei Bodenbrütern Ende Juli**);
    2. Schnitt Ende August bis Mitte September.
  - `schnitthoehe_cm` als Bereich je Typ: Typ 01 = 6–10; Typ 02 = 5–10, **bei Lurcharten
    mindestens 10–15**; Typ 03 = 10–15.
  - `mahdgut_abfuhr`: Grundsatz „immer entfernen" (Aushagerung); `liegezeit_tage` = 1–3;
    Abfuhr bei trockenem Wetter.
  - `ungemaehter_flaechenanteil`: Typ 02 = ¼ bis ⅓; Typ 03 = ⅓ bis ½; jährlich wechselnd.
    Ersatzweise Saumbreite 2–10 m.
  - Regel für abgeleitete Empfehlungen: Die Bodenbrüter-Bedingung und die Lurch-Bedingung
    **überschreiben** die Standardwerte. Eine Empfehlung ohne Abfrage dieser beiden Bedingungen
    ist nicht belegbar.
  - Vorrangregel: Liegt die Fläche in einem Schutzgebiet oder ist sie geschützter Biotop, darf
    BIOME keine eigene Pflegeempfehlung als maßgeblich ausgeben, sondern muss auf Pflege- und
    Entwicklungsplan bzw. Schutzverordnung verweisen.
- **Deckt ausdrücklich nicht:**
  - Den Text der **DIN 18919** und **DIN 18917** selbst (siehe „Nicht zugänglich"). Der Wert
    „6 bis 10 cm nach DIN 18919" und die Regel „mehr als 10 cm … zu entfernen" sind nur als
    *Zitat des Handbuchs* belegt, nicht aus der Norm geprüft.
  - Beweidung in quantifizierter Form. Das Handbuch nennt Beweidung als Alternative, gibt aber in
    Kapitel 2.13 keine Besatzstärken an (dafür siehe VEG-14, bundesweit für LRT 6510).
  - Straßenbegleitgrün und Sportrasen — dafür verweist das Handbuch auf eigene Regelwerke.

### VEG-14 · Mahdregime für FFH-Lebensraumtyp 6510 (bundesweit, BfN)
- **Herausgeber:** Bundesamt für Naturschutz (BfN), Steckbrief „LRT 6510 – Magere
  Flachland-Mähwiesen"
- **Quelle:** https://www.bfn.de/sites/default/files/BfN/natura2000/Dokumente/6510_flachland-maehwiesen.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; 14 Seiten, PDF gelesen)
- **Wörtlich (Definition):** „Der Lebensraumtyp umfasst lt. SSYMANK et al. (1998) artenreiche,
  extensiv bewirtschaftete Mähwiesen des Flach- und Hügellandes (planar bis submontan), die
  pflanzensoziologisch zu den Glatthaferwiesen (Verband Arrhenatherion) gehören. … Im Gegensatz
  zum Intensivgrünland sind diese Mähwiesen blütenreich, wenig gedüngt und der erste Heuschnitt
  erfolgt i. d. R. nicht vor der Hauptblütezeit der Gräser."
- **Wörtlich (Maßnahmenbedarf):** „– extensive Mahd- oder Mähweidenutzung, – erster Schnitt nicht
  vor dem Blühbeginn der Gräser, – geringe und an die atmogenen Stickstoffeinträge angepasste
  Düngung."
- **Wörtlich (M.1 Mahd als Erhaltungsmaßnahme):** „Durch eine ein- bis dreischürige Mahd mit
  Abtransport des Mahdguts lassen sich Glatthaferwiesen erhalten. Die Nutzung richtet sich dabei
  nach der Produktivität des Standorts (JÄGER et al. 2002). Für schwachwüchsige bis mäßig
  nährstoffreiche Bestände eignet sich eine ein- bis zweischürige Mahd. Auf produktiveren
  Standorten bzw. zur Aushagerung nährstoffreicher Bestände ist eine dreischürige Nutzung möglich.
  Die Mahd sollte i. d. R. zwischen Juni und Oktober durchgeführt werden. Dabei sollte die zweite
  Nutzung frühestens nach 40 Tagen, besser 8 Wochen nach der ersten Mahd erfolgen."
- **Wörtlich (Beweidung):** „Die Beweidung sollte erst ab Vegetationshöhen von 15 bis max. 35 cm
  erfolgen. Je nach Auswuchsmenge sind Besatzstärken von 0,3–2 GVE/ha und Jahr … möglich."
- **Deckt in BIOME:**
  - Für Flächen mit Natura-2000-Code 6510 (in Berlin: Code 051121 „Frischwiesen, typische
    Ausprägung", vgl. VEG-03): `schnitthaeufigkeit_pro_jahr` 1–3, abhängig von der Produktivität;
    Mahdzeitraum Juni bis Oktober; **Mindestabstand zwischen 1. und 2. Schnitt: 40 Tage, besser
    8 Wochen** — das ist eine harte, prüfbare Regel für eine Pflegeplanung.
  - `erster_schnitt_regel`: nicht vor Blühbeginn der Gräser.
  - `mahdgut_abfuhr`: Abtransport ist Bestandteil der Erhaltungsmaßnahme.
  - Beweidung: `vegetationshoehe_bei_auftrieb_cm` 15–35; `besatzstaerke_gve_ha_jahr` 0,3–2.
- **Deckt ausdrücklich nicht:** Berliner Verbindlichkeit. Der Steckbrief bezieht seine
  Erhaltungszustands- und Verbreitungsangaben ausdrücklich auf die **atlantische Region**
  Deutschlands; Berlin liegt in der kontinentalen Region. Die Maßnahmenbeschreibung M.1 ist
  allgemein für den LRT formuliert, die regionalen Tabellen sind es nicht. BIOME darf die
  Flächen- und Erhaltungszustandszahlen dieses Dokuments nicht auf Berlin beziehen.

### VEG-15 · Berliner Biotopwertliste — Punktbewertung je Biotoptyp
- **Herausgeber:** SenMVKU, „Berliner Leitfaden zur Bewertung und Bilanzierung von Eingriffen —
  Anhang 1: Biotopwertliste (Stand 09. Juli 2024)"
- **Quelle:** https://www.berlin.de/sen/uvk/_assets/natur-gruen/landschaftsplanung/bewertung-und-bilanzierung-von-eingriffen/broschuere_leitfaden-eingriffe_anhang1.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200; 26 Seiten, PDF gelesen)
- **Wörtlich (Spaltenüberschriften):** „Code Berlin | BIOTOPTYP BERLIN | Geschützt gemäß
  § 30 BNatSchG / § 28, 29 NatSchGBln | Natura 2000-Code (FFH) | Anmerkungen | Grundwert
  [Wertkriterien: Hemerobie | Vorkommen gefährdeter Arten | Seltenheit / Gefährdung des
  Biotoptyps | Vielfalt an Pflanzen- und Tierarten | Punktzahl] | Risikowert [Dauer der
  Wiederherstellung der Lebensgemeinschaften | Wiederherstellbarkeit der abiotischen
  Standortbedingungen] | Gesamt-Punktzahl (Biotopwert)"
- **Wörtlich (Beispielzeilen aus der Klasse 05, Reihenfolge wie oben):**
  - „051121 Frischwiesen, typische Ausprägung | § | 6510 | 3 | 7 | 3 | 3 | 16 | 10 | 10 | 36"
  - „051122 Frischwiesen, verarmte Ausprägung | (§) | | 3 | 4 | 2 | 1 | 10 | 5 | 5 | 20"
  - „051111 Frischweiden, typische Ausprägung | § | | 3 | 7 | 2 | 3 | 15 | 5 | 10 | 30"
  - „051112 Frischweiden, verarmte Ausprägung | (§) | | 3 | 1 | (1) | 1 | 5 | 5 | 5 | 15"
  - „051131 Ruderale Wiesen, typische Ausprägung | | | 1 | 4 | 1 | 3 | 9 | 2 | 5 | 16"
  - „051133 Blütenreiche Ansaatwiese | | | 1 | 4 | 1 | 3 | 9 | 0 | 0 | 9"
  - „05114 Borstgrasrasen (frische bis wechselfeuchte Ausprägung) | § | | 5 | 7 | 3 | 3 | 18 | 10 | 20 | 48"
- **Wörtlich (Hinweis auf Sammelbewertungen):** „Alle Subtypen gleich bewertet";
  „Bewertung nach Art der Ausprägung"
- **Deckt in BIOME:** Feld `biotopwert_punkte` (Ganzzahl) je Biotoptypcode, zusammengesetzt aus
  vier Grundwert-Kriterien und zwei Risikowert-Kriterien. Der Gesamtwert ist die Summe aus
  Grundwert-Punktzahl und den beiden Risikowerten (in allen geprüften Zeilen bestätigt, z. B.
  16 + 10 + 10 = 36). Der Wert hängt **am Code inklusive Ausprägung** — typische und verarmte
  Ausprägung derselben Wiese unterscheiden sich um fast das Doppelte (36 gegenüber 20).
- **Deckt ausdrücklich nicht:**
  - Die Bedeutung der Einzelziffern und den zulässigen Wertebereich der vier Wertkriterien.
    Beobachtet wurden die Werte 0, 1, 2, 3, 4, 5, 7 sowie eingeklammerte Werte wie „(0)" und „(1)";
    was die Klammern bedeuten und welche Skala zugrunde liegt, steht **nicht** in Anhang 1,
    sondern im Hauptteil des Leitfadens, den ich nicht abgerufen habe.
  - Die Anwendung: wie aus Biotopwert und Fläche eine Eingriffsbilanz entsteht. Ebenfalls
    Hauptteil des Leitfadens.
  - Nicht jeder Code trägt Punkte — übergeordnete Gruppen (z. B. „05110 Frischwiesen und
    Frischweiden") stehen ohne Wert und mit dem Vermerk „Bewertung nach Art der Ausprägung".
    BIOME darf für Gruppencodes keinen Wert erfinden und muss den Nutzer zur Ausprägung führen.

### VEG-16 · Anzahl der Biotoptypen in Deutschland (BfN)
- **Herausgeber:** Bundesamt für Naturschutz (BfN), Seite „Biotoptypengruppen und Anzahl von
  Biotoptypen in Deutschland"; Datenquelle dort angegeben als Finck, P.; Heinze, S.; Riecken, U.;
  Raths, U.; Ssymank, A. (2017): Rote Liste der gefährdeten Biotoptypen Deutschlands. Dritte
  fortgeschriebene Fassung 2017. Naturschutz und Biologische Vielfalt 156. Münster.
- **Quelle:** https://www.bfn.de/daten-und-fakten/biotoptypengruppen-und-anzahl-von-biotoptypen-deutschland
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:** „Nach einer bundesweit einheitlichen Klassifizierung werden in Deutschland
  insgesamt 863 Biotoptypen (ohne die 75 „Technischen Biotoptypen" wie zum Beispiel Straßen,
  Gebäude) unterschieden."
- **Deckt in BIOME:** Die Größenordnung des bundesweiten Katalogs (863 fachliche + 75 technische
  = 938) und die Existenz der Kategorie „Technische Biotoptypen" als eigene Gruppe.
- **Deckt ausdrücklich nicht:** **Keinen einzigen Code und keine einzige Bezeichnung** der
  bundesweiten Liste. Die Zahl ist belegt, der Inhalt nicht. BIOME kann daraus keine
  BfN-Auswahlliste bauen.

### VEG-17 · Berliner Gefährdungseinstufung stützt sich auf die BfN-Rote-Liste
- **Herausgeber:** SenMVKU, Umweltatlas Berlin, Karte Biotoptypen, Einleitung
- **Quelle:** https://www.berlin.de/umweltatlas/biotope/biotoptypen/fortlaufend-aktualisiert/einleitung/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:** „Bewertet nach der Rote Liste der gefährdeten Biotoptypen Deutschland (Riecken et
  al. 2006) ergibt sich für die Flächen der Berliner Biotope ein nicht weniger besorgniserregendes
  Bild. Auf etwa 10 % der Berliner Landesfläche kommen Biotope vor die deutschlandweit gefährdet
  sind, für den Schutz und Erhaltung dieser Biotope trägt Berlin eine besondere Verantwortung."
- **Wörtlich (Biotop vs. Biotoptyp):** „Während sich der Begriff Biotop immer auf einen konkreten
  Ort bezieht, sind mit dem Biotoptyp Biotope gleichen Charakters eines abgegrenzten Naturraumes
  gemeint."
- **Deckt in BIOME:** Die begriffliche Trennung `biotop` (konkrete Fläche, Instanz) gegenüber
  `biotoptyp` (Katalogeintrag, Klasse) — das ist die Grundlage des Datenmodells. Ferner: Berlin
  verwendet für die bundesweite Gefährdung die Fassung **Riecken et al. 2006**, nicht die Fassung
  2017.
- **Deckt ausdrücklich nicht:** Die Gefährdungseinstufung je Biotoptyp. Die Seite zeigt sie als
  Tabelle „Tab. 1: Gefährdungsstatus Berliner Biotoptypen" — diese ist dort jedoch als **Bild**
  eingebunden („Bild: Riecken et al. 2006") und damit nicht als Text auslesbar.

---

## Nicht zugänglich

| Norm/Quelle | Warum | Status | Was dadurch in BIOME NICHT belegbar ist |
|---|---|---|---|
| Finck et al. (2017): Rote Liste der gefährdeten Biotoptypen Deutschlands, NaBiV 156 — die vollständige bundesweite Biotoptypenliste | Kostenpflichtige Publikation, 49 €, kein Open Access. Seite abrufbar, Inhalt nicht. | HTTP 200 (Produktseite), Volltext hinter Bezahlung | Sämtliche **BfN-Biotoptypencodes und -bezeichnungen**; die bundesweite Gefährdungseinstufung je Biotoptyp; jede Aussage „Biotoptyp X ist bundesweit gefährdet" |
| Riecken et al. (2006): Rote Liste der gefährdeten Biotoptypen Deutschlands, NaBiV 34 — Repositorium BfN-e-dition (OPUS), https://bfn.bsz-bw.de/frontdoor/index/index/docId/985 | Nur Metadatensatz. Die Seite zeigt zwar einen Download-Zähler, im ausgelieferten HTML ist jedoch kein Volltext-Link vorhanden (geprüft per Suche nach `.pdf`/`files`/`Download`). | HTTP 200, kein Volltext-Link | Die von Berlin tatsächlich verwendete Fassung der bundesweiten Gefährdung (vgl. VEG-17) — Berlin bewertet nach 2006, ich konnte diese Fassung nicht öffnen |
| BfN: „Rote Liste-Status der Biotoptypen in Deutschland" (PDF), https://www.bfn.de/sites/default/files/2021-09/Rote%20Liste-Status%20Biotoptypen%20Deutschland-bfn_0%20%281%29%20%282%29.pdf | Datei lädt, enthält aber keinen extrahierbaren Text (reine Grafik; Textextraktion ergab 1 Zeichen). | HTTP 200, Inhalt nicht auslesbar | Die Verteilung der Gefährdungskategorien; die Kategoriedefinitionen im Wortlaut |
| BfN-Altauftritt „Rote Liste gefährdeter Biotoptypen", http://web01.bfn.cu.ennit.de/themen/rote-liste/rl-biotoptypen/ | Server antwortet nicht. Dieser Spiegel wurde als möglicher Fundort der „Kurzliste" (PDF) und der „kompletten Liste" (Excel) gesucht. | HTTP 503 | Die in Suchtreffern erwähnte frei herunterladbare **Kurzliste/Excel-Liste** der Roten Liste 2017 konnte ich an keiner erreichbaren Stelle bestätigen |
| DIN 18919 (Vegetationstechnik im Landschaftsbau — Entwicklungs- und Unterhaltungspflege), Ausgabe 2016-12, https://www.dinmedia.de/en/standard/din-18919/264065482 | Normtext kostenpflichtig, nur Titeldaten frei. | HTTP 200 (Produktseite), Normtext nicht abgerufen | Die Schnitthöhe „6 bis 10 cm" und die Regel „Mahdgut mit einer Länge von mehr als 10 cm … zu entfernen" im **Originalwortlaut**. Beide sind nur als Zitat des Berliner Handbuchs belegt (VEG-13) |
| DIN 18917 (Vegetationstechnik im Landschaftsbau — Rasen und Saatarbeiten) | Kostenpflichtig; die von mir versuchte Produkt-URL existierte nicht. | HTTP 404 auf der versuchten URL, kein gültiger Treffer geprüft | Anforderungen an Landschaftsrasen-Ansaaten und Straßenbegleitgrün, auf die das Handbuch Gute Pflege verweist |
| Braun-Blanquet, J. (1964): Pflanzensoziologie. Grundzüge der Vegetationskunde, 3. Aufl. | Buch, nicht online geprüft. Alle hier eingetragenen Skalenfassungen sind **Wiedergaben Dritter** (VEG-08, VEG-09). | nicht abgerufen | Der Originalwortlaut der Braun-Blanquet-Skala. Damit auch die Frage, welche der beiden hier belegten, voneinander abweichenden Fassungen die „richtige" ist |
| Londo, G. (1974) — Originalarbeit zur Dezimalskala | Nicht online geprüft. Die belegte Fassung (VEG-10) ist ausdrücklich „leicht verändert". | nicht abgerufen | Die unveränderten Original-Klassengrenzen der Londo-Skala |
| Berliner Vegetationsaufnahme-Bogen (der in der Kartieranleitung genannte „gesonderte Aufnahmebogen") | Auf der Seite „Biotopkartierung" werden acht PDFs angeboten; ein Vegetationsaufnahme-Bogen ist **nicht** darunter. | nicht auffindbar | Welche Deckungsgradskala Berlin für Vegetationsaufnahmen verlangt, welche Felder der Bogen hat, ob eine Standardaufnahmefläche vorgeschrieben ist |
| Berliner Leitfaden zur Bewertung und Bilanzierung von Eingriffen — **Hauptteil** | Nicht abgerufen; ich habe nur Anhang 1 (Biotopwertliste) geöffnet. | nicht abgerufen | Bedeutung und Wertebereich der vier Wertkriterien und der Klammerwerte in VEG-15; das Rechenverfahren von Biotopwert zu Eingriffsbilanz |
| „Beschreibung der Biotoptypen Berlins", Fassung 2023 | Der Server lieferte bei mehreren Versuchen HTTP 429 (Rate Limit). Die **Fassung 2005** derselben Reihe habe ich erfolgreich abgerufen und gelesen (HTTP 200, 143 Seiten). | HTTP 429 auf die Fassung 2023 | Die aktuellen Zuordnungs- und Abgrenzungskriterien je Biotoptyp — insbesondere die Schwelle zwischen „typischer" und „verarmter" Ausprägung, die den Schutzstatus und den Biotopwert bestimmt |

Hinweis zur Fassung 2005 der Biotoptypen-Beschreibung: Sie enthält je Biotoptyp eine Zeile
„Hinweise auf andere Kartierschlüssel", z. B. für 05110 Frischwiesen und Frischweiden wörtlich:
„Artenschutzprogramm, Biotoptyp 42, BfN-Schlüssel: 34.07.01, CIR-Schlüssel: 4220, Luftbild
Brandenburg: 0511." Damit ist eine **Übersetzungstabelle Berlin → BfN-Schlüssel** dokumentiert,
obwohl die BfN-Liste selbst nicht zugänglich ist. Ob diese Zuordnung in der Fassung 2023 noch gilt,
ist wegen HTTP 429 ungeprüft.

---

## Offene Fragen an Malte

1. **Skalenentscheidung Deckungsgrad.** Belegt sind drei unvereinbare Systeme: Berlin erfasst
   stufenlos in Prozent je Vegetationsschicht (VEG-06), Braun-Blanquet klassisch (VEG-08) und
   Braun-Blanquet erweitert (VEG-09) haben unterschiedliche Klassengrenzen, Londo (VEG-10) ist
   feiner als beide. Soll BIOME nur das Berliner Prozentmodell anbieten — das wäre die einzige
   amtlich für Berlin belegte Variante — oder auch Klassenskalen? Falls ja: Die Skalenvariante muss
   je Aufnahme mitgespeichert werden, sonst sind die Daten später nicht auswertbar.

2. **Standardaufnahmefläche für Berlin.** Für Berlin ist **keine** Standardgröße einer
   Vegetationsaufnahme belegt. Die Zahlen in VEG-11 (Frischwiesen 25 m², Feuchtwiesen 16 m²,
   Wälder 400 m²) stammen von einem sächsischen Fachverein. Dürfen wir sie als Vorschlagswerte
   verwenden, klar als „nicht amtlich, Herkunft Sachsen" gekennzeichnet, oder soll das Feld leer
   bleiben, bis eine Berliner Vorgabe vorliegt?

3. **Fehlender Berliner Aufnahmebogen.** Die Kartieranleitung verweist auf einen „gesonderten
   Aufnahmebogen" für Vegetationsaufnahmen, der nicht veröffentlicht ist. Sollen wir ihn bei der
   Landesbeauftragten für Naturschutz und Landschaftspflege anfragen? Ohne ihn ist der
   Aufnahme-Teil von BIOME nicht amtlich gedeckt.

4. **Beschreibung der Biotoptypen 2023 nachladen.** Der Abruf scheiterte an einem Rate Limit
   (HTTP 429), nicht inhaltlich. Das Dokument ist wichtig, weil es die Abgrenzung „typisch" gegen
   „verarmt" trägt — und diese Unterscheidung entscheidet über Schutzstatus und Biotopwert
   (36 gegen 20 Punkte bei Frischwiesen). Ich schlage einen erneuten Abruf mit Wartezeit vor.

5. **BfN-Ebene: aufgeben oder kaufen?** Eine bundesweite Biotoptypen-Auswahlliste ist mit freien
   Quellen nicht zu belegen. Drei Wege: (a) BIOME beschränkt sich auf die Berliner Liste und die
   frei verfügbare FFH-LRT-Ebene; (b) NaBiV 156 für 49 € beschaffen; (c) die in der Beschreibung
   2005 dokumentierten BfN-Schlüssel als Übersetzungstabelle nutzen, ohne die BfN-Bezeichnungen
   anzuzeigen. Ich empfehle (a) für den Start und (b), sobald bundesweite Auswertungen anstehen.

6. **Welche Fassung der bundesweiten Roten Liste?** Berlin bewertet ausweislich des Umweltatlas
   nach Riecken et al. **2006**, aktuell ist Finck et al. **2017**. Wenn BIOME Gefährdung anzeigt,
   muss die Fassung mit ausgewiesen werden. Welche soll führend sein?

7. **Geltungsbereich der Pflegeempfehlungen.** Das Handbuch Gute Pflege regelt Berliner Grün- und
   Freiflächen. Für geschützte Biotope und Schutzgebiete verweist es ausdrücklich auf Pflege- und
   Entwicklungsplan bzw. Schutzverordnung. Soll BIOME bei solchen Flächen die Empfehlung ganz
   unterdrücken oder sie mit einem Vorrang-Hinweis anzeigen? Ich rate zum Unterdrücken, weil eine
   angezeigte Empfehlung erfahrungsgemäß befolgt wird.

8. **Alter des Handbuchs.** Bearbeitungsstand ist der 7. Dezember 2016. Es ist die aktuelle vom
   Land angebotene Fassung, aber knapp zehn Jahre alt. Vor der Ableitung verbindlicher
   Pflegeempfehlungen sollten wir bei SenMVKU klären, ob eine Neufassung existiert oder ansteht.
