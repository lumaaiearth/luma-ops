# Standards-Register — Standort, Geodaten, Metadaten

> Stand: 2026-08-09. Nur frei zugängliche, wörtlich belegte Quellen.
> Regel: Was hier nicht gedeckt ist, darf die BIOME-Oberfläche nicht anbieten.

Hinweis zur Methode: Alle Einträge stammen aus Quellen, die am 2026-08-09 tatsächlich
abgerufen und gelesen wurden. Für die Koordinatenreferenzsysteme wurde bewusst nicht
epsg.io als Beleg genommen, sondern die **offizielle EPSG-Registry-API** unter
`apps.epsg.org` (IOGP), weil epsg.io nur eine Sekundärdarstellung ist. Für die Frage,
welches CRS die Berliner Geodateninfrastruktur ausgibt, wurden die Dienste selbst
befragt (GetCapabilities, DescribeFeatureType, GetFeature) — das ist der belastbarste
Nachweis, weil er zeigt, was ausgeliefert wird, und nicht, was dokumentiert sein soll.

---

## Gedeckte Definitionen

### CRS-25833 · ETRS89 / UTM Zone 33N
- **Herausgeber:** IOGP — EPSG Geodetic Parameter Dataset (Data source: EPSG, Information source: IOGP)
- **Quelle:** https://apps.epsg.org/api/v1/CoordRefSystem/25833/ sowie https://apps.epsg.org/api/v1/Extent/2127/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:**
  - `"Name": "ETRS89 / UTM zone 33N"`
  - `"Kind": "projected"`
  - Koordinatensystem (CoordSys 4400): „Cartesian 2D CS. Axes: easting, northing (E,N). Orientations: east, north. UoM: m."
  - Datum: „European Terrestrial Reference System 1989 ensemble"
  - Anwendung (Usage 6523): „Engineering survey, topographic mapping."
  - Gültigkeitsbereich (Extent 2127): „Europe between 12°E and 18°E: Austria; Croatia; Denmark - offshore and offshore; Germany - onshore and offshore; Italy - onshore and offshore; Norway including Svalbard - onshore and offshore."
  - Bemerkung: „See ETRS89 / UTM zone 33N (N-E) (CRS code 3045) for alternative CRS with north-east axis order."
  - `"RevisionDate": "2024-06-17T00:00:00"`
- **Deckt in BIOME:** Das interne Speicher- und Rechen-CRS für alle Berliner Standortgeometrien.
  Einheit **Meter**. Achsenreihenfolge **Easting, Northing (E, N)** — in dieser Reihenfolge, nicht
  umgekehrt. Wertebereich für Berlin (aus dem realen Dienst belegt, siehe BE-CRS):
  Easting rund 369.281–416.115 m, Northing rund 5.798.903–5.836.815 m. Längen-, Abstands- und
  Flächenberechnungen dürfen in diesem CRS erfolgen, weil die Einheit metrisch und die Zone
  für Berlin (13° O) die zutreffende ist.
- **Deckt ausdrücklich nicht:** Gebiete außerhalb 12°O–18°O. Für Deutschland westlich 12°O ist
  Zone 32 (EPSG:25832) zuständig — Berlin liegt vollständig in Zone 33, andere Standorte
  möglicherweise nicht. Deckt nicht die Achsenreihenfolge North-East; dafür ist EPSG:3045 ein
  eigener Code. Deckt keine Höhen (2D-CRS).

