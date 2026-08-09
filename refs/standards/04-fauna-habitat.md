# Standards-Register — Fauna, Habitatstrukturen, Artenschutz

> Stand: 2026-08-09. Nur frei zugängliche, wörtlich belegte Quellen.
> Regel: Was hier nicht gedeckt ist, darf die BIOME-Oberfläche nicht anbieten.
>
> Abrufhinweise für Nachprüfungen:
> 1. **EUR-Lex** liefert für manche Dokumente HTTP **202 mit leerem Body** statt des Textes.
>    Betroffen waren am 2026-08-09 alle konsolidierten Fassungen beim ersten Versuch sowie
>    dauerhaft CELEX `32025L1237`. Die *Originalfassungen* über
>    `/legal-content/DE/TXT/HTML/?uri=CELEX:31992L0043&from=DE` bzw. `…32009L0147&from=DE`
>    antworten mit HTTP 200. Ein 202 ist kein Beleg dafür, dass ein Dokument nicht existiert —
>    es ist aber auch kein Beleg für seinen Inhalt.
> 2. **gesetze-im-internet.de** liefert ISO-8859-1. Beim Parsen als UTF-8 zerfällt nur die
>    Kopfzeile; der Normtext steht als HTML-Entities und bleibt korrekt. Für rechtssichere
>    Zitate trotzdem mit `iso-8859-1` dekodieren.
> 3. Mehrere Seiten (`dda-web.de/voegel/*`, `techdocs.gbif.org`, `dda-web.de/…/brutzeitcodes`)
>    antworten mit HTTP 200, liefern aber eine JavaScript-Hülle ohne den fachlichen Inhalt.
>    Siehe „Nicht zugänglich".

## Gedeckte Definitionen

### DWC-00 · Darwin Core — Normstatus, Fassung, Lizenz
- **Herausgeber:** Darwin Core Maintenance Group, Biodiversity Information Standards (TDWG)
- **Quelle:** https://dwc.tdwg.org/list/ (normatives Dokument) · https://dwc.tdwg.org/terms/ (Quick Reference Guide)
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200)
- **Wörtlich** (Dokumentkopf des normativen Dokuments):
  „Title — Darwin Core List of Terms" · „Date version issued — 2026-05-26" · „Date created — 2020-08-12" · „Part of TDWG Standard — http://www.tdwg.org/standards/450" · „This version — http://rs.tdwg.org/dwc/doc/list/2026-05-26" · „Previous version — http://rs.tdwg.org/dwc/doc/list/2025-07-10"
  „Abstract — Darwin Core is a vocabulary standard for transmitting information about biodiversity. This document lists all terms in namespaces currently used in the vocabulary."
- **Wörtlich** (Abgrenzung auf der Quick-Reference-Seite — wichtig, weil dort die Beispiele stehen):
  „This page is not part of the standard, but combines the normative term names and definitions with the non-normative comments and examples that are meant to help people to use the terms consistently."
- **Wörtlich** (Zitierweise, Fuß der Quick-Reference-Seite):
  „Darwin Core Maintenance Group. 2021. List of Darwin Core terms. Biodiversity Information Standards (TDWG). http://rs.tdwg.org/dwc/doc/list/"
  „Content on this site, made open by Biodiversity Information Standards (TDWG) is licensed under a Creative Commons Attribution 4.0 Inter[national License]" (Text am Seitenende abgeschnitten; der Lizenzname ist vollständig lesbar)
- **Deckt in BIOME:**
  - **Verbindliche Fassung:** Darwin Core in der Fassung vom **2026-05-26**. BIOME muss die Fassung mitspeichern, weil einzelne Termdefinitionen zwischen den Fassungen geändert wurden (siehe „Modified" je Term in DWC-01).
  - **Normativ sind nur Termname und Definition.** „Notes" und „Examples" sind ausdrücklich nicht-normativ. BIOME darf daraus keine Pflichtvalidierung ableiten, nur Empfehlungen.
  - **Lizenz:** CC BY 4.0 — die Definitionen dürfen in BIOME angezeigt werden, mit Namensnennung TDWG.
- **Deckt ausdrücklich nicht:** eine Pflicht, Darwin Core zu verwenden; ein Datenbankschema; eine Validierungslogik. Darwin Core ist ein Vokabular für den *Austausch*, kein Erhebungsstandard.

### DWC-01 · Die zehn tragenden Terme — wörtlich
- **Herausgeber:** Darwin Core Maintenance Group (TDWG)
- **Quelle:** https://dwc.tdwg.org/list/ · https://dwc.tdwg.org/terms/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Term-IRI, „Modified", „Definition" — vollständig und unverändert):

  | Term | Term IRI | Modified | Definition (wörtlich) |
  |---|---|---|---|
  | `occurrenceID` | `http://rs.tdwg.org/dwc/terms/occurrenceID` | 2026-05-26 | „An identifier for a dwc:Occurrence (as opposed to a particular digital record of a dwc:Occurrence)." |
  | `basisOfRecord` | `http://rs.tdwg.org/dwc/terms/basisOfRecord` | 2023-09-13 | „The specific nature of the data record." |
  | `eventDate` | `http://rs.tdwg.org/dwc/terms/eventDate` | 2026-05-26 | „A date-time or time interval during which a dwc:Event occurred." |
  | `recordedBy` | `http://rs.tdwg.org/dwc/terms/recordedBy` | 2026-05-26 | „A name for a dcterms:Agent responsible for recording a dwc:Occurrence." |
  | `identifiedBy` | `http://rs.tdwg.org/dwc/terms/identifiedBy` | 2026-05-26 | „A name for a dcterms:Agent responsible for making a dwc:Identification." |
  | `samplingProtocol` | `http://rs.tdwg.org/dwc/terms/samplingProtocol` | 2026-05-26 | „The names of, references to, or descriptions of the methods or protocols used during a dwc:Event." |
  | `samplingEffort` | `http://rs.tdwg.org/dwc/terms/samplingEffort` | 2023-06-28 | „The amount of effort expended during a dwc:Event." |
  | `individualCount` | `http://rs.tdwg.org/dwc/terms/individualCount` | 2023-06-28 | „The number of individuals present at the time of the dwc:Occurrence." |
  | `scientificName` | `http://rs.tdwg.org/dwc/terms/scientificName` | 2026-05-26 | „The full scientific name, with authorship and date information if known. When forming part of a dwc:Identification, this should be the name in lowest level taxonomic rank that can be determined." |
  | `coordinateUncertaintyInMeters` | `http://rs.tdwg.org/dwc/terms/coordinateUncertaintyInMeters` | 2026-05-26 | „A horizontal distance (in meters) from a given dwc:decimalLatitude and dwc:decimalLongitude describing the smallest circle containing the whole of the dcterms:Location. Zero is not a valid value for this term." |

- **Wörtlich** (die „Notes", soweit sie eine Regel tragen):
  `occurrenceID`: „In the absence of a persistent global unique identifier, construct one from a combination of identifiers in the record that will most closely make the dwc:occurrenceID globally unique."
  `basisOfRecord`: „Recommended best practice is to use a controlled vocabulary such as the set of local names of the identifiers for classes in Darwin Core."
  `eventDate`: „Recommended best practice is to use a date that conforms to ISO 8601-1:2019. Not suitable for a time in a geological context."
  `recordedBy` / `identifiedBy`: „Recommended best practice is to separate the values in a list with space vertical bar space ( | )."
  `identifiedBy` zusätzlich: „When used in the context of an eco:Survey, the subject consists of all of the dwc:Identifications related to the eco:Survey."
  `samplingProtocol`: „Recommended best practice is to describe a dwc:Event with no more than one sampling protocol. In the case of a summary Event with multiple protocols, in which a specific protocol can not be attributed to specific dwc:Occurrences, the recommended best practice is to separate the values in a list with space vertical bar space ( | )."
  `scientificName`: „This term should not contain identification qualifications, which should instead be supplied in the IdentificationQualifier term." · „Thus, use the multiplication sign × (Unicode U+00D7, HTML &times;) to identify a hybrid, not x or X, if possible."
  `coordinateUncertaintyInMeters`: „Leave the value empty if the uncertainty is unknown, cannot be estimated, or is not applicable (because there are no coordinates). Zero is not a valid value for this term."
  `samplingEffort` und `individualCount` haben **keine** Notes.
- **Wörtlich** (die Beispiele, weil sie die zulässige Schreibweise zeigen — nicht-normativ):
  `basisOfRecord`: „MaterialEntity", „PreservedSpecimen", „FossilSpecimen", „LivingSpecimen", „MaterialSample", „Event", „HumanObservation", „MachineObservation", „Taxon", „Occurrence", „MaterialCitation"
  `eventDate`: „1809-02-12 (within the day 12 February 1809)" · „1906-06 (in the month of June 1906)" · „1971 (in the year 1971)" · „2007-11-13/15 (some time in the interval between the beginning of 13 November 2007 and before 15 November 2007)" · „2009-02-20T08:40Z (20 February 2009 at or after 8:40am and before 8:41 UTC)"
  `recordedBy`: „José E. Crespo", „Oliver P. Pearson | Anita K. Pearson", „Megatherium Club", „The Natural History Society of Northumbria", „ROV SuBastian"
  `identifiedBy`: „James L. Patton", „Theodore Pappenfuss | Robert Macey", „MegaDetector V5"
  `samplingProtocol`: „UV light trap", „mist net", „bottom trawl", „ad hoc observation | point count", „Takats et al. 2001. Guidelines for Nocturnal Owl Monitoring in North America. Beaverhill Bird Observatory and Bird Studies Canada, Edmonton, Alberta. 32 pp., http://www.bsc-eoc.org/download/Owl.pdf"
  `samplingEffort`: „40 trap-nights", „10 observer-hours", „10 km by foot", „30 km by car"
  `individualCount`: „0", „1", „25"
  `scientificName`: „Coleoptera (order)", „Vespertilionidae (family)", „Manis (genus)", „Ctenomys sociabilis (genus + specificEpithet)", „Roptrocerus typographi (Györfi, 1952) (genus + specificEpithet + scientificNameAuthorship)"
  `coordinateUncertaintyInMeters`: „30 (reasonable lower limit on or after 2000-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time)" · „100 (reasonable lower limit before 2000-05-01 of a GPS reading under good conditions if the actual precision was not recorded at the time)" · „71 (uncertainty for a UTM coordinate having 100 meter precision and a known spatial reference system)"
- **Deckt in BIOME:**
  - **Der Satz „Artnachweise tragen immer Methode, Aufwand, Datum und Bestimmer" ist damit belegt** — und zwar als *vier getrennte Felder*: `samplingProtocol` (Methode), `samplingEffort` (Aufwand), `eventDate` (Datum), `identifiedBy` (Bestimmer). Zusätzlich `recordedBy` (Beobachter) — **Beobachter und Bestimmer sind zwei verschiedene Rollen** und dürfen in BIOME nicht in ein Feld fallen.
  - **`occurrenceID` ist Pflicht und muss global eindeutig sein.** Wenn BIOME keine persistente GUID hat, muss sie aus Bestandteilen des Datensatzes zusammengesetzt werden — das ist wörtlich die vorgeschriebene Ausweichlösung.
  - **`eventDate` erlaubt unvollständige Datumsangaben und Zeiträume** (Jahr, Monat, Intervall mit `/`). Ein BIOME-Datumsfeld, das ein volles Tagesdatum erzwingt, ist nicht Darwin-Core-konform und erzeugt Falschangaben.
  - **`individualCount` = 0 ist ein zulässiger Wert** (Beispielliste beginnt mit „0"). Null-Nachweise sind darstellbar — in Verbindung mit `occurrenceStatus` (DWC-02).
  - **`coordinateUncertaintyInMeters`: 0 ist verboten, leer ist erlaubt.** Ein BIOME-Formular darf keine 0 als Vorbelegung setzen. Einheit ist **Meter**, Bezug ist der Radius des kleinsten umschließenden Kreises.
  - **Mehrfachwerte** bei `recordedBy`, `identifiedBy`, `samplingProtocol` werden mit ` | ` (Leerzeichen-Pipe-Leerzeichen) getrennt. Das ist die einzige belegte Trennzeichenkonvention.
  - **`scientificName` enthält den Autor**, aber **keine** Bestimmungsvorbehalte („cf.", „aff.") — dafür gibt es `identificationQualifier` (DWC-02).
- **Deckt ausdrücklich nicht:**
  - Eine **kontrollierte Werteliste für `basisOfRecord`.** Die Notes sagen „Recommended best practice is to use a controlled vocabulary such as the set of local names of the identifiers for classes in Darwin Core" — das ist eine Empfehlung, keine abgeschlossene Liste. Eine harte Auswahlliste in BIOME ist erst über die GBIF-Enumeration belegt (GBIF-02).
  - Eine **Einheit oder ein Format für `samplingEffort`.** Der Term ist reiner Freitext („40 trap-nights", „10 observer-hours"). BIOME kann daraus **keine** rechenbare Kennzahl gewinnen, solange es kein eigenes, zusätzlich strukturiertes Feld führt.
  - Eine Definition von „Individuum" für `individualCount`. Was gezählt wird, ist methodenabhängig und hier nicht geregelt.

### DWC-02 · Pflicht-Begleitterme, ohne die die zehn Kernterme nicht interpretierbar sind
- **Herausgeber:** Darwin Core Maintenance Group (TDWG)
- **Quelle:** https://dwc.tdwg.org/terms/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Definition, jeweils vollständig):
  `occurrenceStatus`: „A statement about the detection or non-detection of a dwc:Organism during a dwc:Event." — Notes: „For dwc:Occurrences, the default vocabulary is recommended to consist of detected and notDetected, but can be extended by implementers with good justification." — Examples: „detected", „notDetected"
  `organismQuantity`: „A number or enumeration value for the quantity of dwc:Organisms." — Notes: „A dwc:organismQuantity must have a corresponding dwc:organismQuantityType."
  `organismQuantityType`: „The type of quantification system used for the quantity of dwc:Organisms." — Examples: „27 (organismQuantity) with individuals (organismQuantityType)" · „12.5 (organismQuantity) with % biomass (organismQuantityType)" · „r (organismQuantity) with Braun-Blanquet Scale (organismQuantityType)" · „many (organismQuantity) with individuals (organismQuantityType)"
  `sampleSizeValue`: „A numeric value for a measurement of the size (time duration, length, area, or volume) of a sample in a sampling dwc:Event." — Notes: „A dwc:sampleSizeValue must have a corresponding dwc:sampleSizeUnit." — Examples: „5 (sampleSizeValue) with metre (sampleSizeUnit)"
  `sampleSizeUnit`: „The unit of measurement of the size (time duration, length, area, or volume) of a sample in a sampling dwc:Event." — Examples: „minute", „hour", „day", „metre", „square metre", „cubic metre"
  `eventID`: „An identifier for the set of information associated with a dwc:Event (something that occurs at a place and time). May be a global unique identifier or an identifier specific to the data set."
  `dateIdentified`: „The date on which the subject was determined as representing the dwc:Taxon." — Notes: „Recommended best practice is to use a date that conforms to ISO 8601-1:2019."
  `identificationQualifier`: „A brief phrase or a standard term (\"cf.\", \"aff.\") to express the determiner's doubts about the dwc:Identification."
  `verbatimIdentification`: „A string representing the taxonomic identification as it appeared in the original record." — Notes: „This term is meant to allow the capture of an unaltered original identification/determination, including identification qualifiers, hybrid formulas, uncertainties, etc. This term is meant to be used in addition to dwc:scientificName (and dwc:identificationQualifier etc.), not instead of it."
  `identificationRemarks`: „Comments or notes about the dwc:Identification."
  `taxonRank`: „The taxonomic rank of the most specific name in the dwc:scientificName." — Examples: „subspecies", „varietas", „forma", „species", „genus", „nothogenus", „nothospecies", „nothosubspecies"
  `scientificNameAuthorship`: „The authorship information for the dwc:scientificName formatted according to the conventions of the applicable dwc:nomenclaturalCode."
  `decimalLatitude`: „A geographic latitude (in decimal degrees, using the spatial reference system given in dwc:geodeticDatum) of a dcterms:Location." — Notes: „Positive values are north of the Equator, negative values are south of it. Valid values lie between -90 and 90, inclusive."
  `decimalLongitude`: „A geographic longitude (in decimal degrees, using the spatial reference system given in dwc:geodeticDatum) of a dcterms:Location." — Notes: „Positive values are east of the Greenwich Meridian, negative values are west of it. Valid values lie between -180 and 180, inclusive."
  `geodeticDatum`: „The ellipsoid, geodetic datum, or spatial reference system (SRS) upon which the geographic coordinates given in dwc:decimalLatitude and dwc:decimalLongitude are based." — Notes: „Recommended best practice is to use the EPSG code of the SRS, if known. … If none of these is known, use the value not recorded." — Examples: „EPSG:4326", „WGS84", „NAD27", „not recorded"
  `coordinatePrecision`: „A decimal representation of the precision of the coordinates given in the dwc:decimalLatitude and dwc:decimalLongitude." — Examples: „0.00001 (normal GPS limit for decimal degrees)", „0.000278 (nearest second)", „0.01667 (nearest minute)", „1.0 (nearest degree)"
  `georeferenceProtocol`: „A description or reference to a dwc:Protocol used to determine a spatial footprint, coordinates, and uncertainties."
  `lifeStage`: „An age class or life stage of a dwc:Organism." — Examples: „zygote", „larva", „juvenile", „adult", „seedling", „flowering", „fruiting"
  `sex`: „A sex of a dwc:Organism." — Examples: „female", „male", „hermaphrodite"
  `vitality`: „An indication of whether a dwc:Organism was alive or dead at the time of collection or observation." — Examples: „alive", „dead", „mixedLot", „uncertain", „notAssessed"
- **Deckt in BIOME:**
  - **Nullnachweis:** `individualCount = 0` allein reicht nicht. Erst `occurrenceStatus` mit den empfohlenen Werten `detected` / `notDetected` macht ein Nicht-Auffinden auswertbar. BIOME braucht dieses Feld, sonst ist „nicht gefunden" nicht von „nicht gesucht" unterscheidbar.
  - **Aufwand rechenbar machen:** `samplingEffort` ist Freitext (DWC-01). Rechenbar wird der Aufwand erst über das Paar `sampleSizeValue` + `sampleSizeUnit`, das laut Definition **zwingend gemeinsam** auftreten muss. Belegte Einheiten: `minute`, `hour`, `day`, `metre`, `square metre`, `cubic metre`. BIOME sollte beide Felder führen: `samplingEffort` für die Beschreibung, `sampleSizeValue`/`sampleSizeUnit` für die Auswertung.
  - **Menge ≠ Individuenzahl:** `organismQuantity` + `organismQuantityType` (ebenfalls zwingend als Paar) erlauben nicht-numerische Angaben (`r` mit „Braun-Blanquet Scale", `many` mit „individuals"). `individualCount` bleibt der Zählwert.
  - **Bestimmungssicherheit:** `identificationQualifier` („cf.", „aff."), `verbatimIdentification` (Originalwortlaut der Bestimmung), `dateIdentified` (Bestimmungsdatum, **verschieden von** `eventDate`), `identificationRemarks`. Ein BIOME-Artnachweis ohne diese vier Felder kann eine unsichere Bestimmung nicht ehrlich abbilden.
  - **Lagebezug:** `decimalLatitude`/`decimalLongitude` sind **Dezimalgrad** mit belegten Wertebereichen (−90…90, −180…180) und benötigen zwingend `geodeticDatum`. Für BIOME: EPSG-Code speichern; wenn unbekannt, den belegten Wert `not recorded` — nicht leer, nicht raten.
  - **Zustand des Individuums:** `vitality` mit den fünf Beispielwerten deckt „Totfund" als eigene Ausprägung (`dead`) und erlaubt ausdrücklich `notAssessed`.
  - **Ereignisklammer:** `eventID` gruppiert mehrere Nachweise zu einer Begehung. Ohne `eventID` lässt sich der Aufwand einer Begehung nicht auf ihre Nachweise beziehen.
- **Deckt ausdrücklich nicht:**
  - Kontrollierte Vokabulare für `lifeStage`, `sex`, `vitality`, `organismQuantityType`. Überall steht nur „Recommended best practice is to use a controlled vocabulary" — **welches**, sagt Darwin Core nicht. Die aufgeführten Werte sind Beispiele, keine abgeschlossene Liste.
  - Eine Umrechnung zwischen `coordinateUncertaintyInMeters` und `coordinatePrecision`. Das sind zwei verschiedene Größen; die Quelle stellt keinen Zusammenhang her.

### GBIF-01 · Taxon-Auflösung — `GET /v1/species/match`, echte Antworten
- **Herausgeber:** GBIF Secretariat (Global Biodiversity Information Facility), Kopenhagen
- **Quelle:** `https://api.gbif.org/v1/species/match?name=<Name>` · `https://api.gbif.org/v1/species/<key>`
- **Abgerufen:** 2026-08-09 (jeweils HTTP 200, ohne Schlüssel, ohne Login)
- **Wörtlich** (`?name=Myotis%20myotis`, vollständige Antwort, unverändert):
  „{"usageKey":2432416,"scientificName":"Myotis myotis (Borkhausen, 1797)","canonicalName":"Myotis myotis","rank":"SPECIES","status":"ACCEPTED","confidence":99,"matchType":"EXACT","kingdom":"Animalia","phylum":"Chordata","order":"Chiroptera","family":"Vespertilionidae","genus":"Myotis","species":"Myotis myotis","kingdomKey":1,"phylumKey":44,"classKey":359,"orderKey":734,"familyKey":9368,"genusKey":2432384,"speciesKey":2432416,"class":"Mammalia"}"
- **Wörtlich** (`?name=Passer%20domesticus`, vollständige Antwort):
  „{"usageKey":5231190,"scientificName":"Passer domesticus (Linnaeus, 1758)","canonicalName":"Passer domesticus","rank":"SPECIES","status":"ACCEPTED","confidence":99,"matchType":"EXACT","kingdom":"Animalia","phylum":"Chordata","order":"Passeriformes","family":"Passeridae","genus":"Passer","species":"Passer domesticus","kingdomKey":1,"phylumKey":44,"classKey":212,"orderKey":729,"familyKey":5264,"genusKey":2492321,"speciesKey":5231190,"class":"Aves"}"
- **Wörtlich** (Tippfehler-Fall `?name=Nyctalus%20noctulla` — beachte das doppelte „l"):
  „{"usageKey":5218524,"scientificName":"Nyctalus noctula (Schreber, 1774)","canonicalName":"Nyctalus noctula","rank":"SPECIES","status":"ACCEPTED","confidence":96,"matchType":"FUZZY","kingdom":"Animalia",…,"family":"Vespertilionidae","genus":"Nyctalus","species":"Nyctalus noctula",…}"
- **Wörtlich** (Fehlschlag-Fall `?name=Xyzzy%20quuxus`, vollständige Antwort):
  „{"confidence":100,"matchType":"NONE","synonym":false}"
- **Wörtlich** (deutscher Trivialname `?name=Abendsegler`, vollständige Antwort):
  „{"confidence":100,"matchType":"NONE","synonym":false}"
- **Wörtlich** (`GET /v1/species/212`, Auszug — die Klasse Vögel):
  „"key": 212, "scientificName": "Aves", "canonicalName": "Aves", "rank": "CLASS", "taxonomicStatus": "ACCEPTED", "kingdom": "Animalia", "phylum": "Chordata", "class": "Aves", "datasetKey": "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c""
- **Deckt in BIOME:**
  - **Namensauflösung für Fauna** über denselben Endpunkt wie für Bäume (siehe `01-baeume.md`, BAUM-INT-14). Ein einziger Taxon-Dienst für alle Domänen ist damit belegt.
  - **Pflichtfelder je aufgelöstem Taxon:** `usageKey` (Primärschlüssel), `scientificName` **mit Autor**, `canonicalName` (ohne Autor), `rank`, `status`, plus die Hierarchie `kingdom`/`phylum`/`class`/`order`/`family`/`genus` mit den zugehörigen `*Key`-Feldern.
  - **Zwei Qualitätsfelder sind zwingend zu speichern:** `matchType` und `confidence`. Belegte `matchType`-Werte aus eigenen Abrufen: `EXACT`, `FUZZY`, `NONE`.
  - **`confidence` ist keine Trefferqualität.** Der Fehlschlag `matchType:"NONE"` kommt mit `"confidence":100`. Eine BIOME-Logik, die nur auf `confidence` filtert, akzeptiert Nicht-Treffer als sicher. **Es muss immer zuerst auf `matchType != "NONE"` geprüft werden.**
  - **Deutsche Namen lösen nicht auf.** `Abendsegler` liefert `NONE`. BIOME muss deutsche Artnamen aus einer eigenen, separat gepflegten Zuordnung ziehen — GBIF `species/match` leistet das nicht.
  - **Fledermaus-Klassenschlüssel für Filter:** `classKey` 359 = Mammalia, 212 = Aves; `orderKey` 734 = Chiroptera, 729 = Passeriformes.
- **Deckt ausdrücklich nicht:**
  - Eine Aussage darüber, ab welchem `confidence`-Wert ein `FUZZY`-Treffer übernommen werden darf. Der Tippfehlerfall lieferte 96 — das ist ein Datenpunkt, keine Schwelle.
  - Schutzstatus, Rote-Liste-Einstufung nach deutscher Methodik oder Gefährdung. Der Match-Endpunkt liefert davon nichts.
  - Unterarten- und Synonymbehandlung. `"synonym":false` taucht nur in der Fehlschlagantwort auf; ein echter Synonymfall wurde nicht geprüft.

### GBIF-02 · Occurrence-Suche — `GET /v1/occurrence/search`, echte Antwort und Enumerationen
- **Herausgeber:** GBIF Secretariat
- **Quelle:** `https://api.gbif.org/v1/occurrence/search` · `https://api.gbif.org/v1/enumeration/basic/<Name>`
- **Abgerufen:** 2026-08-09 (alle HTTP 200)
- **Wörtlich** (Antwortkopf zu `?taxonKey=2432416&country=DE&limit=1`):
  „"count": 3017" · „"endOfRecords": false"
- **Wörtlich** (erster Datensatz aus derselben Antwort, Felder unverändert, Auszug):
  „"key": 5959004804, "datasetKey": "6ac3f774-d9fb-4796-b3e9-92bf6c81c084", "basisOfRecord": "HUMAN_OBSERVATION", "occurrenceStatus": "PRESENT", "scientificName": "Myotis myotis (Borkhausen, 1797)", "acceptedScientificName": "Myotis myotis (Borkhausen, 1797)", "taxonKey": 2432416, "speciesKey": 2432416, "taxonRank": "SPECIES", "taxonomicStatus": "ACCEPTED", "iucnRedListCategory": "LC", "decimalLatitude": 50.552773, "decimalLongitude": 9.043379, "coordinateUncertaintyInMeters": 250.0, "geodeticDatum": "WGS84", "eventDate": "2026-01-08T00:00", "year": 2026, "month": 1, "day": 8, "recordedBy": "-513032729", "country": "Germany", "countryCode": "DE", "locality": "Winterquartier Fledermäuse I", "license": "http://creativecommons.org/licenses/by/4.0/legalcode", "institutionCode": "NABU|naturgucker", "collectionCode": "NABU|naturgucker", "catalogNumber": "-2008361299", "issues": ["COORDINATE_ROUNDED", "GEODETIC_DATUM_ASSUMED_WGS84", "CONTINENT_DERIVED_FROM_COORDINATES"], "protocol": "BIOCASE", "kingdom": "Animalia", "phylum": "Chordata", "class": "Mammalia", "order": "Chiroptera", "family": "Vespertilionidae", "genus": "Myotis", "species": "Myotis myotis""
- **Wörtlich** (räumliche Abfrage, Berliner Ausschnitt, `geometry=POLYGON((13.35 52.49,13.45 52.49,13.45 52.54,13.35 52.54,13.35 52.49))&taxonKey=212&limit=0`):
  „{"offset": 0, "limit": 0, "endOfRecords": false, "count": 82081}"
- **Wörtlich** (dieselbe Abfrage mit `facet=speciesKey&facetLimit=5`):
  „[{"field": "SPECIES_KEY", "counts": [{"name": "2482515", "count": 11646}, {"name": "5231190", "count": 4464}, {"name": "2490719", "count": 3965}, {"name": "2495455", "count": 3863}, {"name": "9705453", "count": 3256}]}]"
- **Wörtlich** (Enumerationen, jeweils vollständige Antwort):
  `GET /v1/enumeration/basic/BasisOfRecord` → „["PRESERVED_SPECIMEN","FOSSIL_SPECIMEN","LIVING_SPECIMEN","OBSERVATION","HUMAN_OBSERVATION","MACHINE_OBSERVATION","MATERIAL_SAMPLE","LITERATURE","MATERIAL_CITATION","OCCURRENCE","UNKNOWN"]"
  `GET /v1/enumeration/basic/OccurrenceStatus` → „["PRESENT","ABSENT"]"
  `GET /v1/enumeration/basic/TaxonomicStatus` → „["ACCEPTED","DOUBTFUL","SYNONYM","HETEROTYPIC_SYNONYM","HOMOTYPIC_SYNONYM","PROPARTE_SYNONYM","MISAPPLIED","AMBIGUOUS_SYNONYM","PROVISIONALLY_ACCEPTED"]"
  `GET /v1/enumeration/basic/Rank` → beginnt mit „DOMAIN","SUPERKINGDOM","KINGDOM",… und endet mit „…,"CULTIVAR","STRAIN","OTHER","UNRANKED"" (75 Werte, davon für BIOME relevant: „CLASS","ORDER","FAMILY","GENUS","SPECIES","SUBSPECIES","VARIETY","FORM")
- **Deckt in BIOME:**
  - **Abgeschlossene Werteliste für `basisOfRecord`** — 11 Werte, maschinenlesbar abrufbar. Das ist die belegbare Auswahlliste, die Darwin Core selbst nicht liefert (DWC-01). Achtung: GBIF schreibt `HUMAN_OBSERVATION` (Großbuchstaben, Unterstrich), Darwin Core `HumanObservation`. **BIOME muss festlegen, welche Schreibweise es speichert, und beim Export umsetzen.**
  - **Abgeschlossene Werteliste für `occurrenceStatus` in GBIF:** `PRESENT` / `ABSENT` — abweichend von der Darwin-Core-Empfehlung `detected` / `notDetected`. Auch hier ist eine Abbildung nötig.
  - **Räumliche Abfrage** über `geometry=POLYGON((lon lat, …))` in WGS84-Dezimalgrad, Ring geschlossen (erster = letzter Punkt), Reihenfolge **Längengrad zuerst**. `limit=0` liefert nur `count` — geeignet für schnelle Flächenzählungen in BIOME.
  - **Aggregation ohne Vollabzug** über `facet=speciesKey&facetLimit=n`. Antwortfeld heißt `SPECIES_KEY` (Großschreibung), die `name`-Werte sind **Strings**, nicht Zahlen.
  - **Datenqualitätsflags:** das Feld `issues` ist Teil jeder Antwort. Die im Beispiel real aufgetretenen Werte `COORDINATE_ROUNDED`, `GEODETIC_DATUM_ASSUMED_WGS84`, `CONTINENT_DERIVED_FROM_COORDINATES` zeigen, dass GBIF Koordinaten und Datum teils selbst ergänzt. **BIOME darf GBIF-Koordinaten nicht ungefiltert als Messwert übernehmen.**
  - **Lizenz steht am Einzeldatensatz**, nicht am Dienst (im Beispiel CC BY 4.0). BIOME muss `license` je Nachweis speichern.
  - **`recordedBy` kann anonymisiert sein.** Im Beispiel steht dort „-513032729" — eine Zahl, kein Name. Eine BIOME-Anzeige „Beobachter" darf diesen Wert nicht als Personennamen ausgeben.
- **Deckt ausdrücklich nicht:**
  - Vollständigkeit oder Repräsentativität. Die 82.081 Vogelnachweise im Berliner Testausschnitt sind Meldeaufkommen, keine Bestandsgröße. Aus GBIF-Trefferzahlen darf BIOME **keine** Häufigkeits- oder Bestandsaussage ableiten.
  - Deutschen Schutzstatus. Das Feld `iucnRedListCategory` („LC" im Beispiel) ist die **globale IUCN**-Einstufung und **nicht** die deutsche Rote-Liste-Kategorie (RL-01/RL-02). Verwechslung wäre ein sachlicher Fehler.
  - Eine offizielle Endpunktbeschreibung. Die Dokumentationsseiten unter `techdocs.gbif.org` liefern nur eine JavaScript-Hülle (siehe „Nicht zugänglich"). Alles oben Gedeckte stammt aus eigenen, protokollierten Abrufen.

### BNAT-01 · § 7 BNatSchG — besonders und streng geschützte Arten, Grundbegriffe
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz, Gesetz über Naturschutz und Landschaftspflege (Bundesnaturschutzgesetz – BNatSchG)
- **Quelle:** https://www.gesetze-im-internet.de/bnatschg_2009/__7.html
- **Abgerufen:** 2026-08-09 (HTTP 200, ISO-8859-1)
- **Wörtlich** (§ 7 Abs. 2 Nr. 13 und Nr. 14 — die tragenden Definitionen, vollständig):
  „13. besonders geschützte Arten a) Tier- und Pflanzenarten, die in Anhang A oder Anhang B der Verordnung (EG) Nr. 338/97 des Rates vom 9. Dezember 1996 über den Schutz von Exemplaren wildlebender Tier- und Pflanzenarten durch Überwachung des Handels … aufgeführt sind, b) nicht unter Buchstabe a fallende aa) Tier- und Pflanzenarten, die in Anhang IV der Richtlinie 92/43/EWG aufgeführt sind, bb) europäische Vogelarten, c) Tier- und Pflanzenarten, die in einer Rechtsverordnung nach § 54 Absatz 1 aufgeführt sind;"
  „14. streng geschützte Arten besonders geschützte Arten, die a) in Anhang A der Verordnung (EG) Nr. 338/97, b) in Anhang IV der Richtlinie 92/43/EWG, c) in einer Rechtsverordnung nach § 54 Absatz 2 aufgeführt sind;"
