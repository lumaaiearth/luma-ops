# LUMA Ops — Plattform- & Marktanalyse

> Erstellt: 2026-07-22 · Analyse der Plattform aus Sicht der vier Nutzergruppen
> (LUMA intern, Kunden, andere GaLaBau-Betriebe, Öffentlichkeit), des Marktes
> (Berlin + deutschlandweit) und des ökonomischen Modells.
> Grundlage: vollständige Code-/Schema-Durchsicht, Live-Nutzungsdaten aus der
> Produktiv-DB (22.07.2026) und Web-Recherche mit Quellenangaben (Abschnitt 9).

---

## 1. Kurzfassung — die zehn wichtigsten Befunde

1. **Die Plattform ist heute ein sehr gutes internes Betriebswerkzeug — und
   fast ausschließlich das.** Einsatzplanung, Aufgaben, Zeiterfassung,
   Stundenkonten, BIOME-Karte sind produktionsreif und werden real genutzt.
   Kundenportal, öffentliche Ansicht und MANA existieren als Code, haben aber
   **null echte Nutzer** (0 `kunde_viewer`-Accounts, 0 Gäste, 0 Pflanzpläne,
   0 Rechnungen, 0 MANA-Datensätze in der Produktiv-DB).
2. **Die wirtschaftliche Prozesskette bricht zweimal:** vorne (kein Angebot
   außer Florales-Kalkulation, kein GAEB/LV → auf MANA-Funde kann man nicht
   bieten) und hinten (Rechnungsmodul ungenutzt, keine E-Rechnung
   XRechnung/ZUGFeRD trotz Pflicht seit 2025).
3. **Das Kundenportal würde heute leer aussehen:** Es zeigt ausschließlich
   Pflanzpläne — davon existieren 0. Keine Fotos, keine Termine, keine
   Berichte, kein Ansprechpartner, keine einzige Interaktionsmöglichkeit.
4. **Sicherheits-Hypothek vor jedem Kunden-Launch:** `pflanzplaene` und
   `standort` haben kein aktives RLS (Mandantentrennung nur clientseitig);
   das Kern-Schema inkl. `is_internal()` ist nicht versioniert; Storage-Buckets
   sind public-read. Behebbar in Tagen, aber zwingend **vor** dem ersten
   externen Login.
5. **Der Markt ist da, aber die Marge ist das Problem der Branche:** GaLaBau
   2025 = 11,11 Mrd. € (+4,3 % nominal, real eher stagnierend); Auftragsbücher
   voll (~18 Wochen), aber 65 % der Betriebe unzufrieden mit dem Ertrag.
   Öffentliches Grün ist mit +8,9 % das dynamischste Segment.
6. **Berlin ist regulatorischer Rückenwind pur:** BäumePlus-Gesetz (1 Mio.
   Bäume bis 2040, 440.000 Straßenbäume bis Ende 2027), Biotopflächenfaktor,
   Versickerungsgebot seit 2018 — bei gleichzeitig ~1.000 unbesetzten Stellen
   in den Grünflächenämtern. Die Ämter **müssen** auslagern.
7. **CSRD/Biodiversitäts-Reporting fällt als Verkaufsargument weitgehend aus**
   (Omnibus 2025/26: >80 % der Unternehmen aus der Pflicht, ESRS E4 bis GJ 2027
   verzichtbar). Nachweis-Argumente müssen auf Förderauflagen, Vergabe und
   Eigentümer-Kommunikation zielen, nicht auf CSRD-Pflicht.
8. **Was LUMA verkauft, ist kein SaaS, sondern ein dokumentiertes Ergebnis:**
   „Nachweisbar lebendige, klimaangepasste Fläche" — Planung + Umsetzung +
   Pflege + Monitoring + Bericht aus einer Hand. Genau diese Integration
   existiert im Markt noch nicht als etabliertes Angebot (Lücke bestätigt).
   Die Plattform ist dabei Differenzierer und Bindungsmaschine, nicht das
   Produkt.
9. **Software an andere GaLaBau-Betriebe zu verkaufen ist auf Jahre der
   falsche Kampf:** Der Markt ist besetzt (DATAflor ~5.000 Kunden, KS21,
   Plancraft ab ~39 €/Monat) und konsolidiert unter Private-Equity-Dächern.
   Realistische Partner-Rolle: Subunternehmer im LUMA-Workflow, nicht
   Software-Käufer.
10. **Wichtigster nächster Schritt ist kein Feature, sondern ein Kunde:**
    Einen echten Bestandskunden ins Portal holen (Pilot), mit Fotos, Terminen
    und einem automatischen Jahres-/Biodiversitätsbericht — und daraus den
    ersten bezahlten Pflege-/Monitoring-Vertrag machen.

---

## 2. Wo die Plattform heute steht

### 2.1 Feature-Bestand (Reifegrad)