### CRS-4326 · WGS 84
- **Herausgeber:** EPSG (Data source: EPSG; Information source: „EPSG. See 3D CRS for original information source.")
- **Quelle:** https://apps.epsg.org/api/v1/CoordRefSystem/4326/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:**
  - `"Name": "WGS 84"`, `"Kind": "geographic 2D"`
  - Koordinatensystem (CoordSys 6422): „Ellipsoidal 2D CS. Axes: latitude, longitude. Orientations: north, east. UoM: degree"
  - Anwendung (Usage 3202): „Horizontal component of 3D system."
  - Datum: „World Geodetic System 1984 ensemble"
- **Deckt in BIOME:** Das Austausch- und Schnittstellen-CRS (GeoJSON, GPS-Rohdaten, externe APIs).
  Einheit **Grad**. Nach EPSG-Definition ist die Achsenreihenfolge **Breite, Länge (lat, lon)**.
- **Deckt ausdrücklich nicht:** Metrische Berechnungen. Abstände oder Flächen dürfen in Grad
  nicht berechnet werden. Deckt nicht die in GeoJSON übliche Reihenfolge lon/lat — die
  EPSG-Definition sagt ausdrücklich „Axes: latitude, longitude". Wer EPSG:4326 sagt und
  lon/lat meint, muss das im Feldkommentar festhalten.

### CRS-3857 · WGS 84 / Pseudo-Mercator — nur Darstellung
- **Herausgeber:** EPSG (Data source: EPSG; Information source: „Microsoft.")
- **Quelle:** https://apps.epsg.org/api/v1/CoordRefSystem/3857/ sowie https://apps.epsg.org/api/v1/Extent/3544/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:**
  - `"Name": "WGS 84 / Pseudo-Mercator"`, Aliase „WGS 84 / Popular Visualisation Pseudo-Mercator" und „Web Mercator"
  - Anwendung (Usage 2858): „Web mapping and visualisation."
  - Bemerkung: „Not a recognised geodetic system. Uses spherical development of ellipsoidal coordinates. Relative to WGS 84 / World Mercator (CRS code 3395) gives errors of 0.7 percent in scale and differences in northing of up to 43km in the map (21km on the ground)."
  - Gültigkeitsbereich (Extent 3544): „World between 85.06°S and 85.06°N." mit Bemerkung „Web map tile service latitude limit is +/- 85.05112878°."
- **Deckt in BIOME:** Ausschließlich die Kachel-Darstellung in der Kartenansicht (Slippy Map).
- **Deckt ausdrücklich nicht:** Jede Messung. Der Herausgeber bezeichnet das System selbst als
  „Not a recognised geodetic system" und beziffert den Maßstabsfehler mit 0,7 Prozent. Eine in
  EPSG:3857 berechnete Fläche oder Länge ist in BIOME **kein zulässiger Kennzahlenwert**.
  Deckt auch keine Breiten jenseits ±85,06°.

### DATUM-ETRS89 · ETRS89-Datum-Ensemble und die Grenze der Lagegenauigkeit
- **Herausgeber:** EPSG (Data source: EPSG)
- **Quelle:** https://apps.epsg.org/api/v1/Datum/6258/ und https://apps.epsg.org/api/v1/Datum/6326/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:**
  - ETRS89 (6258), `"Type": "ensemble"`: „Has been realized through ETRF89, ETRF90, ETRF91, ETRF92, ETRF93, ETRF94, ETRF96, ETRF97, ETRF2000, ETRF2005, ETRF2014 and ETRF2020. This ensemble covers any or all of these pan-European realizations and all national densifications without distinction."
  - WGS 84 (6326), `"Type": "ensemble"`: „EPSG::6326 has been the then current realization. No distinction is made between the original and subsequent (G730, G873, G1150, G1674, G1762, G2139 and G2296) WGS 84 frames. Since 1997, WGS 84 has been maintained within 10cm of the then current ITRF."
- **Deckt in BIOME:** Die begründete Obergrenze für Genauigkeitsaussagen. Sowohl EPSG:25833 als
  auch EPSG:4326 hängen an einem **Ensemble**, das mehrere Realisierungen „without distinction"
  zusammenfasst. Solange BIOME nur „ETRS89" bzw. „WGS 84" speichert und keine konkrete
  Realisierung (ETRF2014 o. ä.) und keine Epoche, darf die Oberfläche **keine Lagegenauigkeit
  unterhalb der Ensemble-Unschärfe behaupten**.
- **Deckt ausdrücklich nicht:** Eine Zahl. Die abgerufene Registry-Antwort enthält für beide
  Ensembles **kein** numerisches Genauigkeitsfeld. Für WGS 84 ist lediglich der Bezug zum ITRF
  mit „within 10cm" beziffert; für ETRS89 findet sich in der abgerufenen Antwort gar keine
  Zahlenangabe. Eine konkrete Meterangabe ist aus dieser Quelle **nicht** belegbar.

### CRS-INSPIRE · Zulässige Koordinatenreferenzsysteme nach INSPIRE
- **Herausgeber:** Europäische Kommission / INSPIRE Maintenance and Implementation Framework;
  zitiert die rechtsverbindliche Verordnung (EU) Nr. 1089/2010, Anhang II
- **Quelle:** https://inspire-mif.github.io/technical-guidelines/data/hy/dataspecification_hy.pdf (232 Seiten, Abschnitt 6.1.1)
- **Abgerufen:** 2026-08-09 (HTTP 200, application/pdf)
- **Wörtlich:**
  - IR Requirement, Annex II, Section 1.2: „For the three-dimensional and two-dimensional coordinate reference systems and the horizontal component of compound coordinate reference systems used for making spatial data sets available, the datum shall be the datum of the European Terrestrial Reference System 1989 (ETRS89) in areas within its geographical scope, or the datum of the International Terrestrial Reference System (ITRS) or other geodetic coordinate reference systems compliant with ITRS in areas that are outside the geographical scope of ETRS89."
  - IR Requirement, Annex II, Section 1.3: „Spatial data sets shall be made available using at least one of the coordinate reference systems specified in sections 1.3.1, 1.3.2 and 1.3.3, unless one of the conditions specified in section 1.3.4 holds."
  - Section 1.3.2 „Two-dimensional Coordinate Reference Systems": „Two-dimensional geodetic coordinates (latitude and longitude) based on a datum specified in 1.2 and using the parameters of the GRS80 ellipsoid." / „Plane coordinates using the ETRS89 Lambert Azimuthal Equal Area coordinate reference system." / „Plane coordinates using the ETRS89 Lambert Conformal Conic coordinate reference system." / „Plane coordinates using the ETRS89 Transverse Mercator coordinate reference system."
- **Deckt in BIOME:** Die Begründung dafür, dass EPSG:25833 das richtige Speicher-CRS ist:
  UTM Zone 33N ist eine ETRS89-Transverse-Mercator-Abbildung und damit nach 1.3.2 zulässig.
- **Deckt ausdrücklich nicht:** EPSG:3857. Pseudo-Mercator taucht in der Liste 1.3.2 **nicht** auf.
  Sollte BIOME jemals INSPIRE-konform liefern müssen, ist 3857 als Abgabeformat unzulässig.
  Deckt außerdem nicht den deutschen Wortlaut — die Verordnung 1089/2010 war am Abrufdatum bei
  EUR-Lex nicht erhältlich (siehe „Nicht zugänglich"); zitiert ist hier die englische Wiedergabe
  der Kommission in ihrer eigenen Technical Guideline.

### CRS-ID · Verpflichtende Schreibweise des CRS-Identifikators
- **Herausgeber:** Koordinierungsstelle GDI-DE, Bundesamt für Kartographie und Geodäsie (BKG), Arbeitskreis Metadaten
- **Quelle:** https://wiki.gdi-de.org/download/attachments/3344909/Architektur_GDI-DE_Konventionen_Metadaten_V2_3_3.pdf
  („Architektur der Geodateninfrastruktur Deutschland — Konventionen zu Metadaten", Version 2.3.3, Datum 13.03.2026), Abschnitt 2.13
- **Abgerufen:** 2026-08-09 (HTTP 200, application/pdf, 94 Seiten)
- **Wörtlich:**
  - „Für Geodaten soll das Koordinatenreferenzsystem, in dem die beschriebenen Geodaten tatsächlich vorliegen, als EPSG-Code in den Metadaten hinterlegt werden. Für Geodatendienste sollen die EPSG-Codes, in denen der Dienst die Geodaten bereitstellen kann, in den Metadaten hinterlegt werden."
  - „Für beide Varianten wird analog zu den INSPIRE-Vorgaben als Identifier der HTTP URI Identifier für das opengis.net-Repository vorgeschrieben."
  - „… ist für den genannten HTTP URI Identifier http://www.opengis.net/def/crs/EPSG/0/[EPSG-Code] zu verwenden"
  - XPath: `MD_Metadata/referenceSystemInfo/MD_ReferenceSystem/referenceSystemIdentifier/RS_Identifier/code`
  - Bedingung: „Die zu beschreibende Ressource besitzt einen absoluten Raumbezug."
- **Zusatzprüfung:** Der vorgeschriebene URI wurde aufgelöst:
  `http://www.opengis.net/def/crs/EPSG/0/25833` → HTTP 200, liefert eine GML-Definition
  (`<gml:ProjectedCRS gml:id="epsg-crs-25833">`). Der Identifikator ist also nicht nur
  vorgeschrieben, sondern auch tatsächlich dereferenzierbar.
- **Deckt in BIOME:** Das Format, in dem BIOME sein CRS nach außen benennt: nicht „EPSG:25833"
  als Freitext, sondern `http://www.opengis.net/def/crs/EPSG/0/25833`. Gilt für Exporte und für
  jede Metadatenausgabe.
- **Deckt ausdrücklich nicht:** Gitterbasierte Bezugssysteme. Die Quelle sagt dazu in Fußnote 12
  ausdrücklich: „Die EPSG-Registry basiert auf der ISO 19111:2007 und kann demnach keine
  gitterbasierten Raumbezugssysteme wie MGRS / UTMREF abbilden." MGRS-Angaben lassen sich in
  BIOME also nicht über einen EPSG-Code beschreiben.

### BE-CRS · Ausgabe-CRS der Berliner Geodateninfrastruktur (belegt am laufenden Dienst)
- **Herausgeber:** Land Berlin, Geodateninfrastruktur Berlin (gdi.berlin.de); fachlich
  Senatsverwaltung für Mobilität, Verkehr, Klimaschutz und Umwelt Berlin
- **Quellen (alle am 2026-08-09 abgerufen, alle HTTP 200):**
  - WFS: `https://gdi.berlin.de/services/wfs/baumbestand?REQUEST=GetCapabilities&SERVICE=WFS`
  - WMS: `https://gdi.berlin.de/services/wms/baumbestand?request=GetCapabilities&service=WMS`
  - WFS Umweltatlas: `https://gdi.berlin.de/services/wfs/ua_vegetationshoehen_2020?request=GetCapabilities&service=WFS`
  - GetFeature: `…/wfs/baumbestand?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=baumbestand:strassenbaeume&COUNT=1`
  - Metadatensatz FIS-Broker über CKAN: `https://datenregister.berlin.de/api/3/action/package_search?q=%22Baumbestand%20Berlin%22`
- **Wörtlich:**
  - WFS 2.0.0, Dienst „Baumbestand Berlin": `<DefaultCRS>urn:ogc:def:crs:EPSG::25833</DefaultCRS>`
  - dazu `<OtherCRS>` mit `urn:ogc:def:crs:EPSG::25832`, `urn:ogc:def:crs:EPSG::4326`, `urn:ogc:def:crs:EPSG::4258`, `urn:ogc:def:crs:EPSG::3857`
  - WMS: `<CRS>` mit `EPSG:25833`, `EPSG:25832`, `EPSG:4326`, `EPSG:4258`, `EPSG:3857`, `CRS:84`
  - WMS-BoundingBox: `<BoundingBox CRS="EPSG:25833" minx="369281.5074458656" miny="5798902.722023736" maxx="416114.7238459767" maxy="5836814.627536138">`
  - Umweltatlas „Vegetationshöhen 2020 (Umweltatlas)": ebenfalls `<DefaultCRS>urn:ogc:def:crs:EPSG::25833</DefaultCRS>` mit derselben OtherCRS-Liste
  - Tatsächlich ausgelieferte Nutzlast: `srsName="urn:ogc:def:crs:EPSG::25833"` mit `<gml:pos>394532.25579996 5811460.99109967</gml:pos>`
  - Metadatenfeld im FIS-Broker-Datensatz: `spatial-reference-system = 'http://www.opengis.net/def/crs/EPSG/0/25833'`
  - Lizenz: `license_title = 'Datenlizenz Deutschland – Zero – Version 2.0'`
  - `metadata-language = 'ger'`, `harvest_source_title = 'FIS-Broker'`
- **Deckt in BIOME:** Die Antwort auf die Auftragsfrage. Die Berliner GDI gibt **EPSG:25833 als
  Default aus** — im Dienst, in der Nutzlast und im Metadatensatz übereinstimmend, und zwar
  sowohl beim Baumbestand als auch im Umweltatlas. Nachgeordnet stehen 25832, 4326, 4258 und
  3857 zur Verfügung, beim WMS zusätzlich CRS:84. Die Achsenreihenfolge in der URN-Form ist
  belegbar **Easting Northing** (394532 E / 5811461 N liegt in Berlin, umgekehrt nicht).
  BIOME kann Berliner Fachdaten also ohne Umprojektion in 25833 übernehmen.
- **Deckt ausdrücklich nicht:** Eine Aussage über die Berliner GDI insgesamt. Geprüft wurden
  drei Dienste (Baumbestand WFS, Baumbestand WMS, Umweltatlas Vegetationshöhen WFS). Alle drei
  stimmen überein, aber daraus folgt nicht, dass jeder Berliner Dienst 25833 als Default führt.
  Deckt auch keine Genauigkeitsaussage — das CRS sagt nichts über die Erfassungsgenauigkeit.

### BE-GEOM · Geometrietyp des Berliner Baumbestands
- **Herausgeber:** Land Berlin, Geodateninfrastruktur Berlin
- **Quelle:** `https://gdi.berlin.de/services/wfs/baumbestand?SERVICE=WFS&VERSION=2.0.0&REQUEST=DescribeFeatureType&TYPENAMES=baumbestand:strassenbaeume`
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich:** Das Schema deklariert die Geometrie als
  `<xsd:element name="geom" type="gml:PointPropertyType" nillable="true"/>`.
  Die Sachattribute lauten: `gisid` (xsd:string, nillable="false"), `pitid`, `standortnr`,
  `kennzeich`, `namenr`, `art_dtsch`, `art_bot`, `gattung_deutsch`, `gattung`, `art_gruppe`,
  `strnr`, `strname`, `hausnr`, `zusatz`, `pflanzjahr` (alle xsd:string),
  `standalter` (xsd:double), `kronedurch` (xsd:double), `stammumfg` (xsd:int),
  `baumhoehe` (xsd:double), `eigentuemer`, `bezirk` (xsd:string).
  Dienstbeschreibung: „Die Daten umfassen Straßenbäume und einen Teil der Bäume in Grünanlagen."
- **Deckt in BIOME:** Der Berliner Baumbestand ist ein **Punktdatensatz**. BIOME darf aus dieser
  Quelle einen Baumstandort als Punkt führen, und `gisid` ist der einzige nicht-nullable
  Schlüssel, also der Kandidat für die stabile externe ID.
- **Deckt ausdrücklich nicht:** Kronenflächen, Überschirmung, Beschattung oder irgendeine
  Bezugsfläche. Eine Fläche ist in diesem Datensatz nicht enthalten und darf aus ihm nicht
  abgeleitet und als erhoben dargestellt werden. Deckt vor allem **keine Einheiten**: Das Schema
  deklariert für `kronedurch`, `stammumfg` und `baumhoehe` nur Datentypen, **keine Maßeinheit**.
  Welche Einheit gilt, ist aus dieser Quelle nicht belegbar (siehe Offene Fragen).

### MD-INSPIRE · Metadaten-Pflichtfelder für Geodatensätze
- **Herausgeber:** Europäische Kommission — Verordnung (EG) Nr. 1205/2008 der Kommission vom
  3. Dezember 2008 zur Durchführung der Richtlinie 2007/2/EG hinsichtlich Metadaten
  (konsolidierte Fassung 02008R1205-20081224)
- **Quelle:** https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:02008R1205-20081224
- **Abgerufen:** 2026-08-09 (HTTP 200; ein späterer Wiederholungsabruf lieferte HTTP 202 mit
  leerem Rumpf — der Volltext lag zum Zeitpunkt der Auswertung vor)
- **Wörtlich (Artikel 3):** „Metadaten, die einen Geodatensatz, eine Geodatensatzreihe oder einen
  Geodatendienst beschreiben, bestehen aus den in Teil B des Anhangs festgelegten
  Metadatenelementen oder Gruppen von Metadatenelementen und sind nach den in den Teilen C und D
  des Anhangs festgelegten Vorschriften zu erstellen und zu pflegen."
- **Wörtlich (Teil C):** „Wird für ein bestimmtes Metadatenelement keine Bedingung angeführt, ist
  dieses Element obligatorisch." — Multiplizität: „1 bedeutet, dass das Metadatenelement in der
  Ergebnismenge genau einmal auftritt; 1..* bedeutet, dass dieses Element in der Ergebnismenge
  mindestens einmal auftritt; 0..1 bedeutet, dass das Auftreten des Metadatenelements in der
  Ergebnismenge von Bedingungen abhängt, dass es aber nur genau einmal auftreten kann; 0..*
  bedeutet, dass das Auftreten des Metadatenelements in der Ergebnismenge von Bedingungen
  abhängt, dass es aber auch mehrfach auftreten kann."
- **Wörtlich (einzelne Elemente, Teil B):**
  - 1.1 Ressourcenbezeichnung: „Charakteristische und häufig eindeutige Bezeichnung, unter der die Ressource bekannt ist." — Wertebereich Freitext
  - 1.5 Eindeutiger Ressourcenbezeichner: „Ein Wert, durch den die Ressource eindeutig gekennzeichnet wird." — „ein obligatorischer Zeichenkettencode, der in der Regel vom Eigentümer der Daten zugeordnet wird, und ein Zeichenketten-Namensraum, der das Umfeld des Bezeichnercodes eindeutig bestimmt"
  - 4.1 Geografisches Begrenzungsrechteck: „Das Begrenzungsrechteck wird durch seine westliche und östliche Länge sowie durch seine nördliche und südliche Breite in Dezimalgrad mit einer Genauigkeit von mindestens 2 Dezimalstellen definiert."
  - 5 Zeitbezug: „Die Voreinstellung für dieses Bezugssystem ist der Gregorianische Kalender mit Datumsangaben, die ISO 8601 entsprechen."
  - 6.1 Herkunft: „Angaben zum Ablauf der Datenerstellung und/oder zur Gesamtqualität des Geodatensatzes." — Wertebereich Freitext
  - 8.1 Bedingungen für den Zugang und die Nutzung: „Das Element muss Werte enthalten. Gelten für den Zugang zur Ressource und ihre Nutzung keine Bedingungen, ist ‚Es gelten keine Bedingungen' anzugeben. Sind die Bedingungen unbekannt, ist ‚Bedingungen unbekannt' anzugeben."
  - 10.2 Datum der Metadaten: „Dieses Datum gibt an, wann der Metadatensatz erstellt oder aktualisiert wurde. Die Datumsangabe erfolgt nach ISO 8601."
- **Multiplizitäten aus Tabelle 1 (Geodatensätze und -reihen):** Ressourcenbezeichnung 1 ·
  Ressourcenüberblick 1 · Ressourcenart 1 · Ressourcenverweis 0..* · Eindeutiger
  Ressourcenbezeichner 1..* · Ressourcensprache 0..* · Themenkategorie 1..* · Schlüsselwort 1..* ·
  Geografisches Begrenzungsrechteck 1..* · Zeitbezug 1..* · **Herkunft 1** · Räumliche Auflösung
  0..* · Übereinstimmung 1..* · Zugangs- und Nutzungsbedingungen 1..* · Beschränkungen des
  öffentlichen Zugangs 1..* · Zuständige Stelle 1..* · Kontakt für die Metadaten 1..* · Datum der
  Metadaten 1 · Sprache der Metadaten 1.
- **Deckt in BIOME:** Den vollständigen Pflichtfeldsatz für jeden Datensatz, den BIOME als
  Geodatensatz veröffentlicht oder einliest. Insbesondere: Bounding Box mit **mindestens zwei
  Nachkommastellen in Dezimalgrad**, alle Datumsangaben **ISO 8601**, Zugangsbedingungen dürfen
  nie leer sein (Ersatztexte sind wörtlich vorgegeben).
- **Deckt ausdrücklich nicht:** **Lagegenauigkeit.** Die Verordnung kennt unter „6. QUALITÄT UND
  GÜLTIGKEIT" nur „Herkunft" und „Räumliche Auflösung". Ein Pflichtfeld für Positions- oder
  Lagegenauigkeit existiert in 1205/2008 nicht. Deckt auch keine Angaben zu Attributgenauigkeit,
  Vollständigkeit oder Aktualitätsgrad.

### MD-AUFL · Räumliche Auflösung
- **Herausgeber:** Europäische Kommission (VO 1205/2008, Anhang Teil B 6.2); ergänzend
  Koordinierungsstelle GDI-DE / BKG
- **Quellen:** https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:02008R1205-20081224
  (HTTP 200) und Konventionen zu Metadaten V2.3.3, Abschnitt 3.10 (HTTP 200)
- **Abgerufen:** 2026-08-09
- **Wörtlich (VO 1205/2008, B 6.2):** „Die räumliche Auflösung bezieht sich auf den
  Detaillierungsgrad des Datensatzes und ist als Menge von null bis vielen Auflösungsabständen
  (in der Regel für Gitterdaten und aus Bildern abgeleitete Produkte) oder als äquivalente
  Maßstäbe (in der Regel für Karten und daraus abgeleitete Produkte) anzugeben. Ein äquivalenter
  Maßstab wird im Allgemeinen als ganze Zahl angegeben, die den Nenner des Maßstabs bezeichnet.
  Ein Auflösungsabstand ist als numerischer Wert zusammen mit einer Längeneinheit anzugeben."
- **Wörtlich (GDI-DE V2.3.3, 3.10):** Bedingung — „Für die zu beschreibende Ressource (Datensätze
  und -serien) ist ein Maßstab (bei Vektordaten) oder eine Bodenauflösung (bei Rasterdaten)
  bekannt". Ferner: „Sie müssen dokumentiert werden, sofern für diese Ressource ein Maßstab oder
  eine Bodenauflösung angegeben werden kann." XPaths:
  `…/spatialResolution/MD_Resolution/equivalentScale/MD_RepresentativeFraction/denominator`
  und `…/spatialResolution/MD_Resolution/distance`.
- **Deckt in BIOME:** Zwei — und nur zwei — zulässige Ausdrucksformen für Auflösung: entweder
  ein **äquivalenter Maßstab als ganzzahliger Nenner** (z. B. 5000 für 1:5.000) oder ein
  **Auflösungsabstand als Zahl mit Längeneinheit** (z. B. 1 m). Ein Feld „Auflösung" ohne
  Einheit oder ohne Angabe, welche der beiden Formen gemeint ist, ist nicht regelkonform.
- **Deckt ausdrücklich nicht:** Räumliche Auflösung ist **nicht** dasselbe wie Lagegenauigkeit.
  Die Quelle definiert sie als „Detaillierungsgrad", nicht als Abweichung von der wahren Lage.
  BIOME darf die beiden Begriffe nicht in ein Feld zusammenziehen.

### QUAL-LAGE · Lagegenauigkeit (Positional accuracy)
- **Herausgeber:** Europäische Kommission / INSPIRE Maintenance and Implementation Framework
- **Quelle:** https://inspire-mif.github.io/technical-guidelines/data/hy/dataspecification_hy.pdf,
  Abschnitte 7.1.6 und 7.1.7
- **Abgerufen:** 2026-08-09 (HTTP 200, application/pdf)
- **Wörtlich:**
  - „Recomendation 19 — Absolute or external accuracy should be evaluated and documented using Mean value of positional uncertainties (1D, 2D) as specified in the tables below."
  - Name: „mean value of positional uncertainties (1D, 2D)"; Data quality element: „positional accuracy"; Data quality subelement: „absolute or external accuracy"
  - Definition: „mean value of the positional uncertainties for a set of positions where the positional uncertainties are defined as the distance between a measured position and what is considered as the corresponding true position"
  - Evaluation scope: „spatial object"; Reporting scope: „spatial object type" / „data set"; Data quality value type: „measure"; Measure identifier: „28"
  - Source reference: „ISO/DIS 19157 Geographic information – Data quality"
  - Abschnitt 7.1.7: Name „relative horizontal error", Alternative name „Rel CE90", Data quality subelement „relative or internal accuracy"
- **Deckt in BIOME:** Eine belegte, zitierfähige Definition dessen, was eine Lagegenauigkeitsangabe
  bedeutet: **mittlerer Abstand zwischen gemessener und als wahr angenommener Position**, über
  eine Menge von Positionen. Einheit ist eine Länge. Bezugsebene ist wahlweise das Einzelobjekt,
  die Objektart oder der Datensatz — BIOME muss die Bezugsebene mitführen, sonst ist die Zahl
  nicht interpretierbar. Wird stattdessen die relative Genauigkeit angegeben, ist „Rel CE90"
  der belegte Name.
- **Deckt ausdrücklich nicht:** Eine Verpflichtung. Der Wortlaut ist ausdrücklich eine
  „Recomendation", kein „IR Requirement". Deckt auch nicht den normativen Volltext: Die Quelle
  verweist für die Definition selbst auf „ISO/DIS 19157", und ISO 19157 war nicht abrufbar
  (siehe „Nicht zugänglich"). Zitiert ist hier die Wiedergabe der Kommission, nicht die ISO-Norm.

### EINH-FLAECHE · Gesetzliche Einheiten für Flächenangaben in Deutschland
- **Herausgeber:** Bundesrepublik Deutschland — Ausführungsverordnung zum Gesetz über die
  Einheiten im Messwesen und die Zeitbestimmung (EinhV), bereitgestellt durch das
  Bundesministerium der Justiz / Bundesamt für Justiz
- **Quelle:** https://www.gesetze-im-internet.de/einhv/__1.html und
  https://www.gesetze-im-internet.de/einhv/anlage_1.html
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich (§ 1 Absatz 1):** „Gesetzliche Einheiten und Einheitenzeichen gemäß § 2 Nr. 1 des
  Einheiten- und Zeitgesetzes sind 1. die in Anlage 1 Spalten 2 und 3 aufgeführten Einheiten mit
  besonderem Namen, 2. die aus den Einheiten nach Nummer 1 mit dem Zahlenfaktor 1 abgeleiteten
  Einheiten."
- **Wörtlich (§ 1 Absatz 2):** „Für die Einheiten in Anlage 1 gelten die Definitionen und
  Beziehungen, die in Kapitel I des Anhangs der Richtlinie 80/181/EG vom 20. Dezember 1979
  (ABl. L 39 vom 15.2.1980, S. 40) in ihrer jeweils geltenden Fassung aufgeführt sind."
- **Wörtlich (Anlage 1, Zeilen 2, 17 und 27):**
  - „2 | Ar | a | Fläche von Grundstücken und Flurstücken"
  - „17 | Hektar | ha | Fläche von Grundstücken und Flurstücken"
  - „27 | Meter | m | Länge"
- **Deckt in BIOME:** Die zulässigen Flächeneinheiten. **Quadratmeter (m²)** ist gedeckt, weil es
  nach § 1 Abs. 1 Nr. 2 eine mit dem Zahlenfaktor 1 aus dem Meter abgeleitete Einheit ist.
  **Ar (a)** und **Hektar (ha)** sind eigenständig gedeckt, aber laut Anlage 1 mit dem
  ausdrücklich benannten Anwendungsbereich „Fläche von Grundstücken und Flurstücken".
  Längen (Stammumfang, Kronendurchmesser, Höhe) gehören in **Meter**.
- **Deckt ausdrücklich nicht:** Ar und Hektar außerhalb von Grundstücks- und Flurstücksflächen.
  Die Anlage nennt für diese beiden Einheiten einen konkreten Anwendungsbereich; für z. B.
  Kronenprojektionsflächen oder Biotopflächen ist daraus keine Deckung ableitbar — dort ist m²
  die sichere Wahl. Deckt außerdem keine nicht-metrischen Einheiten.

---

## Nicht zugänglich

| Norm/Quelle | Warum | Status | Was dadurch in BIOME NICHT belegbar ist |
|---|---|---|---|
| ISO 19115-1 Geographic information — Metadata (https://www.iso.org/standard/53798.html) | Kostenpflichtig, Zugriff vom Herausgeber gesperrt | HTTP 403 | Der normative Wortlaut der Metadatenelemente. BIOME kann sich auf ISO 19115 nur mittelbar über INSPIRE 1205/2008 und die GDI-DE-Konventionen berufen, die einzelne Elemente und XPaths zitieren. Keine Aussage über Elemente, die dort nicht zitiert sind. |
| ISO 19115 in der ISO Online Browsing Platform (https://www.iso.org/obp/ui/#iso:std:iso:19115:-1:ed-1:v1:en) | Auch die sonst frei einsehbare Begriffsvorschau war gesperrt | HTTP 403 | Die offiziellen ISO-Begriffsdefinitionen (z. B. „metadata", „resource") im Originalwortlaut. |
| ISO 19157 Geographic information — Data quality (https://www.iso.org/standard/78900.html) | Kostenpflichtig, Zugriff gesperrt | HTTP 403 | Der normative Wortlaut der Datenqualitätselemente, insbesondere die Originaldefinition von „positional accuracy" und die vollständige Liste der Qualitätsmaße. Belegt ist nur die Wiedergabe in der INSPIRE-Guideline (siehe QUAL-LAGE), und die verweist auf den **Entwurfsstand** „ISO/DIS 19157". |
| Verordnung (EU) Nr. 1089/2010 (Interoperabilität), deutscher Volltext bei EUR-Lex — CELEX 32010R1089 und 02010R1089-20141231, HTML und PDF | Server nahm die Anfrage an, lieferte aber durchgehend einen leeren Rumpf; sechs Versuche über zwei URL-Formen und beide Formate | HTTP 202, Größe 0 | Der **deutsche, rechtsverbindliche** Wortlaut zu Datum und zulässigen Koordinatenreferenzsystemen. Der Inhalt ist über die englische Wiedergabe der Kommission in ihrer Technical Guideline gedeckt (siehe CRS-INSPIRE), der amtliche deutsche Wortlaut aber nicht. |
| AdV, Fachinformation „Raumbezug" (https://www.adv-online.de/de/fachinformationen/raumbezug) | Seite erreichbar, aber ohne Inhalt: „Hier entsteht etwas Neues! Unsere Website befindet sich aktuell im Aufbau" | HTTP 200, ohne Sachinhalt | Eine **amtliche deutsche Festlegung der AdV**, dass ETRS89/UTM das amtliche Lagebezugssystem ist. Diese in der Fachwelt geläufige Aussage konnte am Abrufdatum aus keiner AdV-Seite wörtlich belegt werden. Die AdV-Seiten „GeoInfoDok" (HTTP 200) und „SAPOS" (HTTP 200) wurden ebenfalls gelesen und enthalten keine solche Aussage. |
| INSPIRE D2.5 Generic Conceptual Model (https://inspire.ec.europa.eu/documents/Data_Specifications/D2.5_v3.2.pdf) | URL liefert keine PDF, sondern eine HTML-Fehlerseite „Inspire Registry - Page not found" | HTTP 200, Inhalt = Fehlerseite | Das übergreifende INSPIRE-Konzeptmodell. Ersatzweise wurde eine offizielle, vollständige Technical Guideline verwendet (siehe CRS-INSPIRE, QUAL-LAGE). |
| DIN 18709-1 (Begriffe im Vermessungswesen) | Kein frei zugänglicher Volltext gefunden; die probeweise aufgerufene Verlagsseite existierte unter der versuchten Adresse nicht. Der 404 belegt **nicht**, dass die Norm nicht anderswo angeboten wird — er belegt nur, dass ich keinen Zugang hergestellt habe | HTTP 404 auf https://www.dinmedia.de/de/norm/din-18709-1/109456894 | Deutschsprachige Normbegriffe wie „Lagegenauigkeit", „Punktgenauigkeit", „Standardabweichung der Lage" im normativen Wortlaut. BIOME kann sich für die deutsche Begrifflichkeit auf keine geprüfte Norm stützen. |

---

## Offene Fragen an Malte

- **Welches CRS ist das Speicher-CRS der Datenbank?** Belegt ist: Berlin liefert EPSG:25833,
  metrisch, für Berlin passend. Für PostGIS bedeutet das `geometry(Point, 25833)` als
  Fachgeometrie. Wenn BIOME über Berlin hinaus wachsen soll, bricht Zone 33 westlich von 12° O.
  Soll dann eine zweite Spalte in 4326 als Austauschgeometrie mitgeführt werden? Das sollte
  jetzt entschieden werden, nicht nach der ersten Migration.

- **Einheiten der Berliner Baumattribute sind nicht belegbar.** Das WFS-Schema deklariert
  `kronedurch`, `stammumfg` und `baumhoehe` nur als Zahlentypen, ohne Einheit. Der Beispielsatz
  lieferte `stammumfg = 115`, `baumhoehe = 15.0`, `kronedurch = 0.0`. Die naheliegende Lesart
  (Zentimeter, Meter, Meter) ist **eine Vermutung und kein Beleg**. Bevor BIOME diese Werte
  anzeigt oder verrechnet, brauchen wir eine dokumentierte Einheitenangabe vom Datenhalter
  (Kontakt aus dem Metadatensatz: `bjoern.dejoks@senmvku.berlin.de`).

- **`kronedurch = 0.0` im ersten Datensatz.** Es ist offen, ob 0 „nicht erhoben" oder „gemessen
  null" heißt. Falls 0 als Null-Ersatz benutzt wird, muss BIOME beim Import auf NULL abbilden,
  sonst verfälscht jeder Mittelwert. Soll ich das an einer größeren Stichprobe prüfen?

- **Pflichtfeld „Herkunft" ist beim Berliner Datensatz leer.** Die INSPIRE-Verordnung setzt für
  „Herkunft" (lineage) die Multiplizität **1**, also obligatorisch. Im geernteten Metadatensatz
  steht `lineage = ''`. Wollen wir für BIOME-eigene Datensätze strenger sein als die Quelle und
  Herkunft erzwingen? Ich empfehle ja, weil das Register sonst eine Lücke legitimiert.

- **Keine Lagegenauigkeit für die Berliner Baumdaten.** Weder Dienst noch Metadatensatz nennen
  eine Positionsgenauigkeit. BIOME kann also zu keinem übernommenen Baumstandort sagen, wie
  genau er ist. Soll die Oberfläche das Feld leer lassen und als „nicht angegeben" ausweisen —
  oder soll es das Feld für Fremddaten gar nicht erst geben?

- **Muss BIOME INSPIRE-konform sein?** Davon hängt ab, ob EPSG:3857 als Exportformat überhaupt
  angeboten werden darf (nach 1089/2010 Anhang II 1.3.2 wäre es unzulässig) und ob der volle
  Pflichtfeldsatz aus 1205/2008 durchgesetzt werden muss. Das ist eine Produktentscheidung, die
  ich nicht aus den Quellen ableiten kann.

- **Hektar außerhalb von Grundstücksflächen.** Die EinhV nennt für Ar und Hektar den
  Anwendungsbereich „Fläche von Grundstücken und Flurstücken". Für Kronen-, Biotop- oder
  Pflanzflächen ist Hektar damit nicht gedeckt. Soll BIOME Flächen durchgängig in m² führen und
  ha nur als Anzeigeformat bei Grundstücksbezug erlauben?

- **Technische Randnotiz zur Beschaffung.** Die Berliner Dienste (`gdi.berlin.de`,
  `fbinter.stadt-berlin.de`) hängen an der Zertifikatskette „Telekom Security TLS RSA Root
  2023", die im Trust Store dieser Umgebung fehlt. Die Abrufe gelangen erst nach Ergänzung des
  öffentlichen Mozilla-Wurzelzertifikatsatzes zustande; die Zertifikatsprüfung blieb dabei
  aktiv. Wenn BIOME diese Dienste automatisiert abfragt, muss der Deployment-Container diesen
  Root mitbringen, sonst schlägt der Import mit einem TLS-Fehler fehl.