- **Wörtlich** (§ 7 Abs. 2, weitere Begriffe, jeweils vollständig):
  „3. Art jede Art, Unterart oder Teilpopulation einer Art oder Unterart; für die Bestimmung einer Art ist ihre wissenschaftliche Bezeichnung maßgebend;"
  „4. Biotop Lebensraum einer Lebensgemeinschaft wild lebender Tiere und Pflanzen;"
  „5. Lebensstätte regelmäßiger Aufenthaltsort der wild lebenden Individuen einer Art;"
  „6. Population eine biologisch oder geografisch abgegrenzte Zahl von Individuen einer Art;"
  „12. europäische Vogelarten in Europa natürlich vorkommende Vogelarten im Sinne des Artikels 1 der Richtlinie 2009/147/EG;"
  „10. Arten von gemeinschaftlichem Interesse die in Anhang II, IV oder V der Richtlinie 92/43/EWG aufgeführten Tier- und Pflanzenarten;"
  „11. prioritäre Arten die in Anhang II der Richtlinie 92/43/EWG mit dem Zeichen (*) gekennzeichneten Tier- und Pflanzenarten;"
  „1. Tiere a) wild lebende, gefangene oder gezüchtete und nicht herrenlos gewordene sowie tote Tiere wild lebender Arten, b) Eier, auch im leeren Zustand, sowie Larven, Puppen und sonstige Entwicklungsformen von Tieren wild lebender Arten, c) ohne Weiteres erkennbare Teile von Tieren wild lebender Arten und d) ohne Weiteres erkennbar aus Tieren wild lebender Arten gewonnene Erzeugnisse;"
- **Wörtlich** (§ 7 Abs. 4 — wer die Listen bekanntgibt):
  „Das Bundesministerium für Umwelt, Naturschutz und nukleare Sicherheit gibt die besonders geschützten und die streng geschützten Arten sowie den Zeitpunkt ihrer jeweiligen Unterschutzstellung bekannt."
- **Deckt in BIOME:**
  - **Feld `schutzstatus` mit genau zwei belegten Stufen:** `besonders geschützt` und `streng geschützt`. **Streng geschützt ist eine echte Teilmenge von besonders geschützt** („streng geschützte Arten = besonders geschützte Arten, die …"). Eine Oberfläche, die beide als sich ausschließende Optionen anbietet, ist falsch.
  - **Alle europäischen Vogelarten sind besonders geschützt** (Nr. 13 b bb). Für BIOME heißt das: jeder Brutvogelnachweis in Deutschland trägt mindestens den Status „besonders geschützt", ohne dass eine Artenliste konsultiert werden müsste.
  - **Feld `artbezug`:** der Schutz gilt für „Art, Unterart oder Teilpopulation"; maßgeblich ist der **wissenschaftliche** Name (Nr. 3). Damit ist der Anschluss an `scientificName` (DWC-01) und `usageKey` (GBIF-01) rechtlich abgesichert; ein deutscher Name genügt nicht.
  - **Feld `lebensstaette`** ist ein eigener, rechtlich definierter Objekttyp: „regelmäßiger Aufenthaltsort der wild lebenden Individuen einer Art". BIOME darf ihn nicht mit „Biotop" (Lebensraum einer Lebensgemeinschaft) gleichsetzen — das sind zwei verschiedene Begriffe desselben Paragrafen.
  - **Nachweisobjekte:** „Tiere" umfasst ausdrücklich tote Tiere, Eier (auch leer), Larven, Puppen und erkennbare Teile. Ein BIOME-Nachweistyp muss Totfunde und Entwicklungsformen abbilden können — das korrespondiert mit `vitality` und `lifeStage` (DWC-02).
- **Deckt ausdrücklich nicht:**
  - **Welche Art konkret welchen Status hat.** § 7 verweist nur auf Anhänge und Rechtsverordnungen. Die Zuordnung Art → Status ist erst über WISIA (BFN-01) operationalisierbar, und auch dort nicht rechtsverbindlich.
  - Die Bundesartenschutzverordnung (BArtSchV) selbst — sie wurde nicht abgerufen.
  - Regelungen der Länder. § 7 ist Bundesrecht; Landesrecht kann weiter gehen.

### BNAT-02 · § 44 BNatSchG — Zugriffsverbote
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz
- **Quelle:** https://www.gesetze-im-internet.de/bnatschg_2009/__44.html
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Überschrift und Absatz 1 vollständig):
  „§ 44 Vorschriften für besonders geschützte und bestimmte andere Tier- und Pflanzenarten"
  „(1) Es ist verboten,
  1. wild lebenden Tieren der besonders geschützten Arten nachzustellen, sie zu fangen, zu verletzen oder zu töten oder ihre Entwicklungsformen aus der Natur zu entnehmen, zu beschädigen oder zu zerstören,
  2. wild lebende Tiere der streng geschützten Arten und der europäischen Vogelarten während der Fortpflanzungs-, Aufzucht-, Mauser-, Überwinterungs- und Wanderungszeiten erheblich zu stören; eine erhebliche Störung liegt vor, wenn sich durch die Störung der Erhaltungszustand der lokalen Population einer Art verschlechtert,
  3. Fortpflanzungs- oder Ruhestätten der wild lebenden Tiere der besonders geschützten Arten aus der Natur zu entnehmen, zu beschädigen oder zu zerstören,
  4. wild lebende Pflanzen der besonders geschützten Arten oder ihre Entwicklungsformen aus der Natur zu entnehmen, sie oder ihre Standorte zu beschädigen oder zu zerstören
  (Zugriffsverbote)."
- **Wörtlich** (Absatz 5 Satz 1 und die drei Ausnahmetatbestände):
  „(5) Für nach § 15 Absatz 1 unvermeidbare Beeinträchtigungen durch Eingriffe in Natur und Landschaft, die nach § 17 Absatz 1 oder Absatz 3 zugelassen oder von einer Behörde durchgeführt werden, sowie für Vorhaben im Sinne des § 18 Absatz 2 Satz 1 gelten die Zugriffs-, Besitz- und Vermarktungsverbote nach Maßgabe der Sätze 2 bis 5."
  „1. das Tötungs- und Verletzungsverbot nach Absatz 1 Nummer 1 nicht vor, wenn die Beeinträchtigung durch den Eingriff oder das Vorhaben das Tötungs- und Verletzungsrisiko für Exemplare der betroffenen Arten nicht signifikant erhöht und diese Beeinträchtigung bei Anwendung der gebotenen, fachlich anerkannten Schutzmaßnahmen nicht vermieden werden kann,"
  „3. das Verbot nach Absatz 1 Nummer 3 nicht vor, wenn die ökologische Funktion der von dem Eingriff oder Vorhaben betroffenen Fortpflanzungs- und Ruhestätten im räumlichen Zusammenhang weiterhin erfüllt wird."
  „Soweit erforderlich, können auch vorgezogene Ausgleichsmaßnahmen festgelegt werden."
- **Wörtlich** (Absatz 6 — Untersuchungsprivileg und Meldepflicht):
  „(6) Die Zugriffs- und Besitzverbote gelten nicht für Handlungen zur Vorbereitung gesetzlich vorgeschriebener Prüfungen, die von fachkundigen Personen unter größtmöglicher Schonung der untersuchten Exemplare und der übrigen Tier- und Pflanzenwelt im notwendigen Umfang vorgenommen werden. Die Anzahl der verletzten oder getöteten Exemplare von europäischen Vogelarten und Arten der in Anhang IV Buchstabe a der Richtlinie 92/43/EWG aufgeführten Tierarten ist von der fachkundigen Person der für Naturschutz und Landschaftspflege zuständigen Behörde jährlich mitzuteilen."
- **Deckt in BIOME:**
  - **Vier und nur vier Zugriffsverbote**, als abgeschlossene Liste `zugriffsverbot` = {Nr. 1 Tötung/Verletzung/Entnahme, Nr. 2 erhebliche Störung, Nr. 3 Fortpflanzungs-/Ruhestätten, Nr. 4 Pflanzen}. Der Klammerzusatz „(Zugriffsverbote)" steht wörtlich im Gesetz und rechtfertigt diesen Feldnamen.
  - **Das Störungsverbot (Nr. 2) hat einen engeren Adressatenkreis als die übrigen:** nur **streng** geschützte Arten und europäische Vogelarten. Nr. 1, 3, 4 gelten für alle **besonders** geschützten Arten. BIOME darf das nicht vereinheitlichen.
  - **Feld `stoerungszeit` mit fünf wörtlich benannten Zeitfenstern:** Fortpflanzungs-, Aufzucht-, Mauser-, Überwinterungs- und Wanderungszeiten. Das sind die einzigen belegten Kategorien.
  - **Erheblichkeitsschwelle ist definiert und rein populationsbezogen:** „eine erhebliche Störung liegt vor, wenn sich durch die Störung der Erhaltungszustand der lokalen Population einer Art verschlechtert". Eine BIOME-Ampel „Störung ja/nein" ohne Bezug auf die lokale Population ist nicht gedeckt.
  - **Objekt `fortpflanzungs_oder_ruhestaette`** ist als eigenes Schutzobjekt belegt — das ist der rechtliche Anschluss für Baumhöhlen, Nester und Quartiere (TREM-01/TREM-02).
  - **Feld `cef_massnahme`** („vorgezogene Ausgleichsmaßnahmen") und **`funktionserhalt_raeumlicher_zusammenhang`** sind wörtlich belegte Prüfkriterien für Eingriffsfälle.
  - **Feld `signifikante_risikoerhoehung`** als Prüfschritt beim Tötungsverbot.
  - **Jahresmeldepflicht** über verletzte/getötete Exemplare europäischer Vogelarten und Anhang-IV-a-Arten bei Prüfungen — eine harte Anforderung an ein BIOME-Protokoll, wenn dort Untersuchungen dokumentiert werden.
- **Deckt ausdrücklich nicht:**
  - Ausnahmen und Befreiungen nach § 45 und § 67 — nicht abgerufen.
  - Eine Definition von „lokale Population", „Erhaltungszustand" im Sinne des Absatzes oder „fachlich anerkannte Schutzmaßnahmen". Alle drei sind unbestimmte Rechtsbegriffe und in § 44 nicht definiert.
  - Fristen oder Formvorgaben für die Jahresmeldung nach Absatz 6.

### BNAT-03 · § 39 Abs. 5 BNatSchG — Gehölzschnittverbot 1. März bis 30. September
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz
- **Quelle:** https://www.gesetze-im-internet.de/bnatschg_2009/__39.html
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Überschrift und Absatz 5 vollständig, einschließlich aller Ausnahmen):
  „§ 39 Allgemeiner Schutz wild lebender Tiere und Pflanzen; Ermächtigung zum Erlass von Rechtsverordnungen"
  „(5) Es ist verboten,
  1. die Bodendecke auf Wiesen, Feldrainen, Hochrainen und ungenutzten Grundflächen sowie an Hecken und Hängen abzubrennen oder nicht land-, forst- oder fischereiwirtschaftlich genutzte Flächen so zu behandeln, dass die Tier- oder Pflanzenwelt erheblich beeinträchtigt wird,
  2. Bäume, die außerhalb des Waldes, von Kurzumtriebsplantagen oder gärtnerisch genutzten Grundflächen stehen, Hecken, lebende Zäune, Gebüsche und andere Gehölze in der Zeit vom 1. März bis zum 30. September abzuschneiden, auf den Stock zu setzen oder zu beseitigen; zulässig sind schonende Form- und Pflegeschnitte zur Beseitigung des Zuwachses der Pflanzen oder zur Gesunderhaltung von Bäumen,
  3. Röhrichte in der Zeit vom 1. März bis zum 30. September zurückzuschneiden; außerhalb dieser Zeiten dürfen Röhrichte nur in Abschnitten zurückgeschnitten werden,
  4. ständig wasserführende Gräben unter Einsatz von Grabenfräsen zu räumen, wenn dadurch der Naturhaushalt, insbesondere die Tierwelt erheblich beeinträchtigt wird.
  Die Verbote des Satzes 1 Nummer 1 bis 3 gelten nicht für
  1. behördlich angeordnete Maßnahmen,
  2. Maßnahmen, die im öffentlichen Interesse nicht auf andere Weise oder zu anderer Zeit durchgeführt werden können, wenn sie a) behördlich durchgeführt werden, b) behördlich zugelassen sind oder c) der Gewährleistung der Verkehrssicherheit dienen,
  3. nach § 15 zulässige Eingriffe in Natur und Landschaft,
  4. zulässige Bauvorhaben, wenn nur geringfügiger Gehölzbewuchs zur Verwirklichung der Baumaßnahmen beseitigt werden muss.
  Die Landesregierungen werden ermächtigt, durch Rechtsverordnung bei den Verboten des Satzes 1 Nummer 2 und 3 für den Bereich eines Landes oder für Teile des Landes erweiterte Verbotszeiträume vorzusehen und den Verbotszeitraum aus klimatischen Gründen um bis zu zwei Wochen zu verschieben. Sie können die Ermächtigung nach Satz 3 durch Rechtsverordnung auf andere Landesbehörden übertragen."
