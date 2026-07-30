# Plattform-Konzept — Nutzer, Struktur, Reihenfolge

Stand: 2026-07-30 · Grundlage für den Umbau der Oberfläche.

Anlass: Die Oberfläche ist überfrachtet und nicht durchdacht. Dieses Dokument
klärt zuerst, **wer** die Plattform benutzt und **was** diese Leute brauchen,
und leitet die Struktur daraus ab — nicht umgekehrt.

Entscheidungsgrundlage sind Maltes Angaben vom 2026-07-30:
- Heute nutzt **genau eine Person** die Plattform: Malte, während er sie baut.
- Zielgruppen später: **Hausverwaltungen, Grünflächenämter, Stadtplaner,
  Architekturbüros, GaLaBauer.**
- Handy und Desktop sind **gleichwertig**, keines führt.

Was hier als „Vorschlag" steht, ist meine Empfehlung mit Begründung und muss
bestätigt werden. Was als „offen" markiert ist, kann ich nicht entscheiden.

---

## 1 · Der Befund: hier stecken zwei Produkte in einer App

Die 28 Routen zerfallen sauber in zwei Hälften mit völlig verschiedenen
Adressaten:

| | **LUMA-Betrieb** | **BIOME-Plattform** |
|---|---|---|
| Wofür | Die eigene Firma organisieren | Grünflächen verstehen und belegen |
| Routen | `/einsaetze` `/wochenplan` `/jobs` `/tasks` `/pflege` `/time` `/mana` `/team` `/calendar` `/stammdaten` `/drive` | `/map` `/earth` `/explore` `/analyse` `/planning` `/sensors` `/klima` `/portal` |
| Adressat | ausschließlich LUMA selbst | die fünf Zielgruppen |
| Marktlage | umkämpft, viele Anbieter | wenig Vergleichbares |

Die Navigation mischt beides in einer Liste. Das ist die Wurzel der
Überfrachtung — nicht die einzelnen Seiten. Wer die Plattform als
Hausverwaltung öffnet, sieht heute Wochenplanung, Zeitbuchung und
Freelancer-Verwaltung einer Firma, mit der sie nur einen Pflegevertrag hat.

**Die gute Nachricht:** Der Plan für die Trennung existiert schon.
`docs/BIOME_EARTH_PLAN.md` beschreibt BIOME als eigenständige App unter eigener
URL — „Google Earth für Verwaltungen und Grünflächen-Profis". Dieses Konzept
erfindet die Trennung nicht, es zieht sie konsequent durch und hängt ein
Produktbild daran.

**Und der beste Zeitpunkt ist jetzt:** Bei genau einem Nutzer kostet ein
Umbau nichts — keine Migration, keine Schulung, kein Bestandsschutz, niemand
verliert seine gewohnten Wege. Sobald die erste Hausverwaltung täglich damit
arbeitet, ist derselbe Umbau teuer. Diese Freiheit hält nicht lange.

---

## 2 · Die Zielgruppen — und was sie wirklich brauchen

Nicht „grüne Branche", sondern fünf Berufe mit unterschiedlichem Tagesgeschäft.
Für jede Gruppe: was ihr Job ist, was sie deshalb braucht, und was davon schon
existiert.

### 2.1 Hausverwaltungen

**Job:** Gebäude für Eigentümer verwalten. Grünfläche ist Kostenposten und
Haftungsthema, kein Interesse an sich.
**Tag:** Beschwerden, Budgets, Eigentümerversammlungen, Belege beschaffen.
**Braucht:** Nachweis, dass die Pflege stattgefunden hat; Kosten
nachvollziehbar; Zustand der eigenen Objekte; etwas Vorzeigbares für die
Eigentümerversammlung.
**Zahlt für:** weniger Rückfragen und einen Beleg, der einer kritischen
Versammlung standhält.
**Existiert schon:** Kundenportal mit Leistungsnachweis (produktiv), Fotos,
Klima-Steckbrief, Bio-Report.
**Gerät:** Büro-Desktop, Handy bei Objektbegehung.

### 2.2 Grünflächenämter

