# BLOCKED — was den Loop aufhält

Stand: 2026-08-09

Hier steht, was nicht weitergeht und warum. Nichts davon wird umgangen, geraten
oder durch etwas Ähnliches ersetzt. Wo eine Entscheidung von Malte nötig ist,
steht sie unter „Entscheidungen".

---

## 1 · Bar 2 (Produktbar) — der Browser kommt nicht ins Internet

**Blockiert:** den Blindvergleich mit Screenshots gegen alle Incumbents (GBIF,
Global Forest Watch, Map of Life, Natura-2000-Viewer, Umweltatlas Berlin,
Restor).

**Befund, selbst geprüft am 2026-08-09:** Chromium (`/opt/pw-browsers/chromium`)
bekommt bei jedem Aufruf `net::ERR_CONNECTION_RESET`, auch bei `example.com`.
Geprüfte Varianten, alle mit demselben Ergebnis:

1. ohne Proxy-Angabe (Chromium liest `HTTPS_PROXY` nicht),
2. `--proxy-server=http://127.0.0.1:33217`,
3. Playwrights `proxy`-Option,
4. zusätzlich mit `--disable-quic`.

Das Proxy-CA-Bundle wurde vorher in die NSS-Datenbank des Browsers importiert
(`certutil -d sql:~/.pki/nssdb`, sechs Zertifikate, Vertrauen `C,,`), das war
also nicht die Ursache. `curl --cacert /root/.ccr/ca-bundle.crt` erreicht
dieselben Hosts mit HTTP 200. Der Egress-Proxy lässt browser-initiierte
CONNECTs offenbar nicht durch.

**Was das heißt:** Es gibt in dieser Umgebung keine echten
Incumbent-Screenshots. Bar 2 kann nicht als Blindvergleich gefahren werden.

**Wie damit umgegangen wird — und wie ausdrücklich nicht:**
- Screenshots von Fremdprodukten werden **nicht** erfunden, nicht nachgebaut
  und nicht aus dem Gedächtnis beschrieben.
- Für Incumbents mit offener API oder abrufbarer HTML-Seite (GBIF) wird ein
  **Funktionsvergleich ohne Screenshot** gefahren und im Verdikt als
  `bar: "funktionsvergleich"` gekennzeichnet — das ist ausdrücklich **nicht**
  die Produktbar und zählt nicht als deren Bestehen.
- Für ARCHIKART und pit gilt ohnehin die Funktionslücken-Bar gegen deren
  öffentliche Beschreibungen.

**Was es auflösen würde:** Screenshots als Dateien unter `refs/comps/<produkt>/`
ablegen (die Ordner liegen bereit und sind leer), oder eine Umgebung, in der
der Browser hinausdarf.

---

## 2 · QGIS ist nicht installiert

**Blockiert:** Bar 2 für `w1-bestandsuebergabe` (Vergleich gegen QGIS lokal,
Attributtabelle exportieren).

**Befund:** kein `qgis`, kein `qgis_process`, kein Python-Modul `qgis`,
kein `/usr/share/qgis`.

**Umgang:** Bar 2 für diesen Job ist ausgesetzt, nicht ersetzt. Der Job wird
gegen Methode, Recht und Aufgabe geprüft und das Aussetzen im Verdikt vermerkt.

---

## 3 · FLL-Regelwerke sind kostenpflichtig

**Blockiert:** jede Beschriftung und jede Auswahlliste, die sich auf FLL beruft.