- **Wörtlich** (Absatz 6 — Winterquartiere von Fledermäusen):
  „(6) Es ist verboten, Höhlen, Stollen, Erdkeller oder ähnliche Räume, die als Winterquartier von Fledermäusen dienen, in der Zeit vom 1. Oktober bis zum 31. März aufzusuchen; dies gilt nicht zur Durchführung unaufschiebbarer und nur geringfügig störender Handlungen sowie für touristisch erschlossene oder stark genutzte Bereiche."
- **Wörtlich** (Absatz 1 — allgemeiner Schutz, weil er den Rahmen setzt):
  „(1) Es ist verboten, 1. wild lebende Tiere mutwillig zu beunruhigen oder ohne vernünftigen Grund zu fangen, zu verletzen oder zu töten, 2. wild lebende Pflanzen ohne vernünftigen Grund von ihrem Standort zu entnehmen oder zu nutzen oder ihre Bestände niederzuschlagen oder auf sonstige Weise zu verwüsten, 3. Lebensstätten wild lebender Tiere und Pflanzen ohne vernünftigen Grund zu beeinträchtigen oder zu zerstören."
- **Wörtlich** (Absatz 4a — was ein „vernünftiger Grund" jedenfalls ist):
  „(4a) Ein vernünftiger Grund nach Absatz 1 liegt insbesondere vor, wenn wissenschaftliche oder naturkundliche Untersuchungen an Tieren oder Pflanzen sowie diesbezügliche Maßnahmen der Umweltbildung im zur Erreichung des Untersuchungsziels oder Bildungszwecks notwendigen Umfang vorgenommen werden. Vorschriften des Tierschutzrechts bleiben unberührt."
- **Deckt in BIOME:**
  - **Der Sperrzeitraum lautet wörtlich „in der Zeit vom 1. März bis zum 30. September".** Beide Tage sind eingeschlossen. BIOME darf als Sperrzeitraum genau `03-01` bis `09-30` hinterlegen und **muss** ihn so beschriften — nicht „März bis September", nicht „Vegetationsperiode".
  - **Sachlicher Anwendungsbereich, wörtlich abgegrenzt:** Bäume **außerhalb** des Waldes, außerhalb von Kurzumtriebsplantagen und außerhalb gärtnerisch genutzter Grundflächen; dazu Hecken, lebende Zäune, Gebüsche und andere Gehölze. **Bäume in Gärten und im Wald fallen nicht unter das Verbot.** Ein BIOME-Feld `flaechenkategorie` mit genau diesen Ausprägungen ist damit belegt und entscheidet, ob die Sperrfrist überhaupt greift.
  - **Verbotene Handlungen, abgeschlossen:** `abschneiden`, `auf den Stock setzen`, `beseitigen`. Zulässig bleiben: `schonender Formschnitt`, `Pflegeschnitt zur Beseitigung des Zuwachses`, `Schnitt zur Gesunderhaltung von Bäumen`. Das ist die einzige belegte Maßnahmen-Zweiteilung; BIOME darf eine Maßnahme nur dann als „ganzjährig zulässig" kennzeichnen, wenn sie unter einen dieser drei Begriffe fällt.
  - **Vier Ausnahmetatbestände** als Werteliste `sperrfrist_ausnahme`: `behördlich angeordnet`, `öffentliches Interesse (behördlich durchgeführt / behördlich zugelassen / Verkehrssicherheit)`, `nach § 15 zulässiger Eingriff`, `zulässiges Bauvorhaben bei geringfügigem Gehölzbewuchs`. **Verkehrssicherheit ist ausdrücklich nur ein Unterfall der zweiten Ausnahme** und setzt voraus, dass die Maßnahme „im öffentlichen Interesse nicht auf andere Weise oder zu anderer Zeit durchgeführt werden" kann. Eine BIOME-Logik, die Verkehrssicherheit pauschal als Freibrief behandelt, ist nicht gedeckt.
  - **Landesrecht kann den Zeitraum erweitern oder um bis zu zwei Wochen verschieben.** BIOME muss den Sperrzeitraum daher **landesspezifisch konfigurierbar** halten und darf ihn nicht hart als 01.03.–30.09. verdrahten.
  - **Zweiter Sperrzeitraum für Fledermausquartiere: 1. Oktober bis 31. März**, Betretungsverbot für Höhlen, Stollen, Erdkeller und ähnliche Räume. Das ist ein eigenes Feld, kein Sonderfall des Gehölzschnitts.
  - **Feld `vernuenftiger_grund`:** wissenschaftliche/naturkundliche Untersuchungen und Umweltbildung sind wörtlich als vernünftiger Grund benannt — der Rechtsgrund dafür, dass BIOME-Kartierungen selbst zulässig sind.
- **Deckt ausdrücklich nicht:**
  - Eine Definition von „schonend", „geringfügiger Gehölzbewuchs", „Zuwachs" oder „Gesunderhaltung". Alle vier sind unbestimmt.
  - Den in Berlin (oder einem anderen Land) tatsächlich geltenden Zeitraum. Ob und wie Berlin von der Verordnungsermächtigung Gebrauch gemacht hat, wurde **nicht** geprüft — siehe „Offene Fragen".
  - Baumschutzsatzungen der Länder und Kommunen. Diese gelten daneben und sind strenger (für Berlin siehe `01-baeume.md`, BAUM-BE-06).

### BNAT-04 · §§ 13–15 BNatSchG — Eingriffsregelung
- **Herausgeber:** Bundesministerium der Justiz / Bundesamt für Justiz
- **Quelle:** https://www.gesetze-im-internet.de/bnatschg_2009/__13.html · /__14.html · /__15.html
- **Abgerufen:** 2026-08-09 (jeweils HTTP 200)
- **Wörtlich** (§ 13, vollständig):
  „§ 13 Allgemeiner Grundsatz — Erhebliche Beeinträchtigungen von Natur und Landschaft sind vom Verursacher vorrangig zu vermeiden. Nicht vermeidbare erhebliche Beeinträchtigungen sind durch Ausgleichs- oder Ersatzmaßnahmen oder, soweit dies nicht möglich ist, durch einen Ersatz in Geld zu kompensieren."
- **Wörtlich** (§ 14 Abs. 1 und Abs. 2):
  „(1) Eingriffe in Natur und Landschaft im Sinne dieses Gesetzes sind Veränderungen der Gestalt oder Nutzung von Grundflächen oder Veränderungen des mit der belebten Bodenschicht in Verbindung stehenden Grundwasserspiegels, die die Leistungs- und Funktionsfähigkeit des Naturhaushalts oder das Landschaftsbild erheblich beeinträchtigen können."
  „(2) Die land-, forst- und fischereiwirtschaftliche Bodennutzung ist nicht als Eingriff anzusehen, soweit dabei die Ziele des Naturschutzes und der Landschaftspflege berücksichtigt werden."
- **Wörtlich** (§ 15 Abs. 1 bis 6, die tragenden Sätze):
  „(1) Der Verursacher eines Eingriffs ist verpflichtet, vermeidbare Beeinträchtigungen von Natur und Landschaft zu unterlassen. Beeinträchtigungen sind vermeidbar, wenn zumutbare Alternativen, den mit dem Eingriff verfolgten Zweck am gleichen Ort ohne oder mit geringeren Beeinträchtigungen von Natur und Landschaft zu erreichen, gegeben sind. Soweit Beeinträchtigungen nicht vermieden werden können, ist dies zu begründen."
  „(2) Der Verursacher ist verpflichtet, unvermeidbare Beeinträchtigungen durch Maßnahmen des Naturschutzes und der Landschaftspflege auszugleichen (Ausgleichsmaßnahmen) oder zu ersetzen (Ersatzmaßnahmen). Ausgeglichen ist eine Beeinträchtigung, wenn und sobald die beeinträchtigten Funktionen des Naturhaushalts in gleichartiger Weise wiederhergestellt sind und das Landschaftsbild landschaftsgerecht wiederhergestellt oder neu gestaltet ist. Ersetzt ist eine Beeinträchtigung, wenn und sobald die beeinträchtigten Funktionen des Naturhaushalts in dem betroffenen Naturraum in gleichwertiger Weise hergestellt sind und das Landschaftsbild landschaftsgerecht neu gestaltet ist."
  „(3) … Es ist vorrangig zu prüfen, ob der Ausgleich oder Ersatz auch durch Maßnahmen zur Entsiegelung, durch Maßnahmen zur Wiedervernetzung von Lebensräumen oder durch Bewirtschaftungs- oder Pflegemaßnahmen, die der dauerhaften Aufwertung des Naturhaushalts oder des Landschaftsbildes dienen, erbracht werden kann, um möglichst zu vermeiden, dass Flächen aus der Nutzung genommen werden."
  „(4) Ausgleichs- und Ersatzmaßnahmen sind in dem jeweils erforderlichen Zeitraum zu unterhalten und rechtlich zu sichern. Der Unterhaltungszeitraum ist durch die zuständige Behörde im Zulassungsbescheid festzusetzen. Verantwortlich für Ausführung, Unterhaltung und Sicherung der Ausgleichs- und Ersatzmaßnahmen ist der Verursacher oder dessen Rechtsnachfolger."
  „(5) Ein Eingriff darf nicht zugelassen oder durchgeführt werden, wenn die Beeinträchtigungen nicht zu vermeiden oder nicht in angemessener Frist auszugleichen oder zu ersetzen sind und die Belange des Naturschutzes und der Landschaftspflege bei der Abwägung aller Anforderungen an Natur und Landschaft anderen Belangen im Range vorgehen."
  „(6) Wird ein Eingriff nach Absatz 5 zugelassen oder durchgeführt, obwohl die Beeinträchtigungen nicht zu vermeiden oder nicht in angemessener Frist auszugleichen oder zu ersetzen sind, hat der Verursacher Ersatz in Geld zu leisten. Die Ersatzzahlung bemisst sich nach den durchschnittlichen Kosten der nicht durchführbaren Ausgleichs- und Ersatzmaßnahmen einschließlich der erforderlichen durchschnittlichen Kosten für deren Planung und Unterhaltung sowie die Flächenbereitstellung unter Einbeziehung der Personal- und sonstigen Verwaltungskosten. … Die Zahlung ist vor der Durchführung des Eingriffs zu leisten. … Die Ersatzzahlung ist zweckgebunden für Maßnahmen des Naturschutzes und der Landschaftspflege möglichst in dem betroffenen Naturraum zu verwenden, für die nicht bereits nach anderen Vorschriften eine rechtliche Verpflichtung besteht."
- **Deckt in BIOME:**
  - **Vierstufige Kaskade als Pflichtreihenfolge**, wörtlich belegt: `vermeiden` → `ausgleichen` → `ersetzen` → `Ersatz in Geld`. Ein BIOME-Workflow darf keine Stufe überspringen und muss die Reihenfolge erzwingen.
  - **Ausgleich und Ersatz sind zwei rechtlich unterschiedene Maßnahmentypen** mit exakt benannten Erfolgskriterien: Ausgleich = „in gleichartiger Weise wiederhergestellt"; Ersatz = „in dem betroffenen Naturraum in gleichwertiger Weise hergestellt". `gleichartig` vs. `gleichwertig` und der Raumbezug `am selben Ort` vs. `im betroffenen Naturraum` sind die belegten Unterscheidungsmerkmale. BIOME darf beide nicht als „Kompensation" zusammenfassen.
  - **Feld `eingriff_ja_nein`** mit der belegten Definition aus § 14 Abs. 1: Veränderung von Gestalt **oder** Nutzung von Grundflächen **oder** des Grundwasserspiegels, **und** erhebliche Beeinträchtigung von Naturhaushalt **oder** Landschaftsbild „können". Es genügt die Möglichkeit; ein Nachweis der eingetretenen Beeinträchtigung wird nicht verlangt.
  - **Feld `landwirtschaftsprivileg`** — land-, forst- und fischereiwirtschaftliche Bodennutzung ist unter der genannten Bedingung kein Eingriff.
  - **Feld `vermeidungsbegruendung` ist Pflicht**, sobald eine Beeinträchtigung nicht vermieden wird („Soweit Beeinträchtigungen nicht vermieden werden können, ist dies zu begründen").
  - **Feld `unterhaltungszeitraum`** je Kompensationsmaßnahme, festgesetzt im Zulassungsbescheid, plus **`verantwortlicher`** (Verursacher oder Rechtsnachfolger) und **`rechtliche_sicherung`**. Das sind drei wörtlich belegte Pflichtangaben, die eine Maßnahmenverwaltung in BIOME führen muss.
  - **Vorrangprüfung nach Abs. 3** als eigener Prüfschritt mit drei belegten Maßnahmenarten: `Entsiegelung`, `Wiedervernetzung von Lebensräumen`, `Bewirtschaftungs- oder Pflegemaßnahmen zur dauerhaften Aufwertung`.
  - **Zahlungszeitpunkt** der Ersatzzahlung: vor Durchführung des Eingriffs; Zweckbindung „möglichst in dem betroffenen Naturraum".
- **Deckt ausdrücklich nicht:**
  - **Jedes Bewertungsverfahren, jede Biotopwertliste, jeden Punktwert.** §§ 13–15 nennen keine Zahlen. Eine BIOME-Kompensationsrechnung in Werteinheiten ist über diese Quelle **nicht** belegt; § 15 Abs. 7 verweist ausdrücklich auf eine Rechtsverordnung bzw. auf Landesrecht.
  - Die Bundeskompensationsverordnung — nicht abgerufen; § 15 Abs. 7 Satz 2 stellt selbst fest, dass ohne sie Landesrecht gilt.
  - Eine Definition von „erheblich", „angemessene Frist", „zumutbare Alternative" oder „Naturraum".
  - Das Verhältnis zum Artenschutzrecht im Detail; § 44 Abs. 5 (BNAT-02) regelt nur den Ausschnitt für zugelassene Eingriffe.

### EU-01 · FFH-Richtlinie 92/43/EWG — Anhänge II und IV, Anhangsdefinition wörtlich
- **Herausgeber:** Rat der Europäischen Gemeinschaften; Fassung: „Konsolidierter TEXT: 31992L0043 — DE — 01.07.2013", Kennung „01992L0043 — DE — 006.006"; veröffentlicht auf EUR-Lex
- **Quelle:** https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:01992L0043-20130701 (konsolidiert) · https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:31992L0043&from=DE (Originalfassung)
- **Abgerufen:** 2026-08-09 (HTTP 200 / HTTP 200; erster Versuch auf die konsolidierte Fassung ergab HTTP 202 mit leerem Body, der zweite HTTP 200)
- **Wörtlich** (Warnhinweis von EUR-Lex im Kopf der konsolidierten Fassung — für BIOME relevant, weil er die Verbindlichkeit begrenzt):
  „Dieser Text dient lediglich zu Informationszwecken und hat keine Rechtswirkung. Die EU-Organe übernehmen keine Haftung für seinen Inhalt. Verbindliche Fassungen der betreffenden Rechtsakte einschließlich ihrer Präambeln sind nur die im Amtsblatt der Europäischen Union veröffentlichten und auf EUR-Lex verfügbaren Texte."
  „RICHTLINIE 92/43/EWG DES RATES vom 21. Mai 1992 zur Erhaltung der natürlichen Lebensräume sowie der wildlebenden Tiere und Pflanzen (ABl. L 206 vom 22.7.1992, S. 7)"
- **Wörtlich** (Anhang II — Titel und Auslegungsregeln, vollständig):
  „ANHANG II — TIER- UND PFLANZENARTEN VON GEMEINSCHAFTLICHEM INTERESSE, FÜR DEREN ERHALTUNG BESONDERE SCHUTZGEBIETE AUSGEWIESEN WERDEN MÜSSEN"
  „Auslegung
  a) Anhang II ist eine Ergänzung des Anhangs I zur Verwirklichung eines zusammenhängenden Netzes von besonderen Schutzgebieten.
  b) Die in diesem Anhang aufgeführten Arten sind angegeben — mit dem Namen der Art oder der Unterart oder — mit allen Arten, die zu einem höheren Taxon oder einem bestimmten Teil dieses Taxons gehören. Durch die hinter der Bezeichnung einer Familie oder einer Gattung stehende Abkürzung „spp." werden alle Arten bezeichnet, die dieser Familie oder dieser Gattung angehören.
  c) Zeichen — Ein vor der Artenbezeichnung stehendes „*" bedeutet, dass diese Art eine prioritäre Art ist. Die meisten in diesem Anhang aufgeführten Arten sind auch in Anhang IV genannt. Ist eine in diesem Anhang aufgeführte Art weder in Anhang IV noch in Anhang V aufgeführt, so wird ihr Name von dem Zeichen „(o)" gefolgt; ist eine in diesem Anhang aufgeführte Art nicht in Anhang IV, jedoch in Anhang V genannt, so wird ihr Name von dem Zeichen „(V)" gefolgt."
- **Wörtlich** (Anhang IV — Titel und Auslegungsregeln, vollständig):
  „ANHANG IV — STRENG ZU SCHÜTZENDE TIER- UND PFLANZENARTEN VON GEMEINSCHAFTLICHEM INTERESSE"
  „Die in diesem Anhang aufgeführten Arten sind angegeben: — mit dem Namen der Art oder der Unterart oder — mit allen Arten, die zu einem höheren Taxon oder einem bestimmten Teil dieses Taxons gehören. Durch die hinter der Bezeichnung einer Familie oder einer Gattung stehende Abkürzung „spp." werden alle Arten bezeichnet, die dieser Familie oder dieser Gattung angehören."
- **Wörtlich** (Anhang IV Buchstabe a, Beginn der Wirbeltiere — zeigt die für BIOME wichtigste Sammelangabe):
  „a) TIERE — WIRBELTIERE — SÄUGETIERE — INSECTIVORA — Erinaceidae — Erinaceus algirus — Soricidae — Crocidura canariensis — Crocidura sicula — Talpidae — Galemys pyrenaicus — MICROCHIROPTERA — Alle Arten — MEGACHIROPTERA — Pteropodidae — Rousettus aegyptiacus — RODENTIA — Gliridae — Alle Arten außer Glis glis und Eliomys quercinus"
- **Wörtlich** (Anhang II Buchstabe a, Fledermäuse — zum Vergleich):
  „CHIROPTERA — Rhinolophidae — Rhinolophus blasii — Rhinolophus euryale — Rhinolophus ferrumequinum — Rhinolophus hipposideros — Rhinolophus mehelyi — Vespertilionidae — Barbastella barbastellus — Miniopterus schreibersii — Myotis bechsteinii — Myotis blythii — Myotis capaccinii — Myotis dasycneme — Myotis emarginatus — Myotis myotis"
- **Wörtlich** (Artikel 1 Buchstaben g, h, i — die Begriffe hinter den Anhängen):
  „g) „Arten von gemeinschaftlichem Interesse": Arten, die in dem in Artikel 2 bezeichneten Gebiet i) bedroht sind, außer denjenigen, deren natürliche Verbreitung sich nur auf Randzonen des vorgenannten Gebietes erstreckt und die weder bedroht noch im Gebiet der westlichen Paläarktis potentiell bedroht sind, oder ii) potentiell bedroht sind, d. h., deren baldiger Übergang in die Kategorie der bedrohten Arten als wahrscheinlich betrachtet wird, falls die ursächlichen Faktoren der Bedrohung fortdauern, oder iii) selten sind, d. h., deren Populationen klein und, wenn nicht unmittelbar, so doch mittelbar bedroht oder potentiell bedroht sind. … oder iv) endemisch sind und infolge der besonderen Merkmale ihres Habitats und/oder der potentiellen Auswirkungen ihrer Nutzung auf ihren Erhaltungszustand besondere Beachtung erfordern. Diese Arten sind in Anhang II und/oder Anhang IV oder Anhang V aufgeführt bzw. können dort aufgeführt werden."
  „h) „Prioritäre Arten": die unter Buchstabe g) Ziffer i) genannten Arten, für deren Erhaltung der Gemeinschaft aufgrund ihrer natürlichen Ausdehnung im Verhältnis zu dem in Artikel 2 genannten Gebiet besondere Verantwortung zukommt; diese prioritären Arten sind in Anhang II mit einem Sternchen (*) gekennzeichnet."
  „i) „Erhaltungszustand einer Art": die Gesamtheit der Einflüsse, die sich langfristig auf die Verbreitung und die Größe der Populationen der betreffenden Arten in dem in Artikel 2 bezeichneten Gebiet auswirken können. Der Erhaltungszustand wird als „günstig" betrachtet, wenn — aufgrund der Daten über die Populationsdynamik der Art anzunehmen ist, daß diese Art ein lebensfähiges Element des natürlichen Lebensraumes, dem sie angehört, bildet und langfristig weiterhin bilden wird, und — das natürliche Verbreitungsgebiet dieser Art weder abnimmt noch in absehbarer Zeit vermutlich abnehmen wird und — ein genügend großer Lebensraum vorhanden ist und wahrscheinlich weiterhin vorhanden sein wird, um langfristig ein Überleben der Populationen dieser Art zu sichern."
  „f) „Habitat einer Art": durch spezifische abiotische und biotische Faktoren bestimmter Lebensraum, in dem diese Art in einem der Stadien ihres Lebenskreislaufs vorkommt."
- **Wörtlich** (Artikel 12 Abs. 1 — das strenge Schutzsystem für Anhang IV a):
  „(1) Die Mitgliedstaaten treffen die notwendigen Maßnahmen, um ein strenges Schutzsystem für die in Anhang IV Buchstabe a) genannten Tierarten in deren natürlichen Verbreitungsgebieten einzuführen; dieses verbietet: a) alle absichtlichen Formen des Fangs oder der Tötung von aus der Natur entnommenen Exemplaren dieser Arten; b) jede absichtliche Störung dieser Arten, insbesondere während der Fortpflanzungs-, Aufzucht-, Überwinterungs- und Wanderungszeiten; c) jede absichtliche Zerstörung oder Entnahme von Eiern aus der Natur; d) jede Beschädigung oder Vernichtung der Fortpflanzungs- oder Ruhestätten."
  „(3) Die Verbote nach Absatz 1 Buchstaben a) und b) sowie nach Absatz 2 gelten für alle Lebensstadien der Tiere im Sinne dieses Artikels."