**Job:** Öffentliches Grün gesetzlich einwandfrei unterhalten. Kern ist die
**Baumkontrollpflicht** — bei Personenschaden durch einen nicht kontrollierten
Baum haftet die Behörde.
**Tag:** Kontrollintervalle abarbeiten, Schadmeldungen, Bürgerbeschwerden,
Haushaltsmittel begründen.
**Braucht:** Baumkataster mit **Kontrollhistorie und Fristen**, gerichtsfeste
Dokumentation, Zustandsentwicklung über Jahre, Priorisierung bei Hitze/Dürre,
Zahlen für den Haushalt.
**Zahlt für:** Haftungssicherheit und den Nachweis, dass die Pflicht erfüllt
ist. Das ist ein stärkeres Kaufmotiv als jede Auswertung.
**Existiert schon:** Baumerfassung mit Arten, Karte, Sensorik, Klimalayer,
Starkregen-Ampel, Hitzedaten.
**Fehlt — und ist der Kern der Gruppe:** Kontrollintervalle, Fristenüberwachung,
Kontrollprotokoll (FLL-Richtlinie), Zustandsklassen, Maßnahmenverfolgung.
Ohne das ist die Plattform für ein Amt ein hübsches Kartenwerkzeug ohne Bezug
zu seiner eigentlichen Pflicht.
**Gerät:** Handy in der Kontrolle, Desktop in der Planung — echt gleichwertig.

### 2.3 Stadtplaner und Architekturbüros

Zusammengefasst, weil das Nutzungsmuster identisch ist.

**Job:** Planen, bevor gebaut wird. Genehmigungsfähigkeit nachweisen.
**Tag:** Varianten rechnen, Unterlagen erstellen, Fristen für Einreichungen.
**Braucht:** Analysen zu einem Standort auf Abruf — Sonnenstunden,
Verschattung, Hitzeinsel, Regenwasser, Artenwahl — und Ergebnisse in einer
Form, die in eine Einreichung kann (PDF, Plan, Datenblatt).
**Zahlt für:** eine Analyse, die sie sonst bei einem Ingenieurbüro einkaufen —
pro Projekt, nicht pro Monat.
**Existiert schon und ist ungewöhnlich stark:** Sonnenanalyse aus LoD2 +
Baumkataster mit kWh, Sonnen-Heatmaps über vier Stichtage, 3D-Schatten,
Starkregenprüfung, Klima-Steckbrief zum Ausdrucken, Pflanzplanung (Florales).
**Unterschied zu 2.1/2.2:** Diese Gruppe **besitzt keine Fläche**. Sie
untersucht fremde Standorte, einmalig, und ist danach weg. Kein Kataster, keine
Historie, kein Dauerabo — sondern: Adresse eingeben, Analyse bekommen,
exportieren.
**Gerät:** Desktop deutlich dominant, CAD-Nachbarschaft.

### 2.4 GaLaBauer

**Job:** Dasselbe wie LUMA — Kolonnen, Einsätze, Zeiten, Rechnungen.
**Braucht:** genau die Betriebshälfte aus Abschnitt 1.
**Existiert schon:** die komplette Betriebshälfte, im Tagesbetrieb erprobt.
**Zu bedenken, bevor das Ziel wird:**
1. Es ist der umkämpfte Markt mit etablierten Anbietern.
2. Es sind Wettbewerber. Interne Kalkulation, Kundenliste und Stundensätze
   liegen in derselben Anwendung, die man ihnen verkauft — Mandantentrennung
   wird hier zur Vertrauensfrage, nicht zur Technikfrage.
3. Es ist ein anderes Geschäft als die anderen vier: Betriebssoftware statt
   Flächenwissen.
**Vorschlag:** als Zielgruppe zurückstellen und getrennt entscheiden, nicht im
selben Zug mitbauen.

### 2.5 Zwei Nutzungsmuster, nicht fünf

Die fünf Gruppen fallen in **zwei** Muster — das ist die wichtigste Erkenntnis
für die Oberfläche:

| | **Dauerhafte Obhut** | **Projektanalyse** |
|---|---|---|
| Wer | Hausverwaltung, Grünflächenamt | Stadtplaner, Architekturbüro |
| Bezug | eigene Flächen, über Jahre | fremder Standort, einmalig |
| Frage | „Was ist mit meinen Flächen passiert, und was steht an?" | „Was gilt an diesem Standort?" |
| Braucht | Kataster, Historie, Fristen, Nachweise | Adresssuche, Analyse, Export |
| Zugang | Konto, Mandant, wiederkehrend | oft ohne Konto, einmalig |

Deshalb braucht BIOME **zwei Eingänge**, nicht ein Menü mit allem:
- **„Meine Flächen"** — angemeldet, mandantengebunden, Bestand und Verlauf.
- **„Standort analysieren"** — Adresse rein, Analyse raus, exportierbar.

Beide greifen auf denselben Kern zu (Karte, Layer, Analysen, Berichte). Es sind
zwei Fragen an dieselben Daten, nicht zwei Systeme.

---

## 3 · Vorschlag für die Struktur

### 3.1 Drei Oberflächen statt einer Liste