| Modul | Zustand | Bewertung |
|---|---|---|
| Einsätze-Hub (Liste/Kalender/Wochenplan), GCal-Sync, Telegram | produktionsreif, real genutzt | Kernstärke |
| Aufgaben (Boards, Checklisten, Fotos, Papierkorb, Auto-Archiv) | produktionsreif, real genutzt (51 Tasks) | Kernstärke |
| Zeiterfassung + Stundenkonten + Nachkalkulation (`TimePage`, 1.628 Zeilen) | produktionsreif; Abrechnungs-Tab ungenutzt (0 Rechnungen) | Stärke mit Lücke |
| BIOME-Karte (Zeichnen, Bäume, Drohnen-Orthos, 11 Berlin/DWD-Layer) | sehr ausgebaut | Kernstärke, Alleinstellung |
| Florales (Beetplaner, 439 Arten, 17 Habitate, Kalkulation, PDF/Bestellliste) | groß, aber mitten im Neuaufbau; 0 Pläne in der DB | Potenzial, unfertig |
| Kundenportal `/portal` | Grundgerüst, read-only, nur Pflanzpläne | konzeptionell, leer |
| Öffentliche Ansicht `/explore` | Grundgerüst, saubere Public-Views | konzeptionell, 1 öffentliches Projekt |
| Sensoren | reine Demo/Simulation, keine Hardware | Versprechen ohne Substanz |
| MANA (Ausschreibungs-Radar, Chancen, KI-Anschreiben) | gebaut, aber nicht scharf (API-Key fehlt, 0 Datensätze) | ungehobener Hebel |
| Analyse/Research-Hub (6 Artikel) | Content-Marketing, statisch | nice-to-have |

### 2.2 Reale Nutzung (Produktiv-DB, 22.07.2026)

11 Kunden, 16 Projekte, 4 Einsätze, 63 Zeiteinträge, 51 Aufgaben, 9
Kartenobjekte, 7 interne Nutzerprofile. **Aber:** 0 Rechnungen, 0 Pflanzpläne,
0 Sensoren (bei 1.348 verwaisten `sensor_readings` — Altdaten), 0
Kunden-Accounts, 0 Gast-Accounts, 0 MANA-Ausschreibungen/-Leads, 1 öffentliches
Projekt.

**Interpretation:** Die Plattform hat ihren Product-Market-Fit intern bewiesen
(das Team nutzt sie täglich für Planung und Zeiten). Alles, was nach außen
zeigt oder Geld abbildet, ist bislang unbespielt. Das ist keine Schwäche des
Codes — es ist eine Priorisierungsfrage: Es wurde zuletzt viel in Breite
(MANA, Florales-3D, Themes) investiert, nichts in Aktivierung der bereits
gebauten Außenwirkung.

### 2.3 Professionalitäts-Check: Substanz und Hypotheken