**Befund** (siehe `refs/standards/01-baeume.md`, Abschnitt „Nicht zugänglich"):

| Regelwerk | Preis | frei verfügbar |
|---|---|---|
| FLL-Baumkontrollrichtlinien 2020 | 44,00 € (PDF) | 9-seitige Leseprobe |
| FLL ZTV-Baumpflege 2017 | 44,00 € (PDF) | 17-seitige Inhaltsübersicht |
| FLL-Baumuntersuchungsrichtlinien 2013 | im Paket 70,00 € | nicht abgerufen |

**Unmittelbare Folge für das laufende Produkt:** Die Oberfläche führt heute
Baumfelder unter der Beschriftung „FLL-Daten" und „Alle FLL-Felder ausfüllen"
(`src/components/FeaturePanel.jsx`, `src/components/TreeQuickForm.jsx`). Es gibt
keinen frei belegten FLL-Feldkatalog. Diese Beschriftung ist nicht
verteidigungsfähig und wird entfernt.

---

## 4 · Die amtliche Fassung der Berliner Baumschutzverordnung ist nicht abrufbar

**Blockiert:** ein rechtsverbindliches Zitat mit Änderungsstand.

**Befund:** `gesetze.berlin.de` liefert unter fünf geprüften Pfaden nur eine
5.519 Byte große JavaScript-Hülle ohne Normtext und setzt
`<meta name="tdm-reservation" content="1">`.

**Umgang:** `refs/standards/01-baeume.md` stützt die Messhöhe 1,30 m auf die
FAOLEX-Wiedergabe und den Senatsflyer. Für eine Schutzstatus-Anzeige mit
Rechtsfolge reicht das nicht — die Anzeige nennt deshalb ihre Quelle und
bezeichnet sich nicht als Rechtsauskunft.

---

## 5 · Keine Kalibrierungshilfen für Kronenansprache und Vitalität

**Blockiert:** eine bebilderte Erfassungshilfe im Feld.

**Befund:** Die Bildreihe Meining et al. (2007), auf die der
WZE-Leitfaden verweist, liegt nicht frei vor. Ebenso die Abbildungen aus
ROLOFF 2001 zu den Vitalitätsstufen VS 0–3.

**Umgang:** BIOME kann die Felder anbieten (die Skalen selbst sind wörtlich
belegt), aber keine Bildreihe zeigen. Die Oberfläche sagt das an Ort und Stelle,
statt eine Kalibrierung vorzutäuschen.

---

## 6 · Produktionsdatenbank enthält keine BIOME-Daten

**Blockiert:** Playwright-Abnahme gegen echte Daten.

**Befund:** Der Datenkern ist neu; in der Produktionsdatenbank sind alle
`biome_*`-Tabellen leer. Die Abnahme darf nicht gegen Produktionsdaten laufen
und Testdaten dürfen nicht in die Produktion.

**Umgang:** `fixtures/ground_truth.sql` ist die eine Wahrheit. Daraus wird der
Datenstand für den Migrations-Prüfstand (lokaler PostgreSQL) und für den
Fixture-Modus der Oberfläche erzeugt. Beide zeigen dieselben Zahlen — sonst
prüft der Daten-Critic gegen etwas anderes als die Oberfläche zeigt.

---

## 7 · gdi.berlin.de über den Proxy: TLS-Fehler

**Nicht blockierend, aber zu wissen.**

`curl https://gdi.berlin.de/...` scheitert ohne `--cacert
/root/.ccr/ca-bundle.crt` mit „self-signed certificate in certificate chain".
Mit CA-Bundle gab es im Test weiterhin einen TLS-Fehler, während andere Hosts
sauber liefen. Die Karten-Ebenen der App laden im Browser des Anwenders direkt,
nicht über diesen Proxy — für den Betrieb also ohne Folge, für automatisierte
Prüfungen aus dieser Umgebung heraus schon.

---

## 8 · Fehlendes Dokument, auf das die Datenbank verweist

Die Tabelle `ausgleichsmassnahme` trägt den Kommentar „Siehe
docs/AUSGLEICHSMASSNAHMEN.md." Diese Datei existiert im Repository nicht. Die
Migration selbst war ebenfalls nie abgelegt und wurde am 2026-08-09 aus der
laufenden Datenbank rekonstruiert (`supabase/migrations/20260729_ausgleichsmassnahmen.sql`).
Der Fachtext dazu fehlt weiterhin und wird nicht erfunden.

---

## Entscheidungen, die nur Malte treffen kann

1. **Welche Zustandsskala ist die Leitskala für Bäume?**
   Frei belegbar sind drei zueinander unvereinbare Systeme:
   - Kronenverlichtung 0–100 % in 5-%-Stufen mit Schadstufen 0–4
     (Waldzustandserhebung, gilt laut Quelle für Waldbäume),
   - Roloff-Vitalitätsstufen VS 0–3 plus Sonderstufen S und K (Einzelbaum),
   - die zweistufige kontrollbezogene Einteilung aus der BADK/GALK-Musterdienstanweisung.

   Eine vierstufige „FLL-Zustandsstufe" ist **nicht** belegbar. Die heute in
   der Oberfläche geführte Vitalität 0–4 („Keine / Leichte / Mäßige / Starke
   Einschränkung / Abgestorben") entspricht keinem dieser Systeme und wird
   entfernt, bis eine Leitskala feststeht.

2. **FLL-Regelwerke kaufen?** 88,00 € für Baumkontrollrichtlinien und
   ZTV-Baumpflege als PDF, oder 70,00 € für das Themenpaket
   Baumkontroll- + Baumuntersuchungsrichtlinien. Ohne sie bleiben
   Begriffskatalog, Zustandsstufen und Maßnahmenliste dauerhaft unbelegt.
   Zu beachten: Auch nach Kauf gilt „Nachdruck nur in vollständiger Fassung mit
   ausdrücklicher Genehmigung" — der Wortlaut dürfte dann im Register zitiert,
   aber nicht als BIOME-Inhalt ausgeliefert werden.

3. **Messhöhe im Berliner Kataster.** Für `stammumfg` im GRIS ist keine
   Messhöhe dokumentiert. Soll BIOME den Katasterwert als „in 1,30 m gemessen"
   behandeln oder als „Messhöhe unbekannt" führen? Für den Vergleich mit
   eigenen Messungen ist das entscheidend.

4. **Nullwert-Konvention im Berliner Kataster.** `kronedurch = 0` betrifft
   38.590 von 434.765 Straßenbäumen, `baumhoehe = 0` weitere 3.305. Ob 0 „nicht
   erhoben" heißt, ist nirgends dokumentiert. Empfehlung: als Fehlwert
   behandeln — das ist aber eine Setzung, keine Ableitung.

5. **Geltungsbereich Welle 1.** Der Berliner Datensatz enthält nur Bäume in
   Zuständigkeit der Bezirksämter. Bäume bei Wohnungsbaugesellschaften, auf
   Friedhöfen und Sportanlagen fehlen. Braucht BIOME von Anfang an ein Feld für
   die Datenherkunft (Kataster gegen Eigenerfassung)?

6. **Screenshots der Vergleichsprodukte.** Ohne sie bleibt Bar 2 ausgesetzt
   (siehe Punkt 1). Sollen sie außerhalb dieser Umgebung aufgenommen und unter
   `refs/comps/` abgelegt werden?