1. **BIOME** (`earth.luma-biome.de`) — das Produkt für alle Externen. Räumlich
   als Leitmetapher, die beiden Eingänge aus 2.5, Berichte als Ergebnis.
2. **LUMA Betrieb** (`app.luma-biome.de`) — nur für LUMA. Einsätze, Zeiten,
   Kolonnen, Stammdaten. Darf dicht und werkzeughaft sein, hier arbeiten
   Eingeweihte täglich.
3. **Öffentlich** (`luma-biome.de`) — ohne Anmeldung, heute `/explore`. Der
   Vorgeschmack, der zu 1 führt.

Malte behält Zugriff auf alles. Das ist ein Sonderfall, keine Rolle für andere.

### 3.2 Die vier Doppelungen auflösen

Grundregel: **ein Ort pro Sache, mit Ansichten — statt vier Orte mit
Überschneidung.**

| Heute | Vorschlag | Begründung |
|---|---|---|
| `/tasks` `/pflege` `/jobs` `/einsaetze` | **ein** Bereich „Arbeit" mit Ansichten Heute / Woche / Projekt | Aufgabe und Einsatz bleiben getrennte Datenobjekte (Einsatz hat Kolonne und Zeit, Aufgabe nicht) — aber man schaut an *einer* Stelle nach, was zu tun ist. |
| `/calendar` `/wochenplan` `/time` | **ein** Kalender mit Tag/Woche/Monat; Zeitbuchung am Einsatz statt als eigene Seite | Drei Seiten zeigen dieselbe Zeitachse in drei Zoomstufen. Zeit wird dort gebucht, wo die Arbeit steht. |
| `/map` `/earth` `/explore` `/analyse` | `/earth` wird **die** räumliche Fläche; `/map` geht darin auf; `/explore` ist deren nicht-angemeldete Variante; Analyse wird **Modus**, keine Route | Entspricht dem bestehenden BIOME-Plan (ein Canvas). Vier Karten mit je eigener Bedienung sind vier Lernaufwände für dieselbe Handlung. |
| `/sensors` `/klima` + Karten-Panel | Sensoren als Ebene im Raum + **eine** Detailseite; `/klima` wird Teil des Kundenberichts | Messwerte sind ein Attribut eines Ortes, kein eigenes Ressort. |
| `/data` `/stammdaten` `/drive` | `/stammdaten` bleibt; Dateien im Kontext des Objekts statt als eigener Menüpunkt | Man sucht „die Fotos zu diesem Beet", nicht „das Laufwerk". |

Erwartung: Navigation von 19 Einträgen auf etwa 6 intern und 3–4 extern.

### 3.3 Navigation nach Rolle — existiert heute nicht

`Layout.jsx` verzweigt **an keiner Stelle** nach `isKunde` oder `isGast`. Alle
sehen dieselbe Liste. Für eine Plattform mit fünf fremden Berufsgruppen ist das
die erste Baustelle: Jede Rolle sieht nur, was zu ihrer Aufgabe gehört.

### 3.4 Beide Geräte gleichwertig — was das konkret heißt

„Gleichwertig" ist mehr Arbeit als ein Kompromiss, aber ehrlicher. Konkret:

- Pro Fläche **zwei bewusste Zuschnitte**, nicht ein schrumpfendes Desktop-Layout.
  `useIsMobile` ist vorhanden und wird durchgängig dafür benutzt.
- Mobil: **eine Sache pro Bildschirm**, große Tippziele, Bedienung am unteren
  Rand (Daumen), keine übereinanderliegenden Schwebepanels.
- Desktop: Dichte ist erlaubt — Tabellen, mehrere Bereiche gleichzeitig.
- Feldarbeit muss **offline** funktionieren (`outbox.js`, `uploadQueue.js`
  existieren). Ein Amt kontrolliert Bäume auch im Funkloch.

**Ein Beispiel aus dieser Woche, zur Selbstkritik:** Die Sensor-Kacheln, die ich
heute gebaut habe, sind auf dem Desktop richtig — ein Panel neben der Karte —
und auf dem Handy falsch: ein schwebendes Panel über der Karte, das dem
Ausblenden-Hinweis und dem Feature-Panel ausweichen muss. Nach diesem Konzept
gehören Sensorwerte mobil in eine eigene, ganzflächige Ansicht. Ich habe eine
Funktion in eine Toolbar gesetzt, die schon Suche, Projektauswahl, fünf
Zeichenwerkzeuge, Messen, 3D und Standort enthält, ohne zu fragen, ob sie dort
hingehört.

---

## 4 · Mandantenfähigkeit — der harte Teil

Ohne saubere Mandantentrennung ist keine der vier externen Gruppen bedienbar.
Der Stand:

**Was existiert** (aus dem Kundenportal, `20260729_kundenportal_leistungsnachweis.sql`):
- Tabelle `organisation`, `clients.org_id` als Zuordnung
- Rolle `kunde_viewer`, RLS-Policies gegen `auth.uid()`
- Bewusst **keine** Lese-Policy auf `clients` — Kontaktdaten und Notizen
  bleiben intern. Das ist sorgfältig gemacht.

**Was fehlt:**
- Die Trennung gilt nur für den Leistungsnachweis-Pfad. `OpsContext` lädt
  Projekte, Features, Sensoren und Aufgaben **ungefiltert** (`client_id` kommt
  dort dreimal vor) — für interne Nutzer korrekt, für Externe nicht tragfähig.
- Eine Rolle pro Zielgruppe. `kunde_viewer` passt auf Hausverwaltungen; ein
  Amt mit eigenen Kontrolleuren und ein Planungsbüro brauchen anderes.
- Ein Mandant, der **eigene Flächen einbringt**. Heute gehören alle Projekte
  LUMA. Ein Grünflächenamt bringt seinen eigenen Bestand mit.

**Empfehlung:** Die Trennung gehört in die RLS, nicht in die Oberfläche —
serverseitig, nicht clientseitig gefiltert. Der eingeschlagene Weg ist richtig
und sollte verallgemeinert werden, bevor die zweite Gruppe dazukommt. Nachträglich
Mandantenfähigkeit einzuziehen, während Kunden Daten darin haben, ist die
teuerste Variante.

---

## 5 · Vorschlag zur Reihenfolge

Das größte Risiko ist, für fünf Gruppen zu bauen, während **eine** Person die
Plattform benutzt. Dann entsteht Oberfläche auf Vermutung — genau so ist der
heutige Zustand entstanden. Deshalb: eine Gruppe zuerst, bewusst gewählt.

**Empfehlung: Hausverwaltungen zuerst.** Begründung:
1. Der Pfad ist **schon produktiv** — Leistungsnachweis, Portal, RLS stehen.
2. Es gibt **echte, erreichbare Nutzer** — LUMA hat diese Kunden heute
   (JOPE und andere in den Zeitdaten). Man kann fragen statt raten.
3. Kürzester Weg von „existiert" zu „jemand zahlt dafür".

Grünflächenämter sind die **größere** Chance — Haftung ist ein stärkeres
Kaufmotiv als Auswertung — brauchen aber erst den Kontrollpflicht-Kern (2.2) und
haben lange Beschaffungswege. Als Zweites, nicht als Erstes.

Schritte:
1. **Trennung ziehen** — Betrieb und BIOME auseinanderlegen, Navigation je
   Rolle. Ohne Datenmodell-Änderung, nur Struktur. Größter Effekt gegen die
   Überfrachtung.
2. **Doppelungen auflösen** (3.2), eine nach der anderen, jede mit Begründung.
3. **Eine Leitfläche exemplarisch** durchziehen — beide Geräte, nach dem
   UI-Fundament — als Muster für alles Weitere.
4. **Mandantenfähigkeit verallgemeinern** (4), bevor die zweite Gruppe kommt.
5. **Dann** Zielgruppenfunktionen: Kontrollpflicht für Ämter, Analyse-Export
   für Planer.

Nicht jetzt: GaLaBauer als Zielgruppe, weitere Analysefunktionen, neue Layer.

---

## 6 · Offene Fragen

1. **Erste Zielgruppe** — ist Hausverwaltungen richtig, oder gibt es einen
   Grund (Kontakt, Ausschreibung, Interesse), mit Ämtern oder Planern zu
   beginnen? Das ändert die Reihenfolge, nicht die Struktur.
2. **Eigene URLs** — soll BIOME wirklich getrennt ausgeliefert werden
   (`earth.luma-biome.de`), oder erst einmal eine Trennung innerhalb einer App?
   Getrennt ist klarer, kostet aber Deployment-Arbeit.
3. **Bringen Mandanten eigene Flächen mit?** Entscheidet, ob das Datenmodell
   „LUMA-Projekte mit Kundenzugang" bleibt oder zu „Flächen mit Eigentümer"
   wird. Weitreichend — besser jetzt klären.
4. **GaLaBauer** — Zielgruppe oder nicht? Bei ja gehört die Betriebshälfte
   produktisiert statt nur getrennt.
5. **Was darf weg?** Gibt es unter den 28 Routen etwas, das gebaut wurde und
   sich nicht bewährt hat? Löschen ist der billigste Weg gegen Überfrachtung,
   und nur du weißt, was du nie benutzt.