- **Deckt in BIOME:**
  - **Feld `ffh_anhang`** mit den belegten Ausprägungen `II`, `IV`, `V` — und der wörtlich belegten Bedeutung: Anhang II = Gebietsschutz („besondere Schutzgebiete ausgewiesen werden müssen"), Anhang IV = Artenschutz („streng zu schützende … Arten"). Beide Anhänge sind **nicht** deckungsgleich; eine Art kann in einem, beiden oder keinem stehen.
  - **Feld `prioritaere_art` (Boolean)** — belegt durch das Sternchen-Zeichen in Anhang II und Artikel 1 h.
  - **Die Zeichen `(o)` und `(V)` in Anhang II sind bedeutungstragend** und müssen beim Import erhalten bleiben: `(o)` = weder in IV noch in V, `(V)` = nicht in IV, aber in V.
  - **Sammelangaben sind zulässig und müssen aufgelöst werden:** „spp." hinter Familie/Gattung, „Alle Arten", „Alle Arten außer …". **Alle Microchiroptera — also alle heimischen Fledermausarten — stehen in Anhang IV a und sind damit über § 7 Abs. 2 Nr. 14 BNatSchG streng geschützt.** Ein BIOME-Import, der Anhang IV als flache Artenliste behandelt, verliert genau diese Fälle.
  - **`erhaltungszustand_art`** mit der belegten Ausprägung `günstig` und den drei wörtlich benannten Bedingungen (Populationsdynamik, Verbreitungsgebiet, Lebensraumgröße). Die Bedingungen sind kumulativ („und").
  - **Vier Verbotstatbestände des Artikel 12** und ihr Verhältnis zu § 44 BNatSchG (BNAT-02): Artikel 12 verlangt **Absichtlichkeit** bei Fang/Tötung, Störung und Eierentnahme, **nicht** aber bei Buchstabe d (Fortpflanzungs- und Ruhestätten). § 44 Abs. 1 setzt das teils strenger um. BIOME darf beide Texte nicht als identisch behandeln.
  - **Alle Lebensstadien** sind erfasst (Art. 12 Abs. 3) — Anschluss an `lifeStage` (DWC-02).
- **Deckt ausdrücklich nicht:**
  - **Die Artenlisten selbst als Datenbestand.** Sie stehen im abgerufenen Text vollständig, wurden hier aber nicht ausgezählt und nicht als Datei übernommen. BIOME muss sie aus dieser Quelle importieren, nicht abtippen; eine Zahl „N Arten in Anhang IV" ist hier bewusst nicht behauptet.
  - Anhang I (Lebensraumtypen) und Anhang V — nicht Gegenstand dieses Registers (Anhang I siehe `02-vegetationsflaechen.md`).
  - Den aktuellen Änderungsstand jenseits des 01.07.2013. Die abgerufene konsolidierte Fassung berücksichtigt M1 bis M4 (bis Richtlinie 2013/17/EU) und die Berichtigung C1. **WISIA (BFN-01) verweist demgegenüber auf eine „FFH-Richtlinie (EU) 2025/1237", die auf EUR-Lex nicht abrufbar war — siehe „Nicht zugänglich" und „Offene Fragen".**

### EU-02 · Vogelschutzrichtlinie 2009/147/EG — Anhang I, Artikel 1, 4 und 5
- **Herausgeber:** Europäisches Parlament und Rat der Europäischen Union; Originalfassung im Amtsblatt L 20 vom 26.1.2010, S. 7
- **Quelle:** https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32009L0147&from=DE
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Artikel 1 — Geltungsbereich, vollständig):
  „(1) Diese Richtlinie betrifft die Erhaltung sämtlicher wildlebenden Vogelarten, die im europäischen Gebiet der Mitgliedstaaten, auf welches der Vertrag Anwendung findet, heimisch sind. Sie hat den Schutz, die Bewirtschaftung und die Regulierung dieser Arten zum Ziel und regelt die Nutzung dieser Arten."
  „(2) Sie gilt für Vögel, ihre Eier, Nester und Lebensräume."
- **Wörtlich** (Artikel 4 Absatz 1 — die Bedeutung des Anhangs I, vollständig):
  „(1) Auf die in Anhang I aufgeführten Arten sind besondere Schutzmaßnahmen hinsichtlich ihrer Lebensräume anzuwenden, um ihr Überleben und ihre Vermehrung in ihrem Verbreitungsgebiet sicherzustellen.
  In diesem Zusammenhang sind zu berücksichtigen:
  a) vom Aussterben bedrohte Arten;
  b) gegen bestimmte Veränderungen ihrer Lebensräume empfindliche Arten;
  c) Arten, die wegen ihres geringen Bestands oder ihrer beschränkten örtlichen Verbreitung als selten gelten;
  d) andere Arten, die aufgrund des spezifischen Charakters ihres Lebensraums einer besonderen Aufmerksamkeit bedürfen.
  Bei den Bewertungen werden Tendenzen und Schwankungen der Bestände der Vogelarten berücksichtigt.
  Die Mitgliedstaaten erklären insbesondere die für die Erhaltung dieser Arten zahlen- und flächenmäßig geeignetsten Gebiete zu Schutzgebieten, wobei die Erfordernisse des Schutzes dieser Arten in dem geografischen Meeres- und Landgebiet, in dem diese Richtlinie Anwendung findet, zu berücksichtigen sind."
- **Wörtlich** (Artikel 4 Absatz 2 — Zugvögel außerhalb Anhang I):
  „(2) Die Mitgliedstaaten treffen unter Berücksichtigung der Schutzerfordernisse in dem geografischen Meeres- und Landgebiet, in dem diese Richtlinie Anwendung findet, entsprechende Maßnahmen für die nicht in Anhang I aufgeführten, regelmäßig auftretenden Zugvogelarten hinsichtlich ihrer Vermehrungs-, Mauser- und Überwinterungsgebiete sowie der Rastplätze in ihren Wanderungsgebieten."
- **Wörtlich** (Artikel 5 — allgemeine Schutzregelung, vollständig):
  „Unbeschadet der Artikel 7 und 9 erlassen die Mitgliedstaaten die erforderlichen Maßnahmen zur Schaffung einer allgemeinen Regelung zum Schutz aller unter Artikel 1 fallenden Vogelarten, insbesondere das Verbot
  a) des absichtlichen Tötens oder Fangens, ungeachtet der angewandten Methode;
  b) der absichtlichen Zerstörung oder Beschädigung von Nestern und Eiern und der Entfernung von Nestern;
  c) des Sammelns der Eier in der Natur und des Besitzes dieser Eier, auch in leerem Zustand;
  d) ihres absichtlichen Störens, insbesondere während der Brut- und Aufzuchtzeit, sofern sich diese Störung auf die Zielsetzung dieser Richtlinie erheblich auswirkt;
  e) des Haltens von Vögeln der Arten, die nicht bejagt oder gefangen werden dürfen."
- **Wörtlich** (Anhang I — Beginn der Liste, unverändert):
  „ANHANG I — GAVIIFORMES — Gaviidae — Gavia stellata — Gavia arctica — Gavia immer — PODICIPEDIFORMES — Podicipedidae — Podiceps auritus — PROCELLARIIFORMES — Procellariidae — Pterodroma madeira — Pterodroma feae — Bulweria bulwerii — Calonectris diomedea"
- **Deckt in BIOME:**
  - **Anhang I trägt in der deutschen Originalfassung keinen erläuternden Kopftext** — er beginnt unmittelbar mit der Ordnung GAVIIFORMES. Die Bedeutung des Anhangs ergibt sich ausschließlich aus Artikel 4 Absatz 1. **Ein BIOME-Tooltip „Anhang I = …" muss deshalb Artikel 4 Absatz 1 zitieren, nicht den Anhang.**
  - **Feld `vsr_anhang_1` (Boolean)** mit der belegten Rechtsfolge: „besondere Schutzmaßnahmen hinsichtlich ihrer Lebensräume" und Ausweisung der geeignetsten Gebiete als Schutzgebiete.
  - **Feld `zugvogel_art4_2`** als eigener, von Anhang I unabhängiger Status — Artikel 4 Abs. 2 schützt regelmäßig auftretende Zugvogelarten **außerhalb** von Anhang I. Eine Oberfläche, die nur „Anhang I ja/nein" kennt, verliert diesen Fall.
  - **Nester und Eier sind eigene Schutzobjekte** (Art. 1 Abs. 2, Art. 5 b und c) — einschließlich leerer Eier und der bloßen **Entfernung** von Nestern. Das ist der europarechtliche Anschluss für Nest-Habitatstrukturen (TREM-02, Typen 45/46).
  - **Vier belegte Störungszeiträume nach Art. 5 d:** Brut- und Aufzuchtzeit, jeweils mit der Erheblichkeitsklausel.
  - Die Verifikation gegen die Anhangsliste ist möglich: `Dryocopus martius` (Schwarzspecht) steht im abgerufenen Anhang-I-Text — dieser Befund ist im Register wichtig, weil WISIA ihn **nicht** als Anhang-I-Art ausweist (BFN-01).
- **Deckt ausdrücklich nicht:**
  - Die konsolidierte Fassung. `CELEX:02009L0147-20190626` antwortete mit HTTP 202 und leerem Body; alle Zitate stammen aus der **Originalfassung** von 2009. Spätere Änderungen der Anhänge sind damit nicht abgedeckt.
  - Die Artenliste als Datenbestand oder eine Artenzahl. Sie steht im abgerufenen Text, wurde aber nicht ausgezählt.
  - Anhänge II und III (jagdbare Arten, Vermarktung) — nicht ausgewertet.

### BFN-01 · WISIA-online — der operative Nachschlagedienst für den Schutzstatus
- **Herausgeber:** Bundesamt für Naturschutz (BfN), Bonn — „Artenschutzdatenbank des Bundesamt für Naturschutz in Bonn"
- **Quelle:** https://www.wisia.de/ · Namenssuche `https://www.wisia.de/GetNames?taxon=<Name>&lang=deu&check_search_partname=on` · Detail `https://www.wisia.de/GetTaxInfo?knoten_id=<id>&check_viewimg=0&lang=deu`
- **Abgerufen:** 2026-08-09 (alle HTTP 200)
- **Wörtlich** (Startseite):
  „Wissenschaftliches Informationssystem zum Internationalen Artenschutz" · „Artenschutzdatenbank des Bundesamt für Naturschutz in Bonn"
  „In WISIA-online sind Informationen zum Schutzstatus von international und national geschützten Arten abrufbar. Die nach den in Deutschland geltenden Artenschutzregelungen besonders oder streng geschützten Arten unterliegen damit gesetzlichen Schutzbestimmungen und können nicht ohne weiteres gehandelt oder in Besitz genommen werden."
  „Die in WISIA-online verfügbaren Informationen wurden nach bestem Wissen auf Basis der aktuell verfügbaren Referenzen aufbereitet. Das Internetangebot WISIA-online dient als Hilfsmittel zur Ermittlung des vom Gesetzgeber festgelegten Schutzumfangs; verbindlich sind im Zweifelsfall die betreffenden Gesetzestexte und ihre Anhänge!"
  „Stand Anwendung: 01.09.2025" · „Stand Daten: 08.07.2026" · „Kontakt: wisia@bfn.de"
- **Wörtlich** (Detailantwort *Myotis myotis*, `knoten_id=636`, Abschnitt „Schutz", unverändert):
  „gültiger Name: Myotis myotis (BORKHAUSEN, 1797)" · „Gruppe: Säugetiere" · „Landespr. Namen: Großes Mausohr"
  „Schutz: … streng bzw. besonders geschützt nach BNatSchG [BG] Status:s … Myotis myotis"
  „FFH-Richtlinie (EU) 2025/1237 [FFH] Anhang:II … Myotis myotis"
  „FFH-Richtlinie (EU) 2025/1237 [FFH] Anhang:IV … Microchiroptera spp."
  „Detaillierte Schutzdaten: Unterschutzstellung / Datum / Bemerkung — Listung 31.08.80 — Besonders geschützt nach BNatSchG seit 31.08.80"
- **Wörtlich** (Detailantwort *Passer domesticus*, `knoten_id=22910`):
  „streng bzw. besonders geschützt nach BNatSchG [BG] Status:b … Passer domesticus"
  „Vogelschutzrichtlinie 2009/147/EG [VSR] Anhang:Art.1 … Passer domesticus"
  „Listung 01.01.87 — Besonders geschützt nach BNatSchG seit 01.01.87"
- **Wörtlich** (Detailantwort *Dryocopus martius*, `knoten_id=10932`):
  „streng bzw. besonders geschützt nach BNatSchG [BG] Status:s … Dryocopus martius"
  „BArtSchV Novellierung [BV] Anhang:1 … 5) Besonders geschützte Art auf Grund § 7 Abs. 2 Nr.13 Buchstabe b Doppelbuchstabe bb des Bundesnaturschutzgesetzes. … Dryocopus martius"
  „Vogelschutzrichtlinie 2009/147/EG [VSR] Anhang:Art.1 … Dryocopus martius"
- **Wörtlich** (Erläuterung der Schutzhistorie, auf jeder Detailseite):
  „„Erstlistung" bedeutet erstmaliger Schutz nach einem rechtlich bindenden Regelwerk (WA, EG-VO, BArtSchV, BNatSchG mit Verweis auf Anhang IV FFH, VSR)."
  „„Besonders geschützt nach BNatSchG" bedeutet seit wann eine Art nach nationalem Recht als „besonders geschützt" gilt."
- **Deckt in BIOME:**
  - **Ein frei und ohne Login abfragbarer Bundesdienst zur Ermittlung des Schutzstatus je Art.** Der Abruf ist über eine stabile URL mit dem wissenschaftlichen Namen möglich; die Trefferseite verlinkt eine `knoten_id`, die die Detailabfrage trägt.
  - **Feld `schutzstatus_code` mit genau zwei belegten Werten:** `s` = streng geschützt, `b` = besonders geschützt. Die Zuordnung ergibt sich aus dem Vergleich der drei Abfragen: *Myotis myotis* (Anhang IV FFH) und *Dryocopus martius* (BArtSchV Anlage 1) tragen `s`, *Passer domesticus* (nur europäische Vogelart) trägt `b`. Das deckt sich mit § 7 Abs. 2 Nr. 13/14 BNatSchG (BNAT-01).
  - **Feld `schutz_seit`** (Datum der Unterschutzstellung) ist je Art belegt — im Beispiel 31.08.1980 bzw. 01.01.1987.
  - **Die Sammelangabe wird sichtbar gemacht:** bei *Myotis myotis* steht als „Name im Regelwerk" für Anhang IV ausdrücklich `Microchiroptera spp.` — WISIA löst die Sammelangabe der FFH-Richtlinie (EU-01) auf die Einzelart auf. Das ist genau die Leistung, die BIOME selbst nicht erbringen müsste.
  - **Datenstand ist maschinell erfassbar** („Stand Daten: 08.07.2026") und muss bei jedem übernommenen Status mitgespeichert werden.
- **Deckt ausdrücklich nicht:**
  - **Rechtsverbindlichkeit.** Die Quelle sagt es selbst: „dient als Hilfsmittel … verbindlich sind im Zweifelsfall die betreffenden Gesetzestexte und ihre Anhänge!" Eine BIOME-Ausgabe darf einen WISIA-Status nicht als Rechtsauskunft ausgeben.
  - **Anhang I der Vogelschutzrichtlinie.** *Dryocopus martius* steht im abgerufenen Anhang-I-Text der Richtlinie (EU-02), WISIA weist bei ihm aber nur „VSR Anhang:Art.1" aus. **BIOME darf die Anhang-I-Zugehörigkeit nicht aus WISIA ableiten**, sondern muss sie aus dem Richtlinientext importieren.
  - Rote-Liste-Kategorien, Erhaltungszustände, Vorkommensdaten. WISIA liefert Schutzstatus, sonst nichts.
  - Eine dokumentierte, stabile API. Die verwendeten URLs sind aus dem HTML-Formular abgeleitet (`<form name="WFormBaz" action='GetNames' method='get'>`); es gibt keine Zusage, dass sie stabil bleiben. Die Anwendung meldet sich als „Version: 3.5.3-Production".
  - Die Herkunft der Bezeichnung „FFH-Richtlinie (EU) 2025/1237". Dieser Rechtsakt war auf EUR-Lex nicht abrufbar (siehe „Nicht zugänglich").

### RL-01 · Rote-Liste-Kategorien Deutschlands — alle zehn wörtlich
- **Herausgeber:** Rote-Liste-Zentrum (im Auftrag des Bundesamtes für Naturschutz); Grafikquelle auf der Seite: „© Grafik: Rote-Liste-Zentrum/Bundesamt für Naturschutz"
- **Quelle:** https://www.rote-liste-zentrum.de/die-roten-listen/rote-liste-kategorien/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Einleitung und alle zehn Kategorien, vollständig und unverändert):
  „Die zehn Kategorien der Roten Liste — Als Ergebnis der Gefährdungsanalyse werden in den deutschen Roten Listen seit dem Jahr 2009 zehn Rote-Liste-Kategorien unterschieden:"
  „0 Ausgestorben oder verschollen — Arten, die im Bezugsraum verschwunden sind oder von denen keine wildlebenden Populationen mehr bekannt sind. Die Populationen sind entweder nachweisbar ausgestorben, in aller Regel ausgerottet (die bisherigen Habitate bzw. Standorte sind so stark verändert, dass mit einem Wiederfund nicht mehr zu rechnen ist) oder verschollen, das heißt, aufgrund vergeblicher Nachsuche über einen längeren Zeitraum besteht der begründete Verdacht, dass ihre Populationen erloschen sind."
  „1 Vom Aussterben bedroht — Arten, die so schwerwiegend bedroht sind, dass sie in absehbarer Zeit aussterben, wenn die Gefährdungsursachen fortbestehen. Ein Überleben im Bezugsraum kann nur durch sofortige Beseitigung der Ursachen oder wirksame Schutz- und Hilfsmaßnahmen für die Restbestände dieser Arten gesichert werden."
  „2 Stark gefährdet — Arten, die erheblich zurückgegangen oder durch laufende bzw. absehbare menschliche Einwirkungen erheblich bedroht sind. Wird die aktuelle Gefährdung der Art nicht abgewendet, rückt sie voraussichtlich in die Rote-Liste-Kategorie „Vom Aussterben bedroht" auf."
  „3 Gefährdet — Arten, die merklich zurückgegangen oder durch laufende bzw. absehbare menschliche Einwirkungen bedroht sind. Wird die aktuelle Gefährdung der Art nicht abgewendet, rückt sie voraussichtlich in die Rote-Liste-Kategorie „Stark gefährdet" auf."
  „G Gefährdung unbekannten Ausmaßes — Arten, die gefährdet sind. Einzelne Untersuchungen lassen eine Gefährdung erkennen, aber die vorliegenden Informationen reichen für eine exakte Einstufung in die Rote-Liste-Kategorien 1 bis 3 nicht aus."
  „R Extrem selten — Extrem seltene bzw. sehr lokal vorkommende Arten, deren Bestände in der Summe weder lang- noch kurzfristig abgenommen haben und die auch nicht aktuell bedroht, aber gegenüber unvorhersehbaren Gefährdungen besonders anfällig sind."
  „V Vorwarnliste — Arten, die merklich zurückgegangen sind, aber aktuell noch nicht gefährdet sind. Bei Fortbestehen von bestandsreduzierenden Einwirkungen ist in naher Zukunft eine Einstufung in die Rote-Liste-Kategorie „Gefährdet" wahrscheinlich."
  „D Daten unzureichend — Die Informationen zu Verbreitung, Biologie und Gefährdung einer Art sind unzureichend, wenn die Art bisher oft übersehen bzw. nicht unterschieden wurde oder erst in jüngster Zeit taxonomisch untersucht wurde oder taxonomisch nicht ausreichend geklärt ist oder mangels Spezialisten hinsichtlich einer möglichen Gefährdung nicht beurteilt werden kann."
  „* Ungefährdet — Arten werden als derzeit nicht gefährdet angesehen, wenn ihre Bestände zugenommen haben, stabil sind oder so wenig zurückgegangen sind, dass sie nicht mindestens in Rote-Liste-Kategorie V eingestuft werden müssen."
  „♦ Nicht bewertet — Für diese Arten wird keine Gefährdungsanalyse durchgeführt."
- **Deckt in BIOME:**
  - **Feld `rote_liste_kategorie` mit einer abgeschlossenen Liste von genau zehn Werten:** `0`, `1`, `2`, `3`, `G`, `R`, `V`, `D`, `*`, `♦`. Kein Freitext, keine Zwischenwerte, keine Zahl 4.
  - **Das Feld ist nicht rein numerisch.** `G`, `R`, `V`, `D`, `*` und `♦` sind Buchstaben bzw. Zeichen. Ein Integer-Feld ist unzureichend; `♦` (U+2666) muss zeichenkorrekt gespeichert werden.
  - **Die Kategorien sind keine Rangskala.** `R` (extrem selten, aber nicht abnehmend) und `D` (Daten unzureichend) und `♦` (nicht bewertet) lassen sich nicht in eine Ordnung mit 1–3 bringen. Eine BIOME-Sortierung oder Farbampel darf das nicht suggerieren.
  - **„Gefährdet" im engeren Sinn sind 1, 2, 3 und G** (G wird ausdrücklich als „Arten, die gefährdet sind" definiert). `V` ist ausdrücklich **noch nicht** gefährdet. Diese Abgrenzung ist wörtlich belegt und darf für Aggregate verwendet werden.
  - **Bezugsraum ist immer zu nennen** („Arten, die im Bezugsraum verschwunden sind"). Eine bundesweite Kategorie gilt nicht für Berlin; BIOME braucht ein Feld `bezugsraum`.
  - **Gültig seit 2009** — ältere Rote Listen verwenden ein anderes Kategoriensystem (siehe RL-03, Feld „alte RL-Kat." mit dem zusätzlichen Wert `**`).
- **Deckt ausdrücklich nicht:**
  - Die Zuordnung einer konkreten Art zu einer Kategorie — dafür braucht es die jeweilige Rote Liste (RL-03).
  - Eine Gleichsetzung mit den IUCN-Kategorien. Die Seite stellt keine Umschlüsselung bereit; das GBIF-Feld `iucnRedListCategory` (GBIF-02) ist etwas anderes.
  - Rechtsfolgen. Eine Rote-Liste-Kategorie ist **kein** Schutzstatus im Sinne des § 7 BNatSchG.

### RL-02 · Rote-Liste-Kriterien und Kriterienklassen
- **Herausgeber:** Rote-Liste-Zentrum / Bundesamt für Naturschutz
- **Quelle:** https://www.rote-liste-zentrum.de/die-roten-listen/erstellung-und-methodik/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Methodik und die vier Kriterien):
  „Die vom Bundesamt für Naturschutz herausgegebenen Roten Listen werden seit 2006 nach einer einheitlichen Methodik erstellt."
  „Für die Gefährdungsanalyse werden die Informationen, die zur aktuellen Bestandssituation und zu den beiden Bestandstrends jeder einheimischen Art vorliegen, in folgenden Rote-Liste-Kriterien abgebildet: 1) Aktuelle Bestandssituation 2) Langfristiger Bestandstrend 3) Kurzfristiger Bestandstrend 4) Risiko/stabile Teilbestände (früher: Risikofaktoren und Sonderfälle)"
  „Die Informationen oder Einschätzungen zu den drei ersten Rote-Liste-Kriterien werden in Skalen mit vorgegebenen Rote-Liste-Kriterienklassen eingeordnet. Mit dem vierten Rote-Liste-Kriterium wird die Wirkung von Risikofaktoren und stabilen Beständen erfasst. Die Gefährdungsanalyse wird durch erfahrene Expertinnen und Experten vorgenommen."