**Substanz (überdurchschnittlich für ein Ein-Team-Projekt):** durchdachte
Rollentrennung (Geld nur Admin via `is_admin()`, Betrieb intern via
`is_internal()`), Schutz gegen Selbst-Eskalation im `user_profile`, Offline-
Outbox, PWA + Capacitor, idempotente Migrationen, kaum TODO-Leichen, eigene
Drohnen-Ortho-Pipeline, fachlich fundierte Pflanz-/Habitatdaten (439 Arten mit
Nektar/Pollen/Raupenfutter-Werten, „Treffpunkt Vielfalt"-Habitate).

**Hypotheken (alle vor externem Rollout zu tilgen):**

1. **RLS-Lücke im Kundenportal-Datenpfad:** `pflanzplaene` (Policy in
   `20260604_auth_multi_tenant.sql` auskommentiert) und `standort` (Portal lädt
   sogar ungefiltert `select('*')`, `KundenPortalPage.jsx:42`) sind nicht
   serverseitig getrennt. Solange kein externer Account existiert, ist das
   latent — mit dem ersten Kunden-Login wird es ein echtes Datenleck-Risiko.
2. **Kern-Schema unversioniert:** `clients/projects/jobs/sensors/map_features/
   time_entries/invoices/…` und die zentrale Funktion `is_internal()` existieren
   nur im Supabase-Dashboard, nicht im Repo. Kein reproduzierbarer Neuaufbau,
   keine Review-Historie für Sicherheitsregeln.
3. **Public Storage-Buckets** (`job-photos`, `drone-images`, `drone-tiles`):
   Wer eine URL kennt/errät, sieht Fotos und Luftbilder von Kundenflächen.
   Für ein Unternehmen, das Kommunen und Wohnungswirtschaft ansprechen will
   (Datenschutz-Sensibilität!), ein vermeidbares Angriffsziel.
4. **Zwei Schema-Welten** (SQLite-Legacy `src/data/schema.sql` vs. Produktiv-
   Postgres) und doppelte Team-Quellen (`seed.js` vs. DB) — Drift-Gefahr.
5. **Login-Widerspruch:** UI sagt „Dein LUMA-Admin legt dein Konto an",
   aber jeder mit Google-Konto kann sich einloggen und landet als `gast` in
   `/explore`. Gewollt als Feature, aber undokumentiert und im Auftritt
   inkonsistent.

---

## 3. Die Plattform durch die Brille der vier Nutzergruppen

### 3.1 LUMA intern — „funktioniert, verdient aber noch kein Geld mit"

**Was gut ist:** Der Alltag (wer ist wann wo, was ist zu tun, wie viele
Stunden) ist vollständig und mobil abgebildet; Telegram ersetzt eine
Disponenten-Rolle; die Nachkalkulation (Personen-Kostensätze, Kundensätze,
Material-Aufschlag) ist konzeptionell genau das Werkzeug gegen das
Branchenproblem Nr. 1 (Marge, siehe 4.1).

**Was fehlt, in Prozessreihenfolge:**
- **Angebot:** Außer der Florales-Kalkulation gibt es kein Angebotsdokument.
  Jeder Auftrag beginnt heute außerhalb der Plattform.
- **Ausschreibung → Angebot:** MANA findet (sobald scharf) täglich passende
  öffentliche Ausschreibungen — aber ohne LV/GAEB-Unterstützung und
  Angebotsprozess endet der Funnel im Nichts. Für den Anfang reicht ein
  strukturierter „Bieten wir? / Unterlagen-Checkliste / Kalkulations-Notiz"-
  Workflow; GAEB-Vollunterstützung ist Kaufsoftware-Terrain.
- **Rechnung:** Das Abrechnungsmodul erzeugt Datensätze und Drucke, aber keine
  E-Rechnung (XRechnung/ZUGFeRD — seit 2025 im B2B empfangspflichtig, bei
  öffentlichen Auftraggebern längst Standard) und keinen DATEV-Export.
  Deshalb wird es nicht genutzt (0 Rechnungen) — die Buchhaltung lebt
  woanders, und die Nachkalkulation bleibt ohne Erlösseite blind.
- **Sensoren:** Entweder reale Hardware anbinden (LoRaWAN/BLE-Gateway, der
  Webhook-Pfad existiert) oder das Modul aus der Navigation nehmen — eine
  Demo mit Zufallszahlen wirkt vor Kunden unprofessionell.

**Urteil:** Intern macht die Plattform Sinn und ist der am weitesten gereifte
Teil. Der größte interne Hebel ist, die Geld-Kette zu schließen — nicht neue
Module.

### 3.2 Der Kunde — „bekommt heute nichts, was er anfassen kann"

Rollenmodell und Portal existieren, aber aus Kundensicht ist das Erlebnis
heute: Login → leere Liste (0 Pflanzpläne) → Logout. Selbst gefüllt zeigt das
Portal nur einen Ausschnitt (Pflanzpläne mit Blühkalender und Heimisch-Quote)
und ist zu 100 % passiv: keine Fotos, keine Termine („Wann kommt LUMA
wieder?"), keine Berichte zum Herunterladen, keine Freigaben, keine
Kommentare, kein Ansprechpartner, keine Benachrichtigung, keine Rechnung.

Dabei ist die interne `ClientPage` schon fast das bessere Kundenportal
(Einsätze, Aufgaben, Sensoren, Druck-Report) — sie ist nur nicht freigegeben.
Die Kundenbindungs-Strategie (`CUSTOMER_STRATEGY.md`) benennt die richtigen
Mechanismen (Datengravitation, Pull-Momente, Nachweisbarkeit); umgesetzt ist
davon im Portal fast nichts.

**Was der Kunde laut Marktrecherche wirklich braucht (Pain Points):**
1. **Nachweis:** Förderauflagen, Gremien, Eigentümerversammlungen,
   CSR-Kommunikation — „Zeig mir, was meine Fläche bringt" (Bericht mit
   Fotos, Arten, Blühwochen, CO₂-/Kühlwirkung, Pflegehistorie).
2. **Planbare Folgekosten:** Pflege ist das Angst-Thema jedes
   Begrünungsprojekts — ein transparenter Pflegekalender mit Preisen nimmt
   die größte Kaufhürde.
3. **Förder-Lotsen:** GründachPLUS (bis 180 €/m² Dach, bis 60.000 €), BENE 2,
   KfW 444 — der Förderdschungel ist dokumentiert das Top-Hemmnis. Wer den
   Antrag abnimmt, gewinnt den Auftrag.
4. **Vertrauen/Transparenz:** sehen, wann LUMA da war und was gemacht wurde.

**Urteil:** Die Portal-Idee ist richtig und marktkonform — aber sie braucht
Inhalt (Fotos, Termine, Bericht) statt weiterer Kennzahlen, genau eine aktive
Interaktion (Freigabe oder Kommentar) und vor allem: einen ersten echten
Nutzer.

### 3.3 Andere GaLaBau-Betriebe — „kein Kunde, sondern Kapazität"

Eine Partner-Rolle existiert nur als ungenutztes Feld
(`organisation.typ='partner'`), ohne Rolle, RLS oder UI. Das ist derzeit
korrekt so, denn:

- Als **Software-Kunden** sind GaLaBau-Betriebe ein besetzter Markt:
  DATAflor (~5.000 Kunden, GAEB, Aufmaß, Baustellen-App), KS21/GaLaOffice,
  TAIFUN, dazu Cloud-Angreifer (Plancraft ~39–49 €/Monat pro Betrieb,
  Craftboxx ab ~29 €). LUMA Ops müsste dort Feature-Parität in Kalkulation/
  GAEB/Abrechnung aufholen — Jahre Arbeit, geringe Differenzierung, und
  Private-Equity-Konsolidierer (OneQrew, Craftview) drücken aufs Tempo.
- Als **Subunternehmer/Kapazitätspartner** sind sie dagegen kurzfristig
  wertvoll: LUMA hat (mit BäumePlus, EPS, Schwammstadt) mehr adressierbaren
  Markt als eigene Ausführungskapazität. Ein Partner-Zugang, der nur
  zugewiesene Einsätze + Flächen-Infoblatt + Foto-Upload zeigt (die
  `people`/Freelancer-Struktur ist die Vorstufe), macht LUMA zum
  Generalunternehmer mit Qualitäts-Doku — die Plattform wird zum
  Koordinations-Vorteil statt zum Verkaufsprodukt.
- **Langfristige Option** (erst nach eigenem Beweis): Florales/BIOME als
  White-Label für Betriebe außerhalb Berlins, die das LUMA-Modell
  („Biodiversität mit Nachweis") kopieren wollen — Franchise-/Lizenz-Logik
  statt Betriebssoftware-Wettbewerb.

### 3.4 Öffentlichkeit / Gäste — „Schaufenster ohne Laufkundschaft"

`/explore` ist technisch sauber gelöst (bereinigte Public-Views, Opt-in pro
Projekt), aber: 1 öffentliches Projekt, 0 Gast-Accounts, und die Ansicht ist
hinter einem Google-Login versteckt — eine „öffentliche" Seite mit
Login-Pflicht erreicht niemanden. Es gibt keinen Link von luma-biome.de-
Marketinginhalten, keine teilbaren Projekt-URLs, kein SEO.

**Wozu die öffentliche Ebene wirklich taugt:** (a) Referenz-Schaufenster im
Verkaufsgespräch („so sichtbar wird Ihre Fläche"), (b) Transparenz-Beweis
gegenüber Kommunen/Bürgern (BäumePlus verlangt sogar Open Data zur
Umsetzung), (c) Lead-Generator, wenn der Florales-Wizard als abgespecktes
Gratis-Tool öffentlich wird (Pollinator-Pathmaker-Idee aus dem Handoff) —
Adresse eingeben, Klimadaten der eigenen Fläche sehen, Beetvorschlag
bekommen, für den Rest: LUMA anfragen.

**Urteil:** Richtig angelegt, aber als Marketing-Asset denken (ohne Login,
teilbar), nicht als Produkt.

---

## 4. Der Markt (Berlin + deutschlandweit)

### 4.1 GaLaBau-Markt in Zahlen

- Branchenumsatz 2025: **11,11 Mrd. €** (+4,3 % nominal, 16. Wachstumsjahr);
  real seit ~2021 eher stagnierend/rückläufig, Produktivität sinkt.
- **19.898 Betriebe**, Ø 6–7 Beschäftigte; 21 % Verbandsbetriebe machen 63 %
  des Umsatzes. 131.746 Beschäftigte (Rekord), 8.000–10.000 Stellen unbesetzt.
- Segmente: Privatgärten ~57 % (6,3 Mrd. €), **öffentliches Grün ~21 %
  (2,36 Mrd. €, +8,9 % — dynamischstes Segment)**, Wohnungsbau ~1 Mrd. €.
- Stimmung Frühjahr 2026: Auftragslage gut (~18 Wochen Auslastung), aber
  **65,2 % unzufrieden mit dem Ertrag** — das Branchenproblem ist die Marge.
- Berlin/Brandenburg: eigener Landesverband; belastbare Regionalzahlen nicht
  öffentlich (ggf. direkt anfragen).

**Bedeutung für LUMA:** Wachstum kommt aus dem öffentlichen/klimabezogenen
Segment — genau LUMAs Positionierung. Und: Wer als kleiner Betrieb seine
Marge kennt (Nachkalkulation!) und wiederkehrende Pflege-Erlöse aufbaut, ist
strukturell besser aufgestellt als die Branche.

### 4.2 Regulierung als Nachfragetreiber

- **KAnG** (seit 7/2024): Berücksichtigungsgebot für öffentliche Planungen
  seit 1/2025; Konzeptpflicht für Kommunen kommt über die Länder bis 1/2027 —
  strukturell wachsender Bedarf an Konzepten, Maßnahmen, Monitoring.
- **Berlin, BäumePlus-Gesetz** (in Kraft 21.11.2025): 1 Mio. Stadtbäume bis
  2040, **440.000 Straßenbäume bis Ende 2027**, Grünanlage ≤500 m für alle,
  ~170 „Hitzeviertel"-Miniparks, Hitzeaktionspläne, Open-Data-Pflicht zur
  Umsetzung — aber ohne hinterlegtes Budget (Haushaltsvorbehalt).
- **Berlin operativ:** ~1.000 unbesetzte Stellen in den Grünflächenämtern,
  ~433.000 Straßenbäume, Pflege „auf das Nötigste" — die Ziele sind ohne
  private Ausführung nicht erreichbar. Verschärfte Baumschutzverordnung
  (Schutz ab 70 cm Stammumfang, mehr Ersatzpflanzungen) erhöht zusätzlich das
  Volumen an Baum-Dienstleistungen.
- **Regenwasser:** Versickerungsgebot §36a BWG seit 2018, Schwammstadt in
  jedem Koalitionsvertrag, BWB-Investitionsbedarf 5–10 Mrd. € — Entsiegelung/
  dezentrale Regenwasserbewirtschaftung ist Dauerthema; Wegfall der
  Niederschlagswassergebühr ist ein rechenbares Verkaufsargument.
- **EU Nature Restoration Regulation:** kein Nettoverlust Stadtgrün ab 2030
  (Basis 2021) — wirkt ab 2026/27 über den nationalen Plan auf Kommunen.
- **Dämpfer CSRD/ESRS E4:** Omnibus-Einigung (12/2025, Rechtsakt 2/2026) hebt
  die Schwellen auf >1.000 MA und >450 Mio. € Umsatz; >80 % der Unternehmen
  fallen raus, E4-Biodiversität bis GJ 2027 verzichtbar. **Die
  Compliance-Story „Sie müssen berichten" trägt nicht mehr** — die
  Nachweis-Story muss über Förderauflagen, Vergabekriterien, Gemeinwohl-/
  Marketing-Nutzen laufen.

### 4.3 Förderlandschaft (Stand Mitte 2026, volatil — vor Kundeneinsatz tagesaktuell prüfen)

| Programm | Für wen | Eckwerte | Status |
|---|---|---|---|
| GründachPLUS (Berlin/IBB) | Gebäudeeigentümer | bis 180 €/m² Dach, Fassade max. 50 %, bis 60.000 € | aktiv (Richtlinie 1/2026) |
| BENE 2 (EFRE Berlin) | öffentlich/institutionell | ~210 Mio. € 2021–2027, Schwerpunkt Klimaanpassung | aktiv |
| KfW 444 „Natürlicher Klimaschutz Kommunen" | Kommunen | Quote ab 2026: 50 % (finanzschwach 80 %) | läuft Ende 2026 aus, Stopp-Historie |
| Bundesprogramm KlimaRäume/AULR | Kommunen | 90 % Förderquote, aber nur noch 80 Mio. € gesamt | 5. Aufruf bis 30.6.2026 |
| ANK (Dach) | diverse | 3,5–4,5 Mrd. € bis 2028/29 | Kürzungsvorbehalt |
| Entsiegelung Berlin | — | Programm in Erarbeitung (bis Ende 2026); heute: Wegfall Regenwassergebühr | offen |

**Muster:** Förderquoten sinken, Programme sind stop-and-go, Bürokratie ist
laut Difu-Befragungen das meistgenannte Hemmnis neben Personal. Genau daraus
entsteht LUMAs Chance: **Fördermittel-Navigation als Teil der Leistung** (MANA
CHANCEN ist dafür schon halb gebaut — nur zeigt es heute nach innen statt zum
Kunden).

### 4.4 Pain Points der Zielgruppen (belegt)

- **Kommunen:** 92 % von Extremwetter betroffen; Haupthemmnisse Personal +
  Geld; nur 12 % haben Klimaanpassungsmanager; Wunsch nach einfacher
  Förderung („Klimaschutz statt Zettelwirtschaft"). 90 % der OBs sehen
  Anpassungsfinanzierung als erhebliche Herausforderung.
- **Wohnungswirtschaft:** Fokus auf Wärmewende/Kosten; Grün konkurriert ums
  Budget → braucht rechenbare Argumente (Regenwassergebühr, Hitzeschutz,
  Förderquote) und schlüsselfertige Abwicklung inkl. Pflege.
- **Private/Gewerbe:** Förderdschungel, Angst vor Pflegefolgekosten, kein
  Vertrauen in Wirkungsversprechen ohne Nachweis.
- **Alle:** Es fehlt ein standardisierter, bezahlbarer **Wirkungsnachweis**
  (Monitoring). Integriertes „Planung + Umsetzung + Pflege + Förderung +
  Monitoring aus einer Hand" wurde in der Recherche **nicht** als etabliertes
  Angebot gefunden — das ist die Positionierungslücke.

### 4.5 Software-Wettbewerb (Kurzfassung)

- **Betriebsführung GaLaBau:** DATAflor (Marktführer), KS21/GaLaOffice
  (Craftview), TAIFUN, M-SOFT (OneQrew); Cloud: Plancraft, HERO, Craftboxx
  (20–50 €/Monat). → besetzt, konsolidierend, nicht LUMAs Spielfeld.
- **Baum/Grünflächen B2G:** greehill (KI-Baumzwillinge, sitzt in Berlin,
  45.000 Bäume im URBORETUM-Cluster), Baumsicht (QGIS), ARCHIKART,
  pit-Kommunal, Tablano; Berlin nutzt GRIS. → Kataster-Software ist besetzt;
  LUMAs Chance ist die **Dienstleistung** (Erfassung, Pflege, Nachweis) auf
  eigener Werkzeug-Basis, nicht der Software-Verkauf ans Amt.
- **Biodiversitäts-Monitoring/Scoring:** NatureMetrics (eDNA), Pivotal
  (Satellit/Akustik), greenpass (Klimaresilienz-Zertifizierung) — alle auf
  Konzern-/Stadtebene, keiner besetzt die kleinteilige Fläche
  (Quartier, Hof, Firmengelände) mit Vor-Ort-Betrieb. Nature Credits: Markt
  entsteht erst (formaler Handel frühestens 2027/28) — beobachten, nicht bauen.

---

## 5. Was verkaufen wir eigentlich? — Das ökonomische Modell

### 5.1 Drei denkbare Modelle — und was sie taugen

| Modell | Bewertung |
|---|---|
| **A) SaaS an GaLaBau-Betriebe** („LUMA Ops als Produkt") | ✗ Auf Jahre nicht: besetzter Markt, Feature-Rückstand bei Kalkulation/GAEB/Abrechnung, Support-/Vertriebsapparat nötig, PE-Konsolidierer als Gegner. |
| **B) SaaS an Endkunden** („Portal-Abo als Produkt") | Teilweise: Ein Portal allein kauft niemand — es gibt keinen belegten Markt für „Grünflächen-Dashboards". Als **Bestandteil** eines Pflege-/Monitoring-Vertrags aber sehr wohl bepreisbar. |
| **C) Dienstleistung mit Plattform-Verstärkung** („nachweisbares Ergebnis") | ✓ Trägt heute: LUMA verkauft Planung + Umsetzung + Pflege + **Nachweis**; die Plattform senkt eigene Kosten (Marge!), differenziert im Verkauf, bindet über Daten und liefert den Nachweis automatisch. |

**Antwort auf „Was verkaufen wir?":** Nicht Software, nicht Daten, sondern
**das dokumentierte Ergebnis**: eine lebendige, klimaangepasste Fläche mit
belegter Wirkung — inklusive des Wegs dahin (Förderung, Planung, Bau) und
der Dauerhaftigkeit (Pflege, Monitoring, Bericht). Die Plattform ist das
Beweis- und Bindungsinstrument. Kurzformel: **„Wir bauen keine Beete, wir
liefern nachweisbar lebendige Flächen — und Sie können dabei zusehen."**

### 5.2 Empfohlene Erlösarchitektur (drei Ströme)

1. **Projektgeschäft** (heute schon): Planung + Bau, akquiriert über
   Referenzen, MANA-Radar (öffentlich) und Förder-Lotsen-Ansprache (privat).
   Plattform-Beitrag: Florales-Kalkulation, Nachkalkulation, BIOME als
   Verkaufs-Wow im Erstgespräch (steht so schon in `CUSTOMER_STRATEGY.md`
   und funktioniert laut Customer Journey).
2. **Biom-Vertrag** (der strategische Kern, neu zu schnüren): jährlicher
   Pflege- + Monitoring-Vertrag pro Fläche, der bündelt:
   Pflegeeinsätze (saisonkalendergesteuert) + Portalzugang + Fotodoku +
   Jahres-/Biodiversitätsbericht (PDF) + Förder-Radar für die eigene Fläche.
   Preisanker: Pflegeleistung nach Aufwand (GaLaBau-üblich) **plus**
   Plattform-/Berichtspauschale in den Tiers aus `CUSTOMER_STRATEGY.md`
   (99–499 €/Monat je nach Standortzahl). Das verwandelt Einmal-Projekte in
   wiederkehrenden Umsatz und baut die Wechselkosten auf (Datengravitation).
3. **Optionen** (erst nach Beweis von 1+2): öffentlicher Florales-Wizard als
   Lead-Maschine; White-Label/Franchise für Betriebe außerhalb Berlins;
   Monitoring-Reports als Zusatzprodukt für Bestandsflächen Dritter; Nature
   Credits, falls der Markt ab 2027/28 real wird.

### 5.3 Warum diese Reihenfolge

Die Branche hat volle Auftragsbücher und schlechte Margen; LUMAs Engpass ist
nicht Nachfrage, sondern Kapazität und Wiederkehr-Umsatz. Strom 2 adressiert
genau das: Pflegeverträge sind das stabilste Segment der Branche, und der
Nachweis-Anteil (Bericht, Portal) ist der Teil, den klassische Wettbewerber
nicht liefern können — er rechtfertigt Premium-Preise und hält Kunden. Alles
Weitere (Software-Verkauf, Credits) hat heute weder Markt-Pull noch interne
Kapazität.

---

## 6. Fehlende Features — priorisiert

### P0 — Vertrauensbasis (vor jedem externen Nutzer; ~Tage)

1. **RLS scharf schalten** auf `pflanzplaene` + `standort` (org-basiert,
   Muster liegt in `ARCHITECTURE.md` §4D); Portal-Query auf `standort`
   org-filtern.
2. **Schema versionieren:** Live-Schema (inkl. `is_internal()`) einmalig als
   Basis-Migration dumpen; ab dann nur noch Migrationen.
3. **Storage absichern:** Buckets auf private + signierte URLs (mind.
   `job-photos`).
4. Sensoren-Demo aus der Nav nehmen oder als „Demo" kennzeichnen; verwaiste
   `sensor_readings` aufräumen.

### P1 — Die Geld-Kette schließen (Wochen)

5. **Angebots-PDF** aus Projekt/Florales (Positionen, Netto/Brutto, AGB) —
   der Anfang der Kette; Annahme per Klick im Portal (erste
   Kunden-Interaktion!).
6. **E-Rechnung** (XRechnung/ZUGFeRD) + Nummernkreise + DATEV-Export im
   Abrechnungs-Tab — sonst bleibt das Modul bei 0 Rechnungen und die
   Nachkalkulation blind.
7. **Jahres-/Biodiversitätsbericht als 1-Klick-PDF** (Flächen, Pflanzpläne,
   Fotos vorher/nachher, Blühwochen, Heimisch-Quote, Einsatzhistorie;
   CO₂-/Kühlwirkung als Schätzung mit Methodik-Fußnote). Das ist das
   zentrale Verkaufsartefakt für den Biom-Vertrag — und für Förder-Nachweise.
8. **MANA scharf schalten** (ANTHROPIC_API_KEY als Supabase-/GitHub-Secret) +
   einfacher Bieter-Workflow (Status, Fristen, Unterlagen-Checkliste — ohne
   GAEB-Vollausbau).

### P2 — Portal zum Produkt machen (Wochen–2 Monate)

9. **Portal-Ausbau auf Basis der vorhandenen `ClientPage`:** Fotos/Zeitstrahl
   pro Fläche, kommende + vergangene Einsätze (read-only), Berichte-Bereich
   (PDF-Downloads), Ansprechpartner-Karte, genau eine Interaktion
   (Kommentar/Freigabe je Plan bzw. Angebot).
10. **Benachrichtigungen:** E-Mail (Supabase/Edge) für „LUMA war da (+Fotos)",
    Saison-Hinweise, Bericht verfügbar — die Pull-Momente aus
    `CUSTOMER_STRATEGY.md`.
11. **Pilot-Onboarding:** 1–2 Bestandskunden (z. B. die aktivsten der 11
    Clients) mit echtem Account, gefülltem Portal und erstem Bericht; daraus
    Referenz + Preisvalidierung für den Biom-Vertrag.
12. **Förder-Lotse kundenseitig:** MANA-CHANCEN-Ergebnisse pro Kundenfläche
    kuratiert ins Portal/Verkaufsgespräch („Für Ihren Hof: GründachPLUS bis
    60.000 €"). Verkauft Projekte, kostet fast nichts — die Pipeline existiert.

### P3 — Optionen (Quartale, nur nach Pull)

13. Öffentliches `/explore` ohne Login + teilbare Projekt-Links; Florales-
    Wizard public als Lead-Gen.
14. Partner-Rolle (Subunternehmer: zugewiesene Einsätze, Infoblatt,
    Foto-Pflicht) — wenn Kapazität zum Engpass wird.
15. Baumdienstleistungs-Paket für Bezirke/Wohnungswirtschaft (Erfassung via
    BIOME/TreeQuickForm, Kontrolle, Pflegeplan, Open-Data-Export passend zur
    BäumePlus-Berichtspflicht) — reiten auf der 440.000-Bäume-Welle als
    Dienstleister, nicht als Kataster-Software-Anbieter.
16. Sensorik nur mit realem Use-Case (z. B. Bewässerungssteuerung Jungbäume =
    messbarer Anwuchs-Nachweis), sonst streichen.

### Ausdrücklich NICHT bauen (jetzt)

- GAEB-/LV-Vollunterstützung, Mahnwesen, Lohnbuchhaltung → Kaufsoftware-Terrain.
- SaaS-Vertrieb an fremde GaLaBau-Betriebe.
- Biodiversity-Credit-Infrastruktur (Markt existiert noch nicht).
- Weitere interne Komfort-Features (Themes, 3D-Feinschliff), bis P0–P2 stehen —
  die letzten Wochen zeigen eine Drift Richtung Breite statt Aktivierung.

---

## 7. Roadmap-Vorschlag

**Nächste 90 Tage („ein Kunde, ein Bericht, eine Rechnung"):**
P0 komplett → MANA scharf → Jahresbericht-PDF → Portal-Minimalausbau
(Fotos, Einsätze, Berichte, Kontakt) → 1–2 Pilotkunden onboarden →
erste E-Rechnung aus der Plattform → Biom-Vertrag als Angebot schnüren und
den Piloten anbieten.

**Monate 4–12:** Benachrichtigungen + Saisonlogik, Förder-Lotse kundenseitig,
Angebots-Workflow, 5–10 zahlende Biom-Verträge (Ziel: ~1.500–4.000 €/Monat
wiederkehrend als Boden), öffentliches Explore + Florales-Wizard als
Lead-Kanal, Entscheidung über Partner-Rolle nach Kapazitätslage.

**Danach (Optionen nach Beweislage):** Baum-Paket B2G, White-Label/Franchise,
Monitoring-Produkte, ggf. Credits.

---

## 8. Gesamturteil

Die Plattform „macht Sinn" — aber heute nur für eine der vier Nutzergruppen.
Sie ist ein überdurchschnittlich gutes internes Werkzeug mit zwei echten
Alleinstellungen (BIOME-Geo-Stack mit Berliner Klimadaten + fachlich tiefe
Florales-Datenbasis), einer klugen, aber unumgesetzten Kundenstrategie und
einer offenen Flanke bei Sicherheit/Reproduzierbarkeit. Der Markt gibt die
Richtung eindeutig vor: wachsendes öffentliches/klimagetriebenes Segment,
regulatorischer Rückenwind in Berlin, dokumentierte Pain Points bei
Förderung, Pflege und Nachweis — und eine unbesetzte Lücke für integriertes
„Planung + Umsetzung + Pflege + Förderung + Monitoring". Das ökonomische
Modell ist deshalb nicht „Software verkaufen", sondern **Dienstleistung mit
Plattform-Rendite**: intern Marge sichern, extern Nachweis + Bindung
verkaufen, wiederkehrende Biom-Verträge aufbauen. Der Engpass ist nicht
Code, sondern Aktivierung: Der wichtigste nächste Meilenstein der Plattform
ist ihr erster echter Kunde.

---

## 9. Quellen & Vorbehalte (Auswahl)

Branchenzahlen: BGL-Branchenstatistik 2025 via NEUE LANDSCHAFT
(neuelandschaft.de, 2025/26); BGL-Frühjahrsumfrage 2026 (neuelandschaft.de,
bau.bi); bauhof-online.de (Fachkräfte, Realumsatz). Gebäudegrün:
BuGG-Marktreport 2025 (gebaeudegruen.info). Regulierung: KAnG
(gebaeudeforum.de, klimastadtraum.de); Klimaanpassungsgesetz Berlin/BäumePlus
(Wikipedia, entwicklungsstadt.de, parlament-berlin.de, 2025); BFF + §36a BWG
(berlin.de, regenwasseragentur.berlin); CSRD-Omnibus (advant-beiten.com,
ebnerstolz.de, kleeberg.de, 2025/26); EU-NRR (bfn.de, oeko.de, 2026).
Förderung: GründachPLUS (ibb-business-team.de, Richtlinie 1/2026); BENE 2
(foerderdatenbank.de); KfW 444 (kfw.de-Merkblatt 2026); AULR/KlimaRäume
(neuelandschaft.de, bbsr.bund.de, 2026). Kommunen-Pain-Points:
Difu-Kommunalbefragung 2024 (difu.de, 7/2025), OB-Barometer 2025/26 (difu.de).
Berlin operativ: Tagesspiegel/BUND Berlin (Personalnot Grünflächenämter);
zfk.de (BWB/Schwammstadt). Wettbewerb: dataflor.de, ks21.de, plancraft.com,
craftboxx.de, the-playbook.de (Konsolidierung OneQrew/Craftview); greehill
(egovernment.de, garten-landschaft.de); NatureMetrics, greenpass.io; Nature
Credits (table.media, haufe.de, PwC, 2025).

**Vorbehalte:** Förderprogramm-Status ist volatil (Antragsstopps!) — vor
Kundeneinsatz tagesaktuell auf der Primärquelle prüfen. ANK-Volumen (3,5 vs.
4,5 Mrd. €) widersprüchlich belegt. Berlin/Brandenburg-Regionalzahlen zum
GaLaBau nicht öffentlich verfügbar. Einzelne Kostenwerte (EPS je Baum)
journalistisch, nur indikativ. DB-Nutzungszahlen: Stichtag 22.07.2026.