- **Wörtlich** (die drei Skalen mit ihren Klassen und Zeiträumen, vollständig):
  „Die aktuelle Bestandssituation soll den Umfang der heute in Deutschland etablierten Populationen einer Art abschätzen. Je nach Datenlage werden Beobachtungen aus den vergangenen 10 bis maximal 25 Jahren betrachtet. … Für die Einschätzung der aktuellen Bestandssituation wird jede Art in eine von acht Kriterienklassen (sehr häufig, häufig, mäßig häufig, selten, sehr selten, extrem selten, ausgestorben oder verschollen, unbekannt) eingeordnet."
  „Der langfristige Bestandstrend beschreibt die Entwicklung z. B. während der vergangenen 50 bis 150 Jahre. Bei der Betrachtung von 100 Jahren werden also die heutigen Bestandsgrößen mit denen um 1920 verglichen. Die Veränderungen werden in einer Skala von sieben Kriterienklassen (sehr starker Rückgang, starker Rückgang, mäßiger Rückgang, Rückgang im Ausmaß unbekannt, stabil, deutliche Zunahme, Daten ungenügend) eingeordnet."
  „Der kurzfristige Bestandstrend gibt die möglichen Veränderungen während der vergangenen 10 bis 25 Jahre wieder … Auch die zum kurzfristigen Bestandstrend vorliegenden Informationen werden in Kriterienklassen eingeordnet (sehr starke Abnahme, starke Abnahme, mäßige Abnahme, Abnahme im Ausmaß unbekannt, stabil, deutliche Zunahme, Daten ungenügend)."
  „Das Rote-Liste-Kriterium „Risiko/stabile Teilbestände" verknüpft zwei Prognosen: Zum einen wird vorhergesagt, ob sich der kurzfristige Bestandstrend der vergangenen Jahre aufgrund besonderer Risiken in den nächsten zehn Jahren verschlechtern wird (beispielsweise von bisher „stabil" hin zu „mäßiger Abnahme"). Zum anderen wird abgeschätzt, ob eine Art bei Fortbestehen der jetzigen Gefährdung in absehbarer Zeit aussterben wird oder ob ein Aussterben wegen der Existenz stabiler Teilbestände unwahrscheinlich ist."
  „Aus den vier eingeschätzten Rote-Liste-Kriterien wird anhand eines Einstufungsschemas die Rote-Liste-Kategorie ermittelt. Rote Listen begnügen sich nicht mit der Bekanntgabe der Rote-Liste-Kategorie, sie dokumentieren auch die einzelnen Rote-Liste-Kriterienschätzungen. Dadurch wird der Einstufungsweg besser nachvollziehbar."
- **Wörtlich** (Verantwortlichkeit Deutschlands — die sechs Kategorien, vollständig):
  „Für die Analyse der Verantwortlichkeit werden drei Kriterien eingeschätzt: Anteil am Weltbestand … Lage im Areal … Weltweite Gefährdung"
  „Die Kombination der Kriterien führt anhand eines Einstufungsschemas zu entsprechenden Verantwortlichkeitskategorien: In besonders hohem Maße verantwortlich — In hohem Maße verantwortlich — In besonderem Maße für hochgradig isolierte Vorposten verantwortlich — Allgemeine Verantwortlichkeit — Daten ungenügend, eventuell erhöhte Verantwortlichkeit zu vermuten — Nicht bewertet"
- **Wörtlich** (methodische Grundlage und ihr Stand):
  „Die methodische Grundlage für die Erstellung der Roten Listen wurde für den Zyklus ab 2009 vom BfN in Abstimmung mit den Autor*innen der Roten Listen entwickelt und in NaBiV 70/1 veröffentlicht. Für den Zyklus ab 2020 sind zudem die Erweiterungen der Methodik gemäß Rote-Liste-Autorentagung 2016 (Bonn, 18./19.11.2016) und der Überarbeitung 2021 (redaktionelle Änderungen, 23.02.2021) verbindlich. Eine zusammenfassende Darstellung der aktuellen Methodik der Gefährdungsanalyse ist in Vorbereitung und soll in der laufenden Reihe veröffentlicht werden."
- **Deckt in BIOME:**
  - **Vier Kriterienfelder je Art**, nicht nur die Kategorie: `bestandssituation`, `trend_langfristig`, `trend_kurzfristig`, `risiko_stabile_teilbestaende`. Die Quelle verlangt ausdrücklich, dass die Einzelschätzungen mitdokumentiert werden — BIOME darf die Kategorie nicht ohne ihre Kriterien führen.
  - **`bestandssituation`: acht abgeschlossene Klassen** — sehr häufig, häufig, mäßig häufig, selten, sehr selten, extrem selten, ausgestorben oder verschollen, unbekannt.
  - **`trend_langfristig`: sieben abgeschlossene Klassen** — sehr starker Rückgang, starker Rückgang, mäßiger Rückgang, Rückgang im Ausmaß unbekannt, stabil, deutliche Zunahme, Daten ungenügend.
  - **`trend_kurzfristig`: sieben abgeschlossene Klassen** — sehr starke Abnahme, starke Abnahme, mäßige Abnahme, Abnahme im Ausmaß unbekannt, stabil, deutliche Zunahme, Daten ungenügend. **Die Wortwahl unterscheidet sich vom langfristigen Trend („Abnahme" statt „Rückgang"); BIOME darf die beiden Wertelisten nicht zusammenlegen.**
  - **Belegte Bezugszeiträume:** aktuelle Bestandssituation 10–25 Jahre; langfristiger Trend 50–150 Jahre; kurzfristiger Trend 10–25 Jahre; Risikoprognose 10 Jahre.
  - **`verantwortlichkeit_deutschland`: sechs abgeschlossene Kategorien**, wörtlich oben.
- **Deckt ausdrücklich nicht:**
  - **Das Einstufungsschema selbst.** Die Seite nennt es, gibt es aber nicht wieder. Wie aus den vier Kriterien die Kategorie folgt, ist über diese Quelle **nicht** belegt — BIOME darf die Kategorie nicht selbst berechnen.
  - Quantitative Schwellen (z. B. ab wieviel Prozent Rückgang „stark"). Die Seite nennt keine Zahlen.
  - Den vollständigen Methodikband NaBiV 70/1 — nicht abgerufen. Die Seite sagt selbst, eine zusammenfassende Darstellung der aktuellen Methodik sei erst „in Vorbereitung".

### RL-03 · Rote Liste der Brutvögel Deutschlands — Datensatz, Codelisten, echte Werte
- **Herausgeber:** Bundesamt für Naturschutz / Rote-Liste-Zentrum (Bereitstellung); Publikation laut mitgelieferter Datei: „Grüneberg, C.; Bauer, H.-G.; Haupt, H.; Hüppop, O.; Ryslavy, T. & Südbeck, P. (2016): Rote Liste der Brutvögel Deutschlands. 5. Fassung, 30. November 2015. – Berichte zum Vogelschutz 52: 19–67."
- **Quelle:** https://www.rote-liste-zentrum.de/wp-content/uploads/Download_RoteListe_Voegel_2016_20200930-1405.zip (verlinkt von https://www.rote-liste-zentrum.de/die-roten-listen/download-wirbeltiere/)
- **Abgerufen:** 2026-08-09 (HTTP 200, ZIP mit 3 Dateien: `01_Informationen…html`, `02_Datentabelle_RL_Brutvoegel_2016_Deutschland_…xlsx`, `03_Legende_RL_Brutvoegel_2016_…xlsx`)
- **Wörtlich** (aus `01_Informationen…html`):
  „Gruppe: Vögel" · „Zyklus: 2015ff" · „Aktuell: Ja" · „Auswertungsebene: Taxa" · „Nachfolgerliste in Zyklus: --" · „Vorgängerliste in Zyklus: 2009ff"
  „Bei Verwendung der Daten ist die Quelle der publizierten Roten Liste gemäß nachstehender Tabelle anzugeben."
  „02_Datentabelle: Alle verfügbaren Daten der Rote-Liste-Datenbank für die jeweilige Organismengruppe. Die Arten des Anhangs der publizierten Roten Liste befinden sich im unteren Ende der Tabelle."
  „03_Legende: Lookup-Tabelle als Legende für die in der Datei 02_Datentabelle verwendeten Werte und Symbole."
- **Wörtlich** (Spaltenüberschriften der Datentabelle, vollständig und in Reihenfolge):
  „Name | Deutscher Name | UUID des Taxons | UUID des direkt übergeordneten Taxons | Synonyme | Konzeptbeziehungen | Jahrzehnt | Auswertung | Taxa | Arten | Oberste Taxa | Neobiota | aktuelle Bestandssituation | kurzfristiger Bestandstrend | langfristiger Bestandstrend | Sonderfälle | Letzter Nachweis | RL Kat. | Risikofaktoren | Risiko | Risikofaktoren (Kürzel 1) | Risikofaktoren (Kürzel 2) | Risikofaktoren (Kürzel 3) | Taxonomischer Bezug | alte RL- Kat. | Kat. +/- | Grund | Grund der Kategorieänderung 1 | Grund der Kategorieänderung 2 | Grund der Kategorieänderung 3 | Kommentar zur Taxonomie | Kommentar zur Gefährdung | Kommentar zur Nachsuche | Weitere Kommentare | Verantwortlichkeit"
- **Wörtlich** (aus `03_Legende`, die für BIOME tragenden Codelisten — vollständig, Format „Wert | Legende"):
  *aktuelle Bestandssituation:* „ex | Ausgestorben oder verschollen," · „es | Extrem selten" · „ss | Sehr selten" · „s | Selten" · „mh | Mäßig häufig" · „h | Häufig" · „sh | Sehr häufig" · „? | Unbekannt" · „nb | Nicht bewertet" · „kN | Kein Nachweis oder nicht etabliert (nur in Regionallisten)"
  *kurzfristiger Bestandstrend:* „vvv | Sehr starke Abnahme" · „vv | Starke Abnahme" · „(v) | Abnahme mäßig oder im Ausmaß unbekannt" · „= | Gleich bleibend" · „^ | Deutliche Zunahme" · „? | Daten ungenügend"
  *langfristiger Bestandstrend:* „<<< | Sehr starker Rückgang" · „<< | Starker Rückgang" · „< | Mäßiger Rückgang" · „(<) | Rückgang, Ausmaß unbekannt" · „= | Gleich bleibend" · „> | Deutliche Zunahme" · „? | Daten ungenügend"
  *Sonderfälle:* „S | Stabile Teilbestände: Kat. 2 statt 1" · „E | Einschneidende absehbare Risikofaktoren: Kat. 1 statt R" · „D | Dramatische aktuelle Bestandseinbußen: Kat. 3 statt V bzw. V statt " · „[leer] | Kein Sonderfall"
  *RL Kat.:* „0 | Ausgestorben oder verschollen" · „1 | Vom Aussterben bedroht" · „2 | Stark gefährdet" · „3 | Gefährdet" · „G | Gefährdung unbekannten Ausmaßes" · „R | Extrem selten" · „V | Vorwarnliste" · „* | Ungefährdet" · „D | Daten unzureichend" · „♦ | Nicht bewertet" · „kN | kN"
  *Risikofaktoren:* „– | Negativ wirksam" · „= | Nicht feststellbar"
  *Risikofaktoren (Kürzel 1–3), jeweils identisch:* „A | Bindung an stärker abnehmende Arten" · „B | Bastardierung (z.B. mit Neobiota)" · „D | Verstärkte direkte Einwirkungen" · „F | Fragmentierung / Isolation" · „I | Verstärkte indirekte Einwirkungen" · „M | Minimal lebensfähige Populationsgröße" · „N | Nicht gesicherte Naturschutzmaßnahmen" · „R | Verstärkte Einschränkung der Reproduktion" · „V | Verringerte genetische Vielfalt" · „W | Wiederbesiedlung in Zukunft sehr erschwert" · „[leer] | es ist kein Risikofaktor bekannt"
  *Status:* „I | etablierte Indigene und Archäobiota" · „N | etablierte Neobiota" · „U | Unbeständige und Kultivierte" · „? | Zweifelhafte (taxonomisch oder geografisch)" · „F | Fehlangaben" · „kN | Kein Nachweis oder nicht etabliert"
  *Taxonomischer Bezug:* „≙ | Es besteht taxonomische Übereinstimmung zwischen der Auffassung eines Taxons der neuen Roten Liste mit der eines Taxons der alten Roten Liste (Kongruenz)" · „< | Die taxonomische Auffassung der alten Roten Liste umfasst mehrere Taxa der neuen Roten Liste (pro parte Inklusion)" · „> | … (Inklusion)" · „≷ | … (Interferenz)"
  *alte RL-Kat.* enthält zusätzlich den Wert „** | Mit Sicherheit ungefährdet" und „nb | Nicht bewertet"
  *Kat. +/-:* „+ | Aktuelle Verbesserung der Einstufung" · „– | Aktuelle Verschlechterung der Einstufung" · „= | Kategorie unverändert" · „[leer] | Kategorieänderung nicht bewertbar (inkl. ♦ -> ♦)"
  *Grund der Kategorieänderung 1–3:* „R | Reale Veränderungen" · „R(Na) | Reale Veränderungen durch Naturschutzmaßnahmen" · „K | Kenntniszuwachs" · „M | Methodik" · „T | Taxonomische Änderungen"
- **Wörtlich** (aus `01_Informationen…html`, Abweichung Druck vs. Datei — wichtig beim Import):
  „Einige in 02_Datentabelle verwendete Symbole entsprechen nicht den in der Publikation verwendeten Symbolen. … Symbol / Druck / Legende — vvv / ↓↓↓ / Sehr starke Abnahme — vv / ↓↓ / Starke Abnahme — v / ↓ / Mäßige Abnahme — (v) / (↓) / Abnahme, im Ausmaß unbekannt — ^ / ↑ / Deutliche Zunahme"
- **Wörtlich** (drei echte Datenzeilen aus `02_Datentabelle`, Feld = Wert, unverändert):
  *Feldlerche:* „Name = Alauda arvensis Linnaeus, 1758 | Deutscher Name = Feldlerche | UUID des Taxons = 9773a901-c215-44fb-b1aa-3df3432c77da | aktuelle Bestandssituation = h | kurzfristiger Bestandstrend = vv | langfristiger Bestandstrend = (<) | RL Kat. = 3 | Risikofaktoren = – | Risiko = I | Risikofaktoren (Kürzel 1) = I | Taxonomischer Bezug = ≙ | alte RL- Kat. = 3 | Kat. +/- = ="
  *Haussperling:* „Name = Passer domesticus (Linnaeus, 1758) | Deutscher Name = Haussperling | UUID des Taxons = 29859319-5cd3-4c2f-afa5-4f56fe35af29 | aktuelle Bestandssituation = h | kurzfristiger Bestandstrend = vv | langfristiger Bestandstrend = (<) | RL Kat. = V | Risikofaktoren = = | Taxonomischer Bezug = ≙ | alte RL- Kat. = V | Kat. +/- = ="
  *Nachtreiher:* „Name = Nycticorax nycticorax (Linnaeus, 1758) | Deutscher Name = Nachtreiher | aktuelle Bestandssituation = es | kurzfristiger Bestandstrend = ^ | langfristiger Bestandstrend = << | RL Kat. = 2 | Risikofaktoren = = | Taxonomischer Bezug = ≙ | alte RL- Kat. = 1 | Kat. +/- = +"
- **Deckt in BIOME:**
  - **Ein vollständiger, frei herunterladbarer Referenzdatensatz für die Brutvögel Deutschlands** mit stabilen Taxon-UUIDs, deutschem und wissenschaftlichem Namen und allen Kriterienschätzungen. Damit kann BIOME die Rote-Liste-Kategorie je Vogelart nachschlagen, statt sie zu behaupten.
  - **Die Codelisten oben sind abgeschlossene Wertelisten** und decken exakt die Felder aus RL-02 — hier aber als konkrete, importierbare Codes.
  - **`Risikofaktoren` und `Sonderfälle` sind zwei verschiedene Felder** mit verschiedenen Wertelisten; die Sonderfälle beschreiben ausdrücklich Abweichungen vom Einstufungsschema („Kat. 2 statt 1").
  - **Bis zu drei Risikofaktoren** je Art, nach Priorität geordnet; ebenso bis zu drei Gründe der Kategorieänderung. Das Datenmodell in BIOME muss diese Mehrfachheit abbilden.
  - **Symbolfalle beim Import:** die Datei verwendet ASCII-Ersatzzeichen (`vvv`, `vv`, `(v)`, `^`, `<<<`), der Druck Pfeile (`↓↓↓`, `↑`). BIOME muss die Datei-Codes speichern und darf die Druckzeichen höchstens für die Anzeige erzeugen.
  - **Bezugsjahr und Fassung sind mitzuführen:** 5. Fassung, Stand 30. November 2015, Zyklus 2015ff, laut Bereitsteller aktuell und ohne Nachfolgerliste.
  - **Auswertungsebene beachten:** die Datei enthält 281 Taxa-Zeilen; nach `RL Kat.` verteilen sie sich (eigene Auszählung der heruntergeladenen Tabelle, **nicht** eine in der Quelle genannte Zahl) auf `*` 125, `R` 30, `1` 29, `3` 27, `♦` 20, `2` 19, `V` 18, `0` 13. Anhangsarten stehen laut Informationsdatei am Tabellenende und müssen vor jeder Statistik gefiltert werden.
- **Deckt ausdrücklich nicht:**
  - Die Publikation selbst („Berichte zum Vogelschutz 52: 19–67") — nicht abgerufen. Die Datei ersetzt sie nicht; die Zitierpflicht bezieht sich auf die Publikation.
  - Regionale Rote Listen (Berlin, Brandenburg) — nicht gesucht.
  - Rote Listen anderer Tiergruppen. Auf derselben Seite liegen Downloads für Säugetiere (2020), Reptilien (2020), Amphibien (2020), Süßwasserfische (2023) und Meeresfische (2025); sie wurden nicht ausgewertet.

### TREM-01 · Baummikrohabitate — Integrate+/EFI-Katalog 2016, deutsche Fassung, 64 codierte Typen
- **Herausgeber:** European Forest Institute (EFI), Regional Office EFICENT, Freiburg — Projekt Integrate+, gefördert vom Bundesministerium für Ernährung und Landwirtschaft (BMEL)
- **Quelle:** http://iplus.efi.int/uploads/Tree%20Microhabitat%20Catalogues/Catalogue_TreeMicrohabitats_DE.pdf (verlinkt von http://iplus.efi.int/documentation.html; englische Fassung unter `…_EN.pdf`)
- **Abgerufen:** 2026-08-09 (HTTP 200, `application/pdf`, 1.832.227 Byte, 16 Seiten)
- **Wörtlich** (Titel und Zitierempfehlung):
  „Katalog der Baummikrohabitate — Referenzliste für Feldaufnahmen"
  „Zitierempfehlung: Kraus, D., Bütler, R., Krumm, F., Lachat, T., Larrieu, L., Mergner, U., Paillet, Y., Rydkvist, T., Schuck, A., und Winter, S., 2016. Katalog der Baummikrohabitate – Referenzliste für Feldaufnahmen. Integrate+ Technical Paper. 16 S."
  „© European Forest Institute, 2016"
- **Wörtlich** (Zweck und Grenzen des Katalogs):
  „Die vorliegende Referenzliste wurde als Begleitmaterial für Marteloskopübungen im Rahmen des Integrate+ Projektes erstellt. Ziel ist es, der forstlichen Praxis, Inventurteams und anderen Interessierten die Erkennung und Beschreibung von Baummikrohabitaten während virtueller Auszeichnungsübugen in Marteloskopen zu erleichtern. Die Liste kann auch als Anschauungsmaterial in der Forstausbildung, als Begleitinformation anderer Schulungen und bei Waldexkursionen Verwendung finden."
  „Baummikrohabitate stellen daher wichtige Substrate und Strukturen für die biologische Artenvielfalt bereit."
- **Wörtlich** (die Hierarchie, wie sie im Dokument als Spalten- bzw. Randbeschriftung geführt wird): oberste Ebene „Saproxylische Mikrohabitate" bzw. „Epixylische Mikrohabitate"; darunter die Kategorien „Höhlen", „Stammverletzungen und Bruchwunden", „Rinde", „Totholz", „Deformierung / Wuchsform", „Epiphyten", „Nester", „Andere"; darunter benannte Gruppen; darunter die codierten Typen.
- **Wörtlich** (alle 64 Typen mit Code und der im Katalog angegebenen Typbezeichnung/Schwelle — vollständig):

  **Saproxylische Mikrohabitate — Höhlen (CV)**
  Gruppe „Spechthöhlen": CV11 „ø = 4 cm" · CV12 „ø = 5 - 6 cm" · CV13 „ø > 10 cm" · CV14 „ø ≥ 10 cm (Fraβlöcher)" · CV15 „Höhlenetagen"
  Gruppe „Stamm- und Mulmhöhlen": CV21 „ø ≥ 10 cm (Bodenkontakt)" · CV22 „ø ≥ 30 cm (Bodenkontakt)" · CV23 „ø ≥ 10 cm" · CV24 „ø ≥ 30 cm" · CV25 „ø ≥ 30 cm / halboffen" · CV26 „ø ≥ 30 cm / hohler Stamm"
  Gruppe „Asthöhlen": CV31 „ø ≥ 5 cm" · CV32 „ø ≥ 10 cm" · CV33 „Hohler Ast ø ≥ 10 cm"
  Gruppe „Dendrotelme und wassergefüllte Baumhöhlungen": CV41 „ø ≥ 3 cm / Stammfuβ" · CV42 „ø ≥ 15 cm / Stammfuβ" · CV43 „ø ≥ 5 cm / Krone" · CV44 „ø ≥ 15 cm / Krone"
  Gruppe „Insektengallerien und Bohrlöcher": CV51 „Gallerie mit einzelnen kleinen Bohrlöchern" · CV52 „Groβe Bohrlöcher ø ≥ 2 cm"

  **Saproxylische Mikrohabitate — Stammverletzungen und Bruchwunden (IN)**
  Gruppe „Freiliegendes Splintholz": IN11 „Freiliegendes Splintholz 25 - 600 cm2, Zerfallsstufe < 3" · IN12 „Freiliegendes Splintholz > 600 cm2, Zerfallsstufe < 3" · IN13 „Freiliegendes Splintholz 25 - 600 cm2, Zerfallsstufe = 3" · IN14 „Freiliegendes Splintholz > 600 cm2, Zerfallsstufe = 3"
  Gruppe „Freiliegendes Kernholz / Stamm- und Kronenbruch": IN21 „Stammbruch, ø ≥ 20 cm an der Bruchstelle" · IN22 „Kronenbruch / Zwieselabbruch, Freiliegendes Kernholz ≥ 300 cm²" · IN23 „Starkastabbruch, ø ≥ 20 cm an der Bruchstelle" · IN24 „Zersplitterter Stamm, ø ≥ 20 cm an der Bruchstelle"
  Gruppe „Risse und Spalten": IN31 „Länge ≥ 30 cm; Breite > 1 cm; Tiefe > 10 cm" · IN32 „Länge ≥ 100 cm; Breite > 1 cm; Tiefe > 10 cm" · IN33 „Blitzrinne" · IN34 „Brandnarbe, ≥ 600 cm²"

  **Saproxylische Mikrohabitate — Rinde (BA)**
  Gruppe „Rindentaschen": BA11 „Rindentaschen, Breite > 1 cm; Tiefe > 10 cm; Höhe > 10 cm" · BA12 „Rindentaschen mit Mulm, Breite > 1 cm; Tiefe > 10 cm; Höhe > 10 cm"
  Gruppe „Rindenstruktur": BA21 „Grobe Rindenstruktur"

  **Saproxylische Mikrohabitate — Totholz (DE)**
  Gruppe „Totäste / Kronentothholz": DE11 „ø 10 - 20 cm, ≥ 50 cm, besonnt" · DE12 „ø > 20 cm, ≥ 50 cm, besonnt" · DE13 „ø 10 - 20 cm, ≥ 50 cm, nicht besonnt" · DE14 „ø > 20 cm, ≥ 50 cm, nicht besonnt" · DE15 „Abgestorbene Kronenspitze, ø ≥ 10 cm"

  **Epixylische Mikrohabitate — Deformierung / Wuchsform (GR)**
  Gruppe „Stammfuβhöhlen": GR11 „ø ≥ 5 cm" · GR12 „ø ≥ 10 cm" · GR13 „Stammspalte, Länge ≥ 30 cm"
  Gruppe „Hexenbesen": GR21 „Hexenbesen, ø > 50 cm" · GR22 „Wasserreisser"
  Gruppe „Krebse und Maserknollen": GR31 „Krebsartiges Wachstum, ø > 20 cm" · GR32 „Krebs im Zerfallsstadium, ø > 20 cm"

  **Epixylische Mikrohabitate — Epiphyten (EP)**
  Gruppe „Pilzfruchtkörper": EP11 „Einjährige Porlinge, ø > 5cm" · EP12 „Mehrjährige Porlinge, ø > 10 cm" · EP13 „Ständerpilze und Champignonartige, ø > 5 cm" · EP14 „Groβe Ascomyceten (Schlauchpilze), ø > 5 cm"
  Gruppe „Myxomyceten": EP21 „Myxomyzeten (Schleimpilze), ø > 5 cm"
  Gruppe „Epiphytische Krypto- und Phanerogame": EP31 „Epiphytische Moose, Bedeckungsgrad > 25 %" · EP32 „Epiphytische Blatt- und Strauchflechten, Bedeckungsgrad > 25 %" · EP33 „Lianen, Bedeckungsgrad > 25 %" · EP34 „Epiphytische Farne, > 5 Farnwedel" · EP35 „Misteln"

  **Epixylische Mikrohabitate — Nester (NE)**
  NE11 „Nester gröβerer Wirbeltiere, ø > 80 cm" · NE12 „Nester kleiner Wirbeltiere, ø > 10 cm" · NE21 „Nester wirbelloser Tiere"

  **Epixylische Mikrohabitate — Andere (OT)**
  Gruppe „Saft- und Harzfluβ": OT11 „Saftfluβ, > 50 cm" · OT12 „Harzfluβ und Harztaschen, > 50 cm"
  Gruppe „Mikroböden": OT21 „Mikroboden (Krone)" · OT22 „Mikroboden (Rinde)"

- **Wörtlich** (ausgewählte Typbeschreibungen, weil sie die Abgrenzung tragen):
  CV13: „Spechthöhlen am Stamm weisen auf Dryocopus martius als Bewohner hin. Der Höhleneingang ist > 10 cm im Durchmesser, wobei dieser im Höhleninneren größer ist. … Die meisten Höhlenbäume haben einen BHD von mehr als 40 cm, was ein langes Bestehen der Höhlen zur Folge hat (20 bis 30 Jahre)."
  CV15: „Mindestens drei im Baumstamm verbundene Spechtbruthöhlen. Falls das nicht beobachtet werden kann, sollten drei Hohlraumöffnungen innerhalb von zwei Metern sichtbar sein."
  CV21/CV22: „Baumhöhle mit Mulm und Bodenkontakt, was das Eindringen von Bodenfeuchte in den Hohlraum erlaubt. Der Eingang zur Höhle kann auch höher am Stamm liegen."
  CV41–CV44: „Eingangs -und Innendurchmesser der Baumhöhlung sind identisch. Topfförmige Wölbung, die sich bei Niederschlag mit Wasser füllt und anschließend wieder austrocknen kann."
  GR11–GR12: „Natürlicher Hohlraum am Wurzelanlauf, der sich durch den Wuchs der Baumwurzeln gebildet hat. Kann dicht mit Moos bedeckt sein. Keine Verletzung oder Faulhöhle."
  NE11: „Nester, die von großen Raubvögeln (Adler, Schwarz- oder Weißstorch, Graureiher) als Brut- und Schlafplatz angelegt wurden. … Sie befinden sich meist auf Ästen, Astgabeln oder Hexenbesen."
  NE21: „Larvennester z.B. des Pinienprozessionsspinners (Thaumetopoea pityocampa), der Holzameise (Lasius fuliginosus) sowie wildlebender Bienen, die sich im Baumstamm einnisten."
  IN31/IN32: „Lange spaltenförmige, den Splint freilegende Verletzung (wird nicht aufgenommen falls die Verletzung bereits vollständig überwallt ist oder dies in den nächsten Jahren absehbar ist)."
- **Deckt in BIOME:**
  - **Antwort auf die Kernfrage: Ja, es gibt eine frei zugängliche, standardisierte Typologie für Habitatstrukturen an Bäumen.** Sie ist vierstufig: Ober­gruppe (saproxylisch/epixylisch) → Kategorie (8) → Gruppe → Typ (64 codierte Einzeltypen).
  - **Feld `trem_code`** mit einer abgeschlossenen Liste von **64** Werten (CV11…OT22). Die Codes sind sprachunabhängig und in allen Sprachfassungen des Katalogs identisch — BIOME sollte den Code speichern und die Bezeichnung lokalisieren.
  - **Feld `trem_kategorie`** mit genau acht Werten: Höhlen (CV), Stammverletzungen und Bruchwunden (IN), Rinde (BA), Totholz (DE), Deformierung / Wuchsform (GR), Epiphyten (EP), Nester (NE), Andere (OT).
  - **Aufnahmeschwellen sind Teil der Typdefinition, nicht Zusatzinfo.** Ein Erfassungsformular muss die Schwelle je Typ anzeigen (z. B. „ø ≥ 30 cm" bei CV22), sonst sind die Daten zwischen Erfassenden nicht vergleichbar.
  - **Der Zerfallsgrad ist bei IN11–IN14 typbildend** („Zerfallsstufe < 3" vs. „= 3"). BIOME braucht für diese Typen ein Feld Zerfallsstufe.
  - **Besonnung ist bei DE11–DE14 typbildend** (`besonnt` / `nicht besonnt`) — zwei Ausprägungen, sonst nichts.
  - **Anschluss an das Recht:** Höhlen (CV), Nester (NE) und Rindentaschen (BA1) sind potenzielle „Fortpflanzungs- oder Ruhestätten" im Sinne von § 44 Abs. 1 Nr. 3 BNatSchG (BNAT-02). Diese Verknüpfung ist eine BIOME-Setzung; der Katalog stellt sie nicht her.
- **Deckt ausdrücklich nicht:**
  - **Normcharakter.** Der Katalog bezeichnet sich als „Referenzliste für Feldaufnahmen" und „Begleitmaterial für Marteloskopübungen". Er ist keine Norm und keine Erhebungsvorschrift.
  - **Stadtbäume.** Der Text argumentiert durchgehend über Wald („Naturwälder", „Wirtschaftswald", „Waldbewirtschaftung"). Eine Übertragung auf Straßen- und Anlagenbäume ist durch diese Quelle nicht gedeckt.
  - Ein Erhebungsdesign: Bezugsfläche, Stichprobe, Beobachterzahl, Wiederholung — nichts davon steht im Katalog.
  - Eine Gewichtung oder Bewertung („Habitatwert"). Der Katalog zählt Typen auf, er bewertet sie nicht.
  - Die Illustrationen und Fotos. Sie sind Teil des PDF, aber urheberrechtlich gesondert („Illustrationen: Lisa Apfelbacher; Fotos: Daniel Kraus") und dürfen nicht ohne Klärung in BIOME übernommen werden.

### TREM-02 · Baummikrohabitate — WSL Field Guide 2024 (Larrieu-Typologie), 7 Formen / 17 Gruppen / 52 Typen mit Mindestgrößen
- **Herausgeber:** Eidgenössische Forschungsanstalt für Wald, Schnee und Landschaft WSL, Birmensdorf — „© Swiss Federal Institute for Forest, Snow and Landscape Research WSL, 2024"
- **Quelle:** Landingpage https://www.wsl.ch/en/publications/field-guide-to-tree-related-microhabitats-2nd-ed/ (Kurz-URL `wsl.ch/fg-trems`, HTTP 200) · PDF https://www.dora.lib4ri.ch/wsl/dload/wsl:36965/PDF/ (identisch: `…/islandora/object/wsl:36965/datastream/PDF/Trems-Field-Guide.pdf`)
- **Abgerufen:** 2026-08-09 (HTTP 200, `application/pdf`, 12.377.767 Byte, 68 Seiten)
- **Wörtlich** (Titel und Zitierempfehlung):
  „Field Guide to Tree-related Microhabitats — Descriptions and size limits for their inventory in temperate and Mediterranean forests"
  „Bütler R., Lachat T., Krumm F., Kraus D., Larrieu L. (2024) Field Guide to Tree-related Microhabitats. Descriptions and size limits for their inventory in temperate and Mediterranean forests. Birmensdorf, Swiss Federal Institute for Forest, Snow and Landscape Research WSL. 64 p. Second, revised edition."
  „This guidebook was originally published as an annex to: Bütler R., Lachat T., Krumm F., Kraus D., Larrieu L. (2020) Know, protect and promote habitat trees. WSL Fact Sheet 64: 12 p."
- **Wörtlich** (Definition eines TreM, vollständig):
  „A tree-related microhabitat (abbreviated as TreM) is a morphological feature present on a tree, which is used by sometimes highly specialised species during at least one part of their life cycle. These features may serve as shelters, breeding spots, or crucial hibernation or feeding places for thousands of species. Trees bearing at least one TreM are called habitat trees (Fig. 1). Various biotic and abiotic events can create TreMs: for example, a falling tree can injure the tree bark, snow can break off a tree top, fire can create fire scars, and a woodpecker can excavate a breeding cavity in the trunk. For some TreMs, such as vertebrate nests and witches' brooms, the tree is merely a physical support. Only morphological features that are known to have a direct link with one or more associated species are classified as TreMs (Larrieu et al. 2018)."
- **Wörtlich** (Umfang und Hierarchie):
  „This field guide describes 52 TreMs: 47 according to Larrieu et al. (2018) and 5 additional ones identified in this work. These microhabitats can be categorised into 17 groups, with these groups falling within 7 overarching forms. The guide also indicates recommended minimum inventory sizes for each TreM in temperate and Mediterranean forests and gives information about the TreM's frequency of occurrence and its replacement rate in the stand."
- **Wörtlich** (die sieben Formen und ihre Gruppen, vollständig aus dem Abschnitt „Tree-related microhabitat forms"):
  „Cavities: holes or sheltered spots in the tree, dry or wet, with or without tree-hole mould, located on the trunk, in the crown or at the root collar. – Woodpecker breeding cavity: cavity excavated by a woodpecker for nesting – Rot-hole: cavity containing tree-hole mould (a mixture of decomposing wood, animal excretions and remains) – Insect galleries: holes and galleries excavated by saproxylic insect larvae – Concavity: hole or hollow in the wood, either wet or dry, or a sheltered spot with no mould and which was not excavated by insect activity"
  „Injuries and exposed wood: sapwood or heartwood is exposed due to bark loss, splitting or breakage. – Exposed sapwood: bark loss has exposed the sapwood only – Exposed sapwood and heartwood: breakage or splitting has exposed both sapwood and heartwood"
  „Crown deadwood: deadwood located in the crown of the tree."
  „Excrescences: Excrescences caused by a reaction of the tree to light or a bacterial, fungal or viral attack. – Twig tangle: excrescence forming a dense packet of small twigs – Gall: a deformity of a tree organ caused by a parasitic attack – Burr and canker: ball-shaped excrescences of more or less dense woody material"
  „Fungal fruiting bodies and slime moulds: the reproductive organs of saproxylic fungi or slime mould plasmodia, lasting at least several weeks. – Perennial fungal fruiting bodies: the fruiting bodies of saproxylic fungi that develop over several years – Ephemeral fungal fruiting bodies and slime moulds: the fruiting bodies of saproxylic fungi that develop over only one year, or slime mould plasmodia"
  „Epiphytic and epixylic structures: structures or living organisms that use the tree mainly as a support. – Epiphytic and parasitic cryptogams and phanerogams: vascular plants, mosses and lichens that use the tree as a physical support – Nests: vertebrate or invertebrate nests (excluding woodpecker breeding cavities) placed in the tree or in a cavity – Microsoil: a small amount of newly-created soil originating from the decomposition of organic matter from twigs, leaves, bark or mosses – Alluvial deposit: a clay, silt, or other deposit on the tree trunk caused by flooding"
  „Exudates: sap run or resinosis."
- **Wörtlich** (alle 52 Typen mit laufender Nummer, Bezeichnung und dem Feld „Minimum size" — vollständig; Gruppenzuordnung aus den Seitenregistern des Führers):

  | Nr. | Form | Gruppe | Typ (wörtlich) | „Minimum size" (wörtlich) |
  |---|---|---|---|---|
  | 1 | Cavities | Woodpecker breeding cavities | Small woodpecker breeding cavity (ø < 4 cm) | Cavity entrance ø < 4 cm |
  | 2 | Cavities | Woodpecker breeding cavities | Medium-sized woodpecker breeding cavity | Cavity entrance ø 4–7 cm |
  | 3 | Cavities | Woodpecker breeding cavities | Large woodpecker breeding cavity (ø > 10 cm) | Cavity entrance ø > 10 cm |
  | 4 | Cavities | Woodpecker breeding cavities | Woodpecker „Flute" (breeding cavity string) | ≥ 3 cavities on one line; cavity entrance ø > 3 cm |
  | 5 | Cavities | Rot-holes | Trunk-base rot-hole (closed top, ground contact) | Cavity entrance ø > 10 cm |
  | 6 | Cavities | Rot-holes | Trunk rot-hole (closed top, no ground contact) | Cavity entrance ø > 10 cm |
  | 7 | Cavities | Rot-holes | Semi-open trunk rot-hole | Cavity entrance ø > 30 cm (experts' threshold) |
  | 8 | Cavities | Rot-holes | Chimney trunk-base rot-hole (ground contact) | Cavity entrance ø > 30 cm (experts' threshold) |
  | 9 | Cavities | Rot-holes | Chimney trunk rot-hole (no ground contact) | Cavity entrance ø > 30 cm (experts' threshold) |
  | 10 | Cavities | Rot-holes | Hollow branch | Cavity entrance ø > 10 cm (experts' threshold) |
  | 11 | Cavities | Insect galleries | Insect galleries and bore holes | Bore hole ø > 2 cm or multiple smaller bore holes |
  | 12 | Cavities | Concavities | Dendrotelm | Opening ø > 15 cm |
  | 13 | Cavities | Concavities | Large woodpecker foraging excavation | Depth > 10 cm; opening ø > 10 cm |
  | 14 | Cavities | Concavities | Bark-lined trunk concavity | Depth > 10 cm; opening ø > 10 cm |
  | 15 | Cavities | Concavities | Buttress-root concavity | Opening > 10 cm; depth > 10 cm |
  | 16 | Injuries and exposed wood | Exposed sapwood | Bark loss | Surface > 300 cm² (A5; experts' threshold) |
  | 17 | Injuries and exposed wood | Exposed sapwood | Fire scar | Surface > 600 cm² (A4; experts' threshold) |
  | 18 | Injuries and exposed wood | Exposed sapwood | Bark shelter | Space between bark and sapwood > 1 cm |
  | 19 | Injuries and exposed wood | Exposed sapwood | Bark pocket | Space between bark and sapwood > 1 cm |
  | 20 | Injuries and exposed wood | Exposed sapwood and heartwood | Stem breakage | Stem ø > 20 cm at breakage (experts' threshold) |
  | 21 | Injuries and exposed wood | Exposed sapwood and heartwood | Limb breakage | Exposed surface > 300 cm² (A5; experts' threshold) |
  | 22 | Injuries and exposed wood | Exposed sapwood and heartwood | Crack | Length > 30 cm; width > 1 cm; depth > 10 cm |
  | 23 | Injuries and exposed wood | Exposed sapwood and heartwood | Lightning scar | Length > 30 cm; width > 1 cm; depth > 10 cm |
  | 24 | Injuries and exposed wood | Exposed sapwood and heartwood | Fork split at the intersection | Length > 30 cm (experts' threshold) |
  | 25 | Injuries and exposed wood | Exposed sapwood and heartwood | Trunk gnawed by beavers | surface > 300 cm2 (A5; experts' threshold) |
  | 26 | Crown deadwood | Crown deadwood | Dead branches | Branch ø > 10 cm, or branch ø > 3 cm plus > 10 % |
  | 27 | Crown deadwood | Crown deadwood | Dead top | ø >10 cm at the base (experts' threshold) |
  | 28 | Crown deadwood | Crown deadwood | Remnants of a broken limb | Branch ø > 20 cm at the break, stub length > 50 cm |
  | 29 | Excrescences | Twig tangles | Witches' broom | ø > 50 cm (experts' threshold) |
  | 30 | Excrescences | Twig tangles | Epicormic shoots | > 5 shoots (experts' threshold) |
  | 31 | Excrescences | Galls | Galls (DM) | > 20 galls (experts' threshold) |
  | 32 | Excrescences | Burrs and cankers | Burr | ø > 20 cm (experts' threshold) |
  | 33 | Excrescences | Burrs and cankers | Canker | ø > 20 cm or covering a large part of the trunk |
  | 34 | Fungal fruiting bodies and slime moulds | Perennial fungal fruiting bodies | Perennial polypore | ø > 5 cm (experts' threshold) |
  | 35 | Fungal fruiting bodies and slime moulds | Ephemeral fungal fruiting bodies and slime moulds | Annual polypore | ø > 5 cm or group of > 10 fruiting bodies (experts' …) |
  | 36 | Fungal fruiting bodies and slime moulds | Ephemeral fungal fruiting bodies and slime moulds | Pulpy agaric | ø > 5 cm or group of > 10 fruiting bodies (experts' …) |
  | 37 | Fungal fruiting bodies and slime moulds | Ephemeral fungal fruiting bodies and slime moulds | Corticoid fungi (crust fungi) (DM) | > 50 cm² (experts' threshold) |
  | 38 | Fungal fruiting bodies and slime moulds | Ephemeral fungal fruiting bodies and slime moulds | Large pyrenomycetoid fungi | Fruiting body ø > 3 cm or group covering > 100 cm2 |
  | 39 | Fungal fruiting bodies and slime moulds | Ephemeral fungal fruiting bodies and slime moulds | Myxomycetes (slime moulds) (DM) | ø > 5 cm (experts' threshold) |
  | 40 | Epiphytic and epixylic structures | Epiphytic and parasitic crypto- and phanerogams | Bryophytes (mosses and liverworts) | > 10 % of the trunk is covered (experts' threshold) |
  | 41 | Epiphytic and epixylic structures | Epiphytic and parasitic crypto- and phanerogams | Foliose and fruticose lichens | > 10 % of the trunk is covered, thickness > 1 cm |
  | 42 | Epiphytic and epixylic structures | Epiphytic and parasitic crypto- and phanerogams | Ivy and lianas (woody vines) | > 10 % of the trunk is covered (experts' threshold) |
  | 43 | Epiphytic and epixylic structures | Epiphytic and parasitic crypto- and phanerogams | Ferns | > 5 fronds (experts' threshold) |
  | 44 | Epiphytic and epixylic structures | Epiphytic and parasitic crypto- and phanerogams | Mistletoe | ø > 20 cm for Viscum spp. and Loranthus spp. |
  | 45 | Epiphytic and epixylic structures | Nests | Vertebrate nest | ø > 10 cm |
  | 46 | Epiphytic and epixylic structures | Nests | Invertebrate nest (DM) | Presence (direct observation or associated insects) |
  | 47 | Epiphytic and epixylic structures | Microsoils | Bark microsoil (DM) | Presence (direct observation or fungi; experts' …) |
  | 48 | Epiphytic and epixylic structures | Microsoils | Inter-bark microsoil (DM) | presence of humus on at least 300 cm² A5/P5 |
  | 49 | Epiphytic and epixylic structures | Microsoils | Crown microsoil | Presence (experts' threshold) |
  | 50 | Epiphytic and epixylic structures | Alluvial deposits | Clay or silt deposit | surface > 600 cm² (A4 sheet of paper; experts' …) |
  | 51 | Exudates | Exudates | Sap run | Length > 10 cm (experts' threshold) |
  | 52 | Exudates | Exudates | Heavy resinosis | Length > 10 cm (experts' threshold) |

- **Wörtlich** (die Legenden, die jeden Eintrag begleiten):
  „DM stands for „difficult to monitor" and signifies that this TreM type is difficult to monitor in a routine inventory, due to its small size, its location, or its sporadic incidence."
  „Natural forest: No forestry activity (e.g. harvesting, thinning, planting) for at least 100 years." · „Managed forest: Ongoing or past forestry activities over the last 100 years."
  „Slow replacement rate in the stand: This type of tree-related microhabitat either takes a very long time to develop (for example, a rot-hole developing from an injury left by a broken-off branch) or is linked to rare, random events (lightning strikes, for example)." · „Rapid replacement rate in the stand: This type of tree-related microhabitat is generated by frequently occurring events …"
  „Minimum size: Minimum size required for the tree-related microhabitat to be recorded in a survey. Certain size thresholds are related to the ecological requirements of the associated species. When these thresholds are unknown, the indicated values were defined by experts in order to reduce observer effect as much as possible („experts' threshold")."
  „Frequency: Frequency of occurrence of the microhabitat on either living or dead trees. … The frequency values indicated are calculated from a European database and may differ at the local level."
  „Associated species: Species or species groups with a close relationship to the associated tree-related microhabitat, according to at least one reference in the scientific literature or based on the authors' own observations. The list below is not exhaustive and the species mentioned should be taken as examples."
- **Wörtlich** (die fünf Zersetzungsgrade, weil sie mehrere Typen definieren):
  „Generally, five wood decay stages are distinguished:"
  „Stage 1: Current-year deadwood; the wood is very hard and shows little or no alteration. All of the bark is still well attached."
  „Stage 2: The wood is hard and only slightly altered; a knife blade will penetrate the wood with difficulty (<1 cm), even parallel to the grain. Virtually all the bark is intact, though it may no longer adhere very well."
  „Stage 3: The wood shows clear signs of decay and the surface has become soft or spongy; a knife will penetrate from one to several cms, parallel to the grain. The bark has partly or mostly fallen off (except for certain species, e.g. beech). The piece of deadwood has not lost any of its initial volume."
  „Stage 4: The wood has decayed considerably; a knife will penetrate to the hilt, at least in some places. There is no more (or very little) remaining bark. The piece of deadwood has lost some of its initial volume."
  „Stage 5: The wood has lost its structure and is easily scattered with the foot. Remnants contain saproxylic and soil-dwelling organisms (for example, earthworms). An in-depth inspection is necessary to identify the tree species."
  „Saproxylic species: a species that depends on senescent trees, decomposing wood or other saproxylic species for at least a part of its life cycle (from the Greek words „sapros" = rotten, and „xylon" = wood)."
- **Deckt in BIOME:**
  - **Dies ist die aktuellere und feiner belegte der beiden freien Typologien** und sollte die Leittypologie sein: dreistufig `form` (7) → `group` (17) → `type` (52), plus je Typ eine **explizite Aufnahmeschwelle**.
  - **Feld `habitatbaum` (Boolean) ist definiert:** „Trees bearing at least one TreM are called habitat trees." Ein Baum wird zum Habitatbaum, sobald **ein** TreM oberhalb seiner Mindestgröße erfasst ist. Diese Ableitung darf BIOME automatisch rechnen.
  - **Feld `trem_typ`** mit 52 Werten; **Feld `trem_form`** mit exakt 7 Werten: Cavities, Injuries and exposed wood, Crown deadwood, Excrescences, Fungal fruiting bodies and slime moulds, Epiphytic and epixylic structures, Exudates.
  - **Die Mindestgrößen sind Aufnahmeschwellen, keine Messwerte.** Ein TreM unterhalb der Schwelle wird **nicht** erfasst. BIOME muss die Schwelle im Formular anzeigen und darf sie nicht als Pflichtmesswert erzwingen.
  - **Flag `schwelle_herkunft`:** viele Schwellen tragen wörtlich den Zusatz „(experts' threshold)" — sie sind Konvention zur Reduktion des Beobachtereffekts, nicht ökologisch hergeleitet. BIOME sollte das kenntlich machen, weil es die Belastbarkeit der Zahl bestimmt.
  - **Flag `dm` (difficult to monitor)** für die sechs so gekennzeichneten Typen (31, 37, 39, 46, 47, 48). Bei einer Routineerhebung darf ihr Fehlen nicht als Abwesenheit gewertet werden.
  - **Feld `zerfallsstufe` mit fünf wörtlich definierten Stufen** und einer nachvollziehbaren Feldmethode (Messerprobe parallel zur Faser). Das ist dieselbe Skala, auf die TREM-01 mit „Zerfallsstufe < 3" / „= 3" verweist — damit sind die Integrate+-Typen IN11–IN14 erst operationalisierbar.
  - **Bezugsgrößen sind benannt und praxistauglich:** 300 cm² = A5, 600 cm² = A4. Diese Gleichsetzung steht wörtlich im Führer und darf als Erfassungshilfe in BIOME angezeigt werden.
  - **Abgrenzung zu Nestern:** „Nests: vertebrate or invertebrate nests (excluding woodpecker breeding cavities)" — Spechthöhlen zählen ausdrücklich **nicht** als Nest. Doppelzählung ist damit ausgeschlossen.
  - **Verhältnis zu TREM-01:** Die 64 Codes von 2016 und die 52 Typen von 2024 sind **zwei verschiedene Systeme**. Eine Umschlüsselung liegt nicht vor und darf nicht erfunden werden. BIOME muss sich für eines entscheiden und das Feld entsprechend benennen.
- **Deckt ausdrücklich nicht:**
  - **Stadt- und Straßenbäume.** Der Untertitel lautet „for their inventory in temperate and Mediterranean **forests**". Die Häufigkeitsangaben stammen aus einer europäischen Waldbestandsdatenbank.
  - Eine Umrechnung in einen Habitatwert, eine Punktzahl oder eine Naturschutzbewertung.
  - Ein Stichproben- oder Aufnahmedesign (Flächengröße, Beobachterzahl, Wiederholrhythmus).
  - Eine deutsche Fassung dieser 2. Auflage. Der abgerufene Führer ist englisch; über `iplus.efi.int` liegt eine deutsche Fassung nur für den älteren Katalog von 2016 vor (TREM-01). Die deutschen Typbezeichnungen der 52er-Typologie sind hier **nicht** belegt.
  - Die zugrunde liegende Primärpublikation Larrieu et al. (2018) — siehe „Nicht zugänglich".

### VOG-01 · Brutzeitcodes (EOAC-Atlascodes) — vollständige Liste, deutsch und englisch
- **Herausgeber:** Wahl, J., M. Busch, R. Dröschmeister, C. König, K. Koffijberg, T. Langgemach, C. Sudfeldt & S. Trautmann (2020): „Vögel in Deutschland – Erfassung von Brutvögeln." DDA, BfN, LAG VSW, Münster. ISBN 978-3-9819703-1-9
- **Quelle:** https://www.bfn.de/sites/default/files/BfN/service/Dokumente/vid-2019_-_erfassung_von_brutvoegeln.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200, `application/pdf`, 23 Seiten)
- **Wörtlich** (Nutzungshinweis im Impressum — deshalb ist die Quelle hier zitierbar):
  „„Vögel in Deutschland – Erfassung von Brutvögeln" steht allen Interessierten zum kostenlosen Download auf den Internetseiten des DDA (www.dda-web.de) und des BfN (www.bfn.de) zur Verfügung."
  „Das Werk einschließlich aller seiner Teile ist urheberrechtlich geschützt. Jede Verwertung außerhalb der engen Grenzen des Urheberrechtsgesetzes ist ohne Zustimmung der Herausgeber unzulässig und strafbar."
- **Wörtlich** (Einleitung zur Tabelle):
  „Brutzeitcodes (auch als „Atlascodes" bezeichnet) dienen der Kategorisierung der Verhaltensweisen von Vögeln während der Brutzeit. Sie wurden vom European Ornithological Atlas Committee (EOAC) entwickelt und sind europaweit kompatibel. Sie werden den drei Kategorien „mögliches" (A), „wahrscheinliches" (B) und „sicheres Brüten" (C) zugeordnet."
  „Der Code E99 ist keiner dieser Kategorien zugeordnet. Er wurde in der Schweiz eingeführt (und mit der Etablierung von ornitho.de von uns übernommen), um kontrollierte, aber verwaiste Brutplätze zu codieren."
- **Wörtlich** (die vollständige Tabelle „Brutzeitcode / Breeding / Atlas code — Bedeutung – Meaning", unverändert und in der Reihenfolge der Quelle):
  „A — Mögliches Brüten – Possible breeding"
  „A1 — Art zur Brutzeit im möglichen Bruthabitat festgestellt. – Species observed in breeding season in possible nesting habitat."
  „A2 — Singendes, trommelndes oder balzendes Männchen zur Brutzeit im möglichen Bruthabitat festgestellt. – Singing, drumming or displaying male present in breeding season in possible nesting habitat."
  „B — Wahrscheinliches Brüten – Likely breeding"
  „B3 — Paar zur Brutzeit in geeignetem Bruthabitat festgestellt. – Pair observed in suitable nesting habitat in breeding season."
  „B4 — Revierverhalten (Gesang, Kämpfe mit Reviernachbarn etc.) an mind. 2 Tagen im Abstand von mind. 7 Tagen am selben Ort lässt ein dauerhaft besetztes Revier vermuten. – Territorial behaviour (song, fights with neighbour etc.) on at least two different days a week or more apart at same place indicating a permanently occupied territory."
  „B5 — Balzverhalten (Männchen und Weibchen) festgestellt. – Courtship and display (male and female) observed."
  „B6 — Altvogel sucht einen wahrscheinlichen Nestplatz auf. – Adult visiting a possible nest-site."
  „B7 — Warn- oder Angstrufe von Altvögeln oder anderes aufgeregtes Verhalten, das auf ein Nest oder Junge in der näheren Umgebung hindeutet. – Agitated behaviour or anxiety calls from adults, indicating a nest or young nearby."
  „B8 — Brutfleck bei gefangenem Altvogel festgestellt. – Brood patch on adult examined in the hand."
  „B9 — Nest- oder Höhlenbau, Anlage einer Nistmulde u. ä. beobachtet. – Nest-building or excavating of nest-hole observed."
  „C — Sicheres Brüten – Confirmed breeding"
  „C10 — Ablenkungsverhalten oder Verleiten (Flügellahmstellen) beobachtet. – Distraction-display or injury-feigning observed."
  „C11a — Benutztes Nest aus der aktuellen Brutperiode gefunden. – Used nest found (occupied within period of survey)."
  „C12 — Eben flügge Jungvögel (Nesthocker) oder Dunenjunge (Nestflüchter) festgestellt. – Recently fledged young (nidicolous species) or downy young (nidifugous species) observed."
  „C13a — Altvögel verlassen oder suchen einen Nestplatz auf. Das Verhalten der Altvögel deutet auf ein besetztes Nest hin, das jedoch nicht eingesehen werden kann (hoch oder in Höhlen gelegene Nester). – Adults entering or leaving nest-site in circumstances indicating occupied nest (including high nests or nestholes, the contents of which cannot be seen) or adult seen incubating."
  „C14a — Altvogel trägt Kotsack von Nestling weg. – Adult carrying faecal sac of young."
  „C14b — Altvogel mit Futter für die nicht-flüggen Jungen beobachtet. – Adult carrying or food for young."
  „C11b — Eischalen geschlüpfter Jungvögel aus der aktuellen Brutperiode gefunden. – Eggshells found (laid within period of survey)."
  „C13b — Nest mit brütendem Altvogel entdeckt. – Nest with breeding adult observed."
  „C15 — Nest mit Eiern entdeckt. – Nest containing eggs."
  „C16 — Junge im Nest gesehen oder gehört. – Nest with young seen or heard."
  „Sicheres Nichtbrüten — E99 — Art trotz Beobachtungsgängen nicht (mehr) festgestellt. – Species not recorded (anymore) despite severals visits to the site."
- **Wörtlich** (ergänzend, ornitho.de-Merkblatt „Hinweise zur Vergabe von Brutzeitcodes", Stand 24.03.2025, https://cdnfiles1.biolovision.net/www.ornitho.de/userfiles/infoblaetter/Merkblatt-Brutzeitcodes-Vergabe-20250324.pdf, abgerufen 2026-08-09, HTTP 200, `application/pdf`):
  „Die Codes wurden vom European Ornithological Atlas Committee (EOAC) entwickelt und sind somit europaweit kompatibel. Sie sind in drei Kategorien untergliedert: • A = mögliches Brüten / Brutzeitfeststellung • B = wahrscheinliches Brüten / Brutverdacht • C = sicheres Brüten / Brutnachweis"
  „Die EOAC-Codes wurden in ornitho.de aus Gründen der Kompatibilität mit anderen ornitho-Systemen erweitert und umfassen insgesamt 20 Differenzierungen."
  „1. Sie müssen keinen Brutzeitcode vergeben! Bitte geben Sie Brutzeitcodes im Zeitraum der automatischen Aufforderung hierzu nur dann an, wenn Sie sich bei den Verhaltensweisen sicher sind …"
  „Bei der Vergabe niedriger Brutzeitcodes, d. h. der Kategorie A sowie der Codes B3, B4 und B5 sollte davon ausgegangen werden können, dass eine Brut in der näheren Umgebung möglich bis wahrscheinlich ist."
  „Bei der Vergabe höherer Brutzeitcodes, d. h. B6 und höher, sollte eine Brut im Umkreis von unter 500 m sicher oder zumindest wahrscheinlich sein. Auch hier gilt für Arten mit großen Revieren ein entsprechend größerer Umkreis (ca. 1 km Umkreis)."
  „Als ungefährer Betrachtungsraum für ein mögliches Brutvorkommen kann bei Arten mit kleineren Revieren ein Umkreis von 1-2 km um die Position des beobachteten Vogels dienen. … Bei Arten mit großen Revieren gilt ein entsprechend größerer Betrachtungsraum (2-3 km Umkreis bzw. ca. 1 TK4)."
  „4. Bitte verwenden Sie keinen Brutzeitcode bei Vogelgruppen, die nicht erkennbar Familien oder Paare sind sowie bei während des Zuges rastenden, ziehenden oder überfliegenden Vögeln ohne Revierverhalten."
  „Wählen Sie den höchsten zu den von Ihnen beobachteten Verhaltensweisen passenden Code aus."
- **Deckt in BIOME:**
  - **Feld `brutzeitcode` mit einer abgeschlossenen, wörtlich belegten Liste von 20 Werten:** A1, A2, B3, B4, B5, B6, B7, B8, B9, C10, C11a, C11b, C12, C13a, C13b, C14a, C14b, C15, C16, E99. Dazu die drei Kategoriecodes A, B, C als Aggregationsebene.
  - **Feld `brutstatus` (Kategorie) mit vier Ausprägungen:** `A` mögliches Brüten / Brutzeitfeststellung, `B` wahrscheinliches Brüten / Brutverdacht, `C` sicheres Brüten / Brutnachweis, `E99` sicheres Nichtbrüten. **E99 gehört ausdrücklich zu keiner der drei Kategorien** und darf nicht als vierte Stufe derselben Skala dargestellt werden.
  - **Die Codes sind nicht lückenlos numerisch und nicht in Nummernreihenfolge sortiert.** In der Quelle folgt auf C14b die Reihe C11b, C13b, C15, C16. Ein BIOME-Sortierschlüssel muss die Reihenfolge der Quelle abbilden, nicht die Zeichenfolge.
  - **Es gibt kein A0 und kein B1/B2/C17.** Die Liste beginnt bei A1 und endet bei C16.
  - **Erfassungsregel „höchster passender Code"** ist wörtlich belegt und darf als Validierungshinweis angezeigt werden.
  - **Zeitliche Definition von B4:** mindestens zwei Tage, Mindestabstand sieben Tage, derselbe Ort. Das ist die einzige Regel der Liste mit einer rechenbaren Bedingung — BIOME kann sie aus zwei Beobachtungen automatisch prüfen.
  - **Belegte Betrachtungsräume:** 1–2 km bei kleinen Revieren, 2–3 km bei großen; ab B6 unter 500 m bzw. ca. 1 km. Diese Zahlen stammen aus dem ornitho.de-Merkblatt und sind dort als Orientierung formuliert, nicht als Norm.
  - **Feld `brutzeitcode` darf leer bleiben.** „Sie müssen keinen Brutzeitcode vergeben!" — ein Pflichtfeld wäre gegen die Quelle.
  - **Anschluss an Darwin Core:** der Brutzeitcode ist kein Darwin-Core-Term. Er gehört in BIOME als eigenes Feld geführt und beim Export in `occurrenceRemarks` oder eine Erweiterung, nicht in `lifeStage` oder `reproductiveCondition`.
- **Deckt ausdrücklich nicht:**
  - Artspezifische Abfragezeiträume („Die Abfragezeiträume sind artspezifisch"). Welche Art wann abgefragt wird, ist über diese Quellen nicht belegt.
  - Die Umrechnung von Brutzeitcodes in Revierzahlen oder Brutpaare. Das leistet erst eine Revierauswertung (VOG-02).
  - Die Originalpublikation des EOAC — nicht abgerufen.

### VOG-02 · Monitoring häufiger Brutvögel (MhB) — der belegte Methodensteckbrief
- **Herausgeber:** Wahl et al. (2020), „Vögel in Deutschland – Erfassung von Brutvögeln", DDA / BfN / LAG VSW
- **Quelle:** https://www.bfn.de/sites/default/files/BfN/service/Dokumente/vid-2019_-_erfassung_von_brutvoegeln.pdf
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** („Steckbrief Monitoring häufiger Brutvögel", vollständig):
  „Erforderliche Kenntnisse — sichere optische und akustische Bestimmung der auf der jeweiligen Probefläche vorkommenden Brutvogelarten"
  „Ausrüstung — Fernglas; Klemmbrett und Schreibzeug oder Smartphone bzw. Tablet"
  „Wo wird erfasst? — auf vorgegebenen 1 km2 großen Probeflächen entlang einer ca. 3 km langen Route"
  „Artenspektrum — alle auf der jeweiligen Probefläche vorkommenden Arten"
  „Anzahl Begehungen — 4 zwischen 10. März und 20. Juni (für die Hochlagen der Alpen gelten abweichende Termine)"
  „Tageszeit — Beginn mit Sonnenaufgang"
  „Jahreszeit — Frühjahr"
  „Dauer einer Erfassung — meist 2 bis 4 Std. zzgl. An- und Abfahrt"
  „Aufbereitung der Daten — Bildung von „Papierrevieren" für alle Brutvogelarten, Zuordnung zu 13 vorgegebenen Nutzungstypen"
  „Vereinbarkeit mit Berufstätigkeit — mittel bis hoch; Kartierung flexibel innerhalb der 4 Begehungszeiträume, die jeweils 20 bis 30 Tage umfassen"
  „Wofür wird's gebraucht? — regionale bis europaweite Trends der Brutvogelbestände; Grundlage für den Vogelschutz, Indikatoren und Forschung"
- **Wörtlich** (die vier Begehungszeiträume, vollständig):
  „Jedes Jahr wird in vier definierten Zeiträumen zwischen dem 10. März und 20. Juni erfasst, d. h. innerhalb der Kernbrutzeit der meisten Vogelarten von der Misteldrossel bis zum Grauschnäpper, die im Fokus des MhB stehen:"
  „Durchgang 1 — 10. bis 31. März" · „Durchgang 2 — 1. bis 30. April" · „Durchgang 3 — 1. bis 20. Mai" · „Durchgang 4 — 21. Mai bis 20. Juni"
- **Wörtlich** (Route und Nutzungstypen):
  „Durch die quadratischen Probeflächen führt eine ca. 3 km lange Route. Der Erstvorschlag für die Route wird vor der ersten Begehung mit der Koordinatorin oder dem Koordinator abgestimmt. Die einmal festgelegte Route sollte nur in zwingenden Fällen geändert werden …"
  „Für jede Probefläche wird im ersten Jahr der Bearbeitung eine Karte mit der Verteilung von Nutzungstypen angelegt, von denen insgesamt 13 unterschieden werden."
- **Wörtlich** (Umfang des Programms):
  „… und bearbeiten jährlich etwa 1.700 Probeflächen." · „Für mehrere hundert Probeflächen suchen wir noch Ehrenamtliche. Der Aufwand zur Teilnahme ist mit vier Begehungen zwischen März und Juni überschaubar."
- **Deckt in BIOME:**
  - **Ein vollständig belegter `samplingProtocol` für Brutvögel** (Anschluss an DWC-01): Bezeichnung „Monitoring häufiger Brutvögel (MhB)", Linienkartierung auf 1-km²-Probefläche entlang einer ca. 3 km langen, über die Jahre konstanten Route.
  - **Ein rechenbarer `samplingEffort`** (Anschluss an DWC-01/DWC-02): 4 Begehungen je Jahr, Dauer je Begehung 2–4 Stunden, Streckenlänge ca. 3 km, Bezugsfläche 1 km². Damit sind `sampleSizeValue`/`sampleSizeUnit` befüllbar (z. B. 1 / „square kilometre" oder 3 / „kilometre").
  - **Feld `begehung_nr` mit vier belegten Zeitfenstern** (10.–31.03., 01.–30.04., 01.–20.05., 21.05.–20.06.). BIOME kann eine Begehung automatisch dem Durchgang zuordnen und Termine außerhalb kennzeichnen.
  - **Feld `tageszeit_beginn`:** „Beginn mit Sonnenaufgang" — die einzige belegte Tageszeitvorgabe.
  - **Feld `papierrevier`:** die Auswertungseinheit heißt wörtlich „Papierrevier" und wird für **alle** Brutvogelarten gebildet. Das ist die belegte Brücke von Einzelbeobachtungen zur Bestandsgröße.
  - **Feld `nutzungstyp`** mit **13** Ausprägungen — die Zahl ist belegt, **die Liste selbst nicht** (siehe unten).
  - **Belegte Größenordnung** des bundesweiten Programms: ca. 1.700 bearbeitete Probeflächen pro Jahr.
- **Deckt ausdrücklich nicht:**
  - **Die 13 Nutzungstypen selbst.** Nur ihre Anzahl steht in der Quelle. Eine BIOME-Auswahlliste „Nutzungstyp (MhB)" ist damit **nicht** belegbar.
  - **Die Regeln der Papierrevierbildung** (wie viele Registrierungen in welchem Abstand ein Revier ergeben). Diese stehen in den „Methodenstandards" (siehe „Nicht zugänglich").
  - Die abweichenden Termine für die Hochlagen der Alpen.
  - Methoden für seltene Brutvögel, Rastvögel, Fledermäuse, Amphibien oder Insekten. Der Steckbrief gilt ausschließlich für das MhB.

### VOG-03 · EBBA2 — europäische Bezugsgrößen für Brutnachweis und Häufigkeit
- **Herausgeber:** European Bird Census Council (EBCC), Second European Breeding Bird Atlas (EBBA2)
- **Quelle:** https://ebba2.info/about/methodology/
- **Abgerufen:** 2026-08-09 (HTTP 200)
- **Wörtlich** (Brutnachweis-Kategorien):
  „BREEDING EVIDENCE — Birds are mobile species and can be observed far from the areas where they reproduce, e.g. as visitors during migration or post-breeding dispersal. Standardised categories to determine whether a species is a possible (A), probable (B) or confirmed (C) breeder in the surveyed area were used for EBBA2. Depending on the characteristics of the observation in the field, it was assigned to a given atlas code, and the maximum atlas code recorded per 50-km square was used in EBBA2 to document the breeding evidence for that species in that square."
- **Wörtlich** (Häufigkeitsklassen):
  „Abundance — Order-of-magnitude estimates of number of breeding pairs per 50-km square were used in EBBA2, categorised on a logarithmic scale in six classes (1–9, 10–99, 100–999, 1,000–9,999, 10,000–99,999 and 100,000–999,999 pairs). … Depending on the characteristics of the species and the data available, three main protocols were used: direct count, statistical inference or expert assessment."
- **Wörtlich** (Raster und Zeitraum):
  „Two grid systems were used in EBBA2, depending on the type and purpose of each map. For breeding evidence, abundance and change maps, the 50-km Universal Transversal Mercator (UTM) grid that was used in EBBA1 was also selected for EBBA2. However, for the EBBA2 modelled maps (a novelty of the second atlas) the current European standard Grid ETRS89-LAEA 10-km grid was employed."
  „The main time frame for EBBA2 fieldwork was the period 2013 to 2017."
  „EBBA2 standardised „timed surveys" were defined as daylight bird surveys of 30–180 minutes conducted on a single day within the breeding period in any of the fieldwork years (2013–17)."
  „The taxonomic level used in this project is the species. EBCC adopted the HBW-BirdLife species checklist for all its projects in 2017, including EBBA2 …"
- **Deckt in BIOME:**
  - **Die Kategorien A / B / C sind europäisch identisch definiert** („possible / probable / confirmed breeder") und decken sich mit VOG-01. Ein BIOME-Feld `brutstatus` mit A/B/C ist damit doppelt belegt, national und europäisch.
  - **Aggregationsregel, wörtlich belegt:** je Bezugsfläche wird der **höchste** Atlascode verwendet („the maximum atlas code recorded per 50-km square"). BIOME darf diese Aggregation so implementieren.
  - **Feld `haeufigkeitsklasse` mit sechs abgeschlossenen, logarithmischen Klassen** in Brutpaaren: 1–9, 10–99, 100–999, 1.000–9.999, 10.000–99.999, 100.000–999.999.
  - **Feld `haeufigkeit_methode` mit drei belegten Ausprägungen:** `direct count`, `statistical inference`, `expert assessment`. Ohne diese Angabe ist eine Bestandszahl nicht bewertbar.
  - **`timed survey` als eigener, definierter Aufnahmetyp:** Tageslicht, 30–180 Minuten, an einem einzigen Tag, innerhalb der Brutzeit. Das ist ein zweiter belegter `samplingProtocol` neben dem MhB — deutlich niedrigschwelliger und für BIOME-Bürgerbeteiligung geeignet.
  - **Rasterbezug:** 50-km-UTM für Nachweis/Häufigkeit, ETRS89-LAEA 10 km für Modellkarten. Für BIOME relevant, weil ETRS89-LAEA das europäische Standardraster ist.
- **Deckt ausdrücklich nicht:**
  - Die Liste der Atlascodes. EBBA2 nennt nur die drei Kategorien; die 20 Einzelcodes sind über VOG-01 belegt, nicht hier.
  - Eine Aussage über Deutschland. EBBA2 ist ein europäischer Atlas mit 50-km-Zellen; auf Stadt- oder Flächenebene ist er ohne Aussagekraft.
  - Die HBW-BirdLife-Checkliste selbst — nicht abgerufen. **Achtung: EBBA2 verwendet damit eine andere Taxonomie als GBIF (GBIF Backbone) und als die deutsche Rote Liste.** Eine Verknüpfung über den wissenschaftlichen Namen ist nicht ohne Prüfung zulässig.

## Nicht zugänglich

| Norm/Quelle | Warum | Status | Was dadurch in BIOME NICHT belegbar ist |
|---|---|---|---|
| **Methodenstandards zur Erfassung der Brutvögel Deutschlands**, 1. überarbeitete Auflage, Südbeck et al. (2025), Hrsg. DDA / LAG VSW / BfN, ISBN 978-3-9819703-3-3, ca. 800 S., Erscheinungsdatum März 2025 | Kostenpflichtiges Druckwerk. Die Produktseite ist abrufbar, der Inhalt nicht: „Preis im Buchhandel: 49,95 €", Bestellung über `schriftenversand@dda-web.de`. Kein PDF-Download angeboten. Die Seite bezeichnet das Werk selbst als „das Referenzwerk für die Datenerhebung und -auswertung von Brutvögeln. Die Standards sind als „rechtssichere" Grundlage im Rahmen von Genehmigungsverfahren gesetzt". Bezugsweg: https://www.dda-web.de/publikationen/mhb | Produktseite HTTP 200; Volltext nicht abrufbar | **Die artspezifischen Erfassungsmethoden, Erfassungszeiträume und Wertungsgrenzen je Brutvogelart.** Ebenso: die Regeln der Papierrevierbildung, die Zahl und Lage der Begehungen je Art, die Kapitel „Zeitaufwand", „Einsatz technischer Hilfsmittel" und „Rechtliche Aspekte für die ornithologische Freilandarbeit", sowie die Artsteckbriefe (Lebensraum, Brutbiologie, Phänologie). Eine BIOME-Auswahlliste „Erfassungsmethode nach Südbeck" ist nicht belegbar. Belegt sind nur die Brutzeitcodes (VOG-01) und der MhB-Steckbrief (VOG-02) über die frei zugängliche BfN/DDA-Broschüre. |
| **Larrieu, L. et al. (2018): „Tree related microhabitats in temperate and Mediterranean European forests: A hierarchical typology for inventory standardization", Ecological Indicators 84: 194–207** | Verlagsseite blockiert. `https://www.sciencedirect.com/science/article/abs/pii/S1470160X17305411` antwortet mit HTTP 403; `https://doi.org/10.1016/j.ecolind.2017.08.051` liefert nur eine 2.745 Byte große Weiterleitungsseite ohne Volltext. | ScienceDirect HTTP 403; DOI-Resolver HTTP 200 ohne Inhalt | Nichts Wesentliches — die Typologie selbst ist über den WSL-Feldführer (TREM-02) frei und wörtlich belegt, der sich ausdrücklich auf Larrieu et al. 2018 stützt. Nicht belegbar bleiben die Herleitung der Typologie, die statistische Absicherung und die Originaltabellen. |
| **Richtlinie „(EU) 2025/1237"**, in WISIA (BFN-01) als geltende Fassung der FFH-Richtlinie geführt | Auf EUR-Lex nicht abrufbar. Getestet: `/legal-content/DE/TXT/?uri=CELEX%3A32025L1237`, `/legal-content/DE/TXT/HTML/?uri=CELEX:32025L1237`, `/legal-content/EN/TXT/?uri=CELEX%3A32025L1237`, `/legal-content/DE/ALL/?uri=CELEX:32025L1237`, `/legal-content/DE/TXT/HTML/?uri=OJ:L_202501237`, `/eli/dir/2025/1237/oj`, `/eli/dir/2025/1237/oj/deu` — jeweils mehrfach mit Pause. | Jeweils **HTTP 202 mit 0 Byte Antwortkörper** | Ob die FFH-Richtlinie 2025 neu gefasst oder kodifiziert wurde, und ob die in EU-01 zitierten Anhangsdefinitionen dadurch ihren Wortlaut geändert haben. **Alle FFH-Zitate in diesem Register stammen aus der konsolidierten Fassung mit Stand 01.07.2013.** Vor einer rechtlichen Verwendung in BIOME ist zu klären, welche Fassung gilt. |
| **Vogelschutzrichtlinie 2009/147/EG, konsolidierte Fassung** (`CELEX:02009L0147-20190626`) | EUR-Lex antwortete mit HTTP 202 und leerem Body. | HTTP 202, 0 Byte | Änderungen der Anhänge nach 2009. EU-02 zitiert ausschließlich die **Originalfassung** von 2009. |
| **FFH-Richtlinie und Vogelschutzrichtlinie: die Anhangslisten als Datenbestand** | Die Listen stehen vollständig im abgerufenen HTML (EU-01, EU-02), wurden hier aber weder ausgezählt noch als strukturierte Datei extrahiert und geprüft. | Text HTTP 200, Extraktion nicht durchgeführt | Eine Artenzahl je Anhang und eine importfertige Artenliste. Beides ist aus den zitierten URLs herstellbar, aber in diesem Register nicht belegt. Sammelangaben („Alle Arten", „spp.", „Alle Arten außer …") müssten dabei gesondert aufgelöst werden. |
| **DDA-Seiten `dda-web.de/voegel/methodenstandards`, `dda-web.de/voegel/quantitative_kriterien`, `dda-web.de/voegel/erfassungstermine`** | Antworten mit HTTP 200 und 47–58 KB HTML, das aber ausschließlich Navigation und Footer enthält; der fachliche Inhalt wird clientseitig nachgeladen und ist im ausgelieferten HTML nicht vorhanden. | HTTP 200, Inhalt leer | **„Quantitative Kriterien & Schwellenwerte" und „Erfassungstermine & Wertungsgrenzen"** — also genau die Zahlen, ab wann ein Nachweis als Brutvorkommen zählt. Für BIOME nicht belegbar. |
| **DDA-Seite `dda-web.de/monitoring/mhb/brutzeitcodes`** | HTTP 200; der Einleitungstext ist im HTML enthalten und wurde für VOG-01 verwendet, die **Codetabelle selbst steht nicht im HTML** (keine `<table>`, keine Codes außer „A6", „B8", „E99" in Fließtext). Sie wird offenbar als Grafik oder clientseitig gerendert. | HTTP 200, Tabelle fehlt | Nichts — die vollständige Tabelle ist über die BfN-Broschüre (VOG-01) belegt. Hier nur notiert, damit ein leeres HTML nicht als fehlende Quelle fehlgedeutet wird. |
| **GBIF-API-Dokumentation `techdocs.gbif.org/en/openapi/v1/species` und `/v1/occurrence`** | HTTP 200, aber nur ca. 9,8 KB JavaScript-Hülle mit Navigation („GBIF API reference / Species API") ohne Endpunktbeschreibungen. Zusätzlich getestete OpenAPI-Pfade `api.gbif.org/v1/openapi/species.json`, `techdocs.gbif.org/openapi/species.json`, `techdocs.gbif.org/en/openapi/species.json` — alle HTTP 404. | HTTP 200 (leer) bzw. HTTP 404 | Eine herausgeberseitige Beschreibung der Endpunkte, ihrer Parameter und ihrer Antwortfelder. Alle Aussagen in GBIF-01/GBIF-02 stützen sich deshalb ausschließlich auf eigene, protokollierte Abrufe. |
| **Rote-Liste-Methodikband NaBiV 70/1** (Ludwig et al., Methodik der Gefährdungsanalyse) und die Erweiterungen der Rote-Liste-Autorentagung 2016 / Überarbeitung 2021 | Nicht abgerufen. Auf der Methodikseite nur als Literaturverweis genannt; die Seite hält selbst fest: „Eine zusammenfassende Darstellung der aktuellen Methodik der Gefährdungsanalyse ist in Vorbereitung und soll in der laufenden Reihe veröffentlicht werden." | Nicht abgerufen | **Das Einstufungsschema**, das aus den vier Kriterien (RL-02) die Rote-Liste-Kategorie (RL-01) ableitet, sowie alle quantitativen Klassengrenzen der Kriterienskalen. BIOME darf eine Rote-Liste-Kategorie nicht selbst berechnen. |
| **Bundesartenschutzverordnung (BArtSchV), Anlage 1** | Nicht abgerufen. In WISIA nur als Regelwerkskürzel „[BV] Anhang:1" mit Fußnote sichtbar. | Nicht abgerufen | Die nationale Artenliste, über die Arten zusätzlich zu FFH/VSR streng geschützt werden (§ 7 Abs. 2 Nr. 14 Buchst. c i. V. m. § 54 Abs. 2 BNatSchG). |
| **§§ 45, 67 BNatSchG (Ausnahmen, Befreiungen), § 17 (Verfahren), § 18 (Bauleitplanung), § 34 (FFH-Verträglichkeitsprüfung), Bundeskompensationsverordnung** | Nicht abgerufen; §§ 44 Abs. 5 und 15 Abs. 7 verweisen darauf. | Nicht abgerufen | Der gesamte Genehmigungs- und Ausnahmepfad. BIOME darf zu Ausnahmen, Befreiungen und Verfahrensschritten nichts aussagen. |
| **Landesrechtliche Verlängerung/Verschiebung der Gehölzschnitt-Sperrfrist (§ 39 Abs. 5 Satz 3 BNatSchG), insbesondere für Berlin** | Nicht gesucht. Die Ermächtigung steht wörtlich im Bundesgesetz (BNAT-03), ob und wie Berlin sie genutzt hat, wurde nicht geprüft. | Nicht abgerufen | Der in Berlin tatsächlich geltende Sperrzeitraum. BIOME darf 01.03.–30.09. nur als **bundesrechtlichen Grundfall** anzeigen. |
| **Regionale Rote Listen (Berlin, Brandenburg) für Brutvögel, Säugetiere, Amphibien, Reptilien** | Nicht gesucht. | Nicht abgerufen | Jede Gefährdungsaussage mit Bezugsraum Berlin. RL-03 gilt bundesweit; RL-01 verlangt ausdrücklich die Angabe des Bezugsraums. |
| **Rote Listen der übrigen Wirbeltiergruppen und aller wirbellosen Gruppen** | Auf `rote-liste-zentrum.de` frei verlinkt (u. a. Säugetiere 2020 als `NaBiV_170_2_1_…pdf`, Reptilien 2020, Amphibien 2020, Süßwasserfische 2023, Meeresfische 2025 sowie über 50 Gruppen wirbelloser Tiere), aber nicht ausgewertet. | Verlinkt, HTTP nicht je Datei geprüft | Gefährdungsangaben für alle Artengruppen außer Brutvögeln. Der Bezugsweg ist bekannt und frei — das ist eine Arbeitsaufgabe, keine Zugangslücke. |
| **Deutsche Fassung des WSL-Feldführers 2. Auflage (52 TreM-Typen)** | Nicht gefunden. Über `iplus.efi.int` liegt eine deutsche Fassung nur für den älteren Integrate+-Katalog von 2016 vor (TREM-01); über `dora.lib4ri.ch` wurden die englische Fassung 2024 (`wsl:36965`), eine spanische Fassung 2020 (`wsl:28605`) und der boreale Feldführer 2024 (`wsl:36432`) abgerufen. | Englische Fassung HTTP 200; deutsche Fassung nicht auffindbar | Deutsche Bezeichnungen der 52 Typen und 17 Gruppen. BIOME müsste sie selbst übersetzen — das wäre eine Setzung, kein Beleg. |
| **Bildreihen, Illustrationen und Fotos in TREM-01 und TREM-02** | Im PDF enthalten, aber gesondert urheberrechtlich geschützt („Illustrationen: Lisa Apfelbacher; Fotos: Daniel Kraus"; im WSL-Führer eigener Abschnitt „Photo credits"). | Zugänglich, aber nicht nachnutzbar | Eine Erfassungshilfe mit Bildern in BIOME. Ohne Bildreihe ist die Typansprache im Feld schwer kalibrierbar. |
| **HBW-BirdLife Checklist** (von EBBA2 als Taxonomie verwendet) | Nicht abgerufen. | Nicht abgerufen | Eine geprüfte Zuordnung zwischen EBBA2-Taxonomie, GBIF Backbone und der Taxonomie der deutschen Roten Liste. |
| **ornitho.de als Datenquelle (API, Datenabgabe, Nutzungsbedingungen)** | Nicht untersucht. Auf `dda-web.de` existiert eine Seite „Nutzung von ornitho.de-Daten", sie wurde nicht abgerufen. | Nicht abgerufen | Ob und wie BIOME Beobachtungsdaten aus ornitho.de beziehen darf. |
| **Erhaltungszustands-Bewertung der FFH-Berichterstattung (Ampel FV/U1/U2/XX)** | Nicht gesucht. Artikel 1 Buchst. i der FFH-Richtlinie definiert nur „günstig" (EU-01). | Nicht abgerufen | Eine vierstufige Erhaltungszustands-Skala in BIOME. Belegt ist bisher nur die binäre Aussage „günstig / nicht günstig". |

## Offene Fragen an Malte

- **Welche TreM-Typologie wird die Leittypologie?** Es liegen zwei frei belegte, zueinander **nicht** umschlüsselbare Systeme vor: Integrate+/EFI 2016 mit 64 codierten Typen und deutschen Bezeichnungen (TREM-01) und der WSL-Feldführer 2024 mit 52 Typen, 17 Gruppen, 7 Formen und expliziten Mindestgrößen, aber nur auf Englisch (TREM-02). Meine Empfehlung ist TREM-02 als Leittypologie, weil dort die Aufnahmeschwellen sauber definiert und als „experts' threshold" gekennzeichnet sind — das kostet aber eine eigene deutsche Übersetzung der 52 Typbezeichnungen, die dann eine BIOME-Setzung wäre und im Register als solche stehen müsste. Alternative: TREM-01 als Leittypologie, weil deutsch und codiert, aber ohne die saubere Schwellendokumentation.
- **Beide TreM-Kataloge gelten für den Wald, nicht für Stadtbäume.** Wörtlich: „for their inventory in temperate and Mediterranean **forests**". BIOME arbeitet in Welle 1 mit Berliner Straßen- und Anlagenbäumen. Sollen die Typen dort trotzdem angeboten werden — dann mit sichtbarem Hinweis „Typologie aus dem Waldkontext, für Stadtbäume nicht validiert" — oder brauchen wir dafür eine eigene, dann unbelegte Liste? Ich habe keine frei zugängliche TreM-Typologie für Stadtbäume gefunden.
- **Kauf der Methodenstandards (49,95 €).** Ohne sie bleiben die artspezifischen Erfassungszeiträume, die Wertungsgrenzen und die Regeln der Revierbildung dauerhaft unbelegt — und genau das sind die Zahlen, die eine Brutvogelerhebung in BIOME auswertbar machen würden. Die Herausgeber bezeichnen das Werk selbst als „rechtssichere" Grundlage in Genehmigungsverfahren. Soll ich den Kauf vorbereiten? Zu beachten: „Jede Verwertung außerhalb der engen Grenzen des Urheberrechtsgesetzes ist ohne Zustimmung der Herausgeber unzulässig" — der Inhalt dürfte dann intern zitiert, aber nicht als BIOME-Inhalt ausgeliefert werden.
- **Welche Fassung der FFH-Richtlinie gilt?** WISIA, der Dienst des BfN, führt als Regelwerk „FFH-Richtlinie (EU) 2025/1237". Dieser Rechtsakt war über sieben verschiedene EUR-Lex-Pfade nicht abrufbar (durchgehend HTTP 202, leerer Body). Alle FFH-Zitate hier stammen aus der konsolidierten Fassung vom 01.07.2013. Bevor BIOME irgendeine rechtliche Aussage zu Anhang II/IV trifft, muss geklärt sein, welche Fassung gilt — das ist eine Frage an das BfN (`wisia@bfn.de`), nicht an eine Recherche.
- **Anhang I der Vogelschutzrichtlinie: Quelle festlegen.** WISIA weist bei *Dryocopus martius* nur „VSR Anhang:Art.1" aus, obwohl die Art im abgerufenen Richtlinientext in Anhang I steht. Wenn BIOME „Anhang-I-Art" anzeigt, muss die Liste aus dem Richtlinientext importiert werden — WISIA taugt dafür nachweislich nicht. Soll ich diesen Import als eigene Aufgabe aufsetzen?
- **Wird der Rote-Liste-Status in BIOME gespeichert oder nachgeschlagen?** Der Bundesdatensatz für Brutvögel (RL-03) ist frei, versioniert und mit Taxon-UUIDs versehen — er lässt sich importieren. Der Schutzstatus (WISIA, BFN-01) dagegen ist nur als HTML-Abfrage verfügbar, ohne zugesagte API und mit dem ausdrücklichen Hinweis, dass er nicht verbindlich ist. Sollen wir den Schutzstatus je Art einmalig abfragen und mit Abrufdatum speichern (dann veraltet er), oder live abfragen (dann hängt BIOME an einer undokumentierten URL)?
- **Bezugsraum bei Rote-Liste-Angaben.** RL-03 ist bundesweit. Für Berliner Flächen ist eine bundesweite Kategorie oft irreführend (eine bundesweit ungefährdete Art kann in Berlin verschwunden sein). Soll BIOME ausschließlich die Bundeskategorie anzeigen und den Bezugsraum sichtbar dazuschreiben, oder soll ich nach der Berliner Roten Liste suchen? Ich habe sie bisher nicht gesucht.
- **Gehölzschnitt-Sperrfrist: Landesrecht prüfen.** § 39 Abs. 5 Satz 3 BNatSchG erlaubt den Ländern, den Zeitraum zu erweitern oder um bis zu zwei Wochen zu verschieben. Ob Berlin das getan hat, weiß ich nicht. Solange das offen ist, darf BIOME den Zeitraum 01.03.–30.09. nur als bundesrechtlichen Grundfall beschriften. Soll ich das für Berlin und Brandenburg nachrecherchieren?
- **Zwei Wertelisten für dasselbe, unvermeidlich.** `basisOfRecord` und `occurrenceStatus` haben in Darwin Core und in GBIF unterschiedliche Schreibweisen (`HumanObservation` vs. `HUMAN_OBSERVATION`; `detected`/`notDetected` vs. `PRESENT`/`ABSENT`). BIOME muss sich für eine interne Schreibweise entscheiden und die andere beim Export erzeugen. Ich schlage die GBIF-Schreibweise als interne vor, weil sie eine abgeschlossene, maschinell abrufbare Enumeration ist — die Darwin-Core-Liste ist ausdrücklich nur eine Empfehlung.
- **Aufwandserfassung: Freitext oder Struktur?** Darwin Core sieht `samplingEffort` als Freitext vor („40 trap-nights"). Rechenbar wird der Aufwand nur über `sampleSizeValue` + `sampleSizeUnit`. Soll BIOME beide Felder führen (mehr Aufwand bei der Erfassung, aber auswertbar) oder nur den Freitext (schneller, aber keine Auswertung)? Ohne das strukturierte Paar ist jede spätere Aussage „pro Stunde" oder „pro Hektar" nicht belegbar.
- **Brutzeitcodes als Pflichtfeld?** Die Quelle sagt ausdrücklich „Sie müssen keinen Brutzeitcode vergeben!" und warnt vor zu hohen Codes. Ein Pflichtfeld in BIOME würde Falschangaben erzwingen. Ich schlage vor: optionales Feld mit dem wörtlichen Hinweis aus dem Merkblatt. Einverstanden?
- **Verhältnis Habitatstruktur ↔ Fortpflanzungs-/Ruhestätte.** § 44 Abs. 1 Nr. 3 BNatSchG schützt „Fortpflanzungs- oder Ruhestätten". Die TreM-Kataloge kennen diesen Begriff nicht. Die Zuordnung „Spechthöhle = potenzielle Fortpflanzungsstätte" ist fachlich naheliegend, aber in keiner der abgerufenen Quellen ausgesprochen. Soll BIOME diese Verknüpfung anbieten? Wenn ja, muss sie als BIOME-Setzung gekennzeichnet werden, nicht als Rechtsauskunft.
