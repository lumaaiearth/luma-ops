# Pflegeplanung 2026+ — Konzept für LUMA Ops

**Stand:** 21.07.2026 · **Basis:** Pflegepläne 2026 aus Google Drive (BEW, JOPE, ALLCURA), Beispiel-Angebot AN-57 (BEW/MV), Live-Daten und Code der LUMA-Ops-Plattform.

---

## 1. Kurzfassung

Die Analyse der drei Excel-Pflegepläne gegen die reale Kapazität zeigt: **Das Problem ist nicht der Preis, sondern die Form der Planung.**

1. **Die Jahresmenge passt, die Verteilung nicht.** 2026 sind über alle 11 Standorte **654 h** Pflege geplant. Zwei Minijob-Kräfte liefern ca. **62 h/Monat ≈ 741 h/Jahr** — rechnerisch genug. Aber die Pläne ballen die Arbeit: **April braucht 142 h, November 158 h** — mehr als das Doppelte der Monatskapazität. Juni–September liegen mit 64–81 h ebenfalls konstant über den 62 h. Deshalb fühlt es sich dauerhaft nach „zu wenig Arbeitskraft" an, obwohl Januar–März und Dezember fast leer sind.
2. **Die Schätzungen werden nie kalibriert.** Die Pläne basieren auf Erfahrung, aber es gibt keinen systematischen Plan/Ist-Vergleich je Standort. „Meist ist es mehr Arbeit als gedacht" bleibt ein Gefühl statt einer Zahl, mit der man das nächste Angebot korrigieren könnte. Anfahrt/Rüstzeit (Arbeitstag = 10 h inkl. An-/Abfahrt) steckt in den Plan-Stunden gar nicht drin.
3. **Angebote zeigen einen Stundenberg statt einer Leistung.** „90,25 Std × 50 €" (AN-57) ist für den Kunden eine große abstrakte Zahl. Der ALLCURA-Vertrag zeigt das Gegenmodell, das Hausverwaltungen kennen: **Leistungsverzeichnis + Jahrespauschale, Abrechnung in Teilbeträgen.** Gleiches Geld, ganz andere Wahrnehmung.

**Der smarte Weg:** Die Pflegeplanung von Excel in LUMA Ops holen — als Kette **Pflegeplan → Pflegegänge (Einsätze mit Soll-Stunden) → Kapazitätsabgleich → Zeiterfassung je Einsatz → Plan/Ist-Kalibrierung → Angebot auf Knopfdruck**. Fast alle Bausteine existieren schon in der Plattform (Projekte, Einsätze, Wochenplan, Zeiterfassung, Stundenkonten, Verrechnungssätze); es fehlt die verbindende Pflegeplan-Ebene. Kapitel 5–7 beschreiben Datenmodell, UI und einen Fahrplan in 4 Phasen, Kapitel 8 die Sofortmaßnahmen für den Rest der Saison 2026.

---

## 2. Ist-Analyse: Zahlen 2026

### 2.1 Geplante Pflegestunden je Standort (aus den Drive-Excel-Plänen)

| Standort | Jan | Feb | Mrz | Apr | Mai | Jun | Jul | Aug | Sep | Okt | Nov | Dez | **Jahr** | Umsatz @ 50 €/h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| JOPE H14 | – | – | 1 | 11 | 7 | – | 6 | – | 7 | 6 | 11 | – | **49,0** | 2.450 € |
| JOPE S3 | – | – | – | 32,4 | – | 13,5 | 13,5 | – | 13,5 | 4 | 30,4 | 4 | **111,2** | 5.560 € |
| JOPE R95 | – | – | – | 29,4 | – | 13,5 | 15,5 | – | 13,5 | – | 39,4 | – | **111,2** | 5.560 € |
| JOPE P15 | – | – | – | 16 | – | 5,5 | 6,5 | – | 4,5 | 2 | 14 | 2 | **50,5** | 2.525 € |
| JOPE X13 | – | – | – | 15,3 | – | 9 | 9 | – | 9 | – | 13,8 | – | **56,2** | 2.810 € |
| BEW BL | – | – | 4 | 15 | 11 | 9 | 10 | 9 | 10 | 9 | 16 | – | **93,0** | 4.650 € |
| BEW MV | – | – | – | 18,2 | 9,5 | 9,5 | 9,5 | 9,5 | 9,5 | 9,5 | 15 | – | **90,25** | 4.512,50 € |
| BEW SH | – | – | – | 5 | – | – | – | – | – | – | 2 | – | **7,0** | 350 € |
| BEW AG | – | – | – | – | – | – | – | – | – | – | 8 | – | **8,0** | 400 € |
| ALLCURA Seebadstr. | – | – | – | – | – | – | 5 | 2 | 3 | 8 | – | 8 | **26,0** | 1.300 € |
| ALLCURA Roedernstr. | – | – | – | – | – | 4 | 6 | 4 | 6 | 16 | 8 | 8 | **52,0** | 2.600 € |
| **Bedarf gesamt** | **0** | **0** | **5** | **142,3** | **27,5** | **64** | **81** | **24,5** | **76** | **54,5** | **157,6** | **22** | **654,4** | **32.717,50 €** |
| Kapazität 2 Minijobs (2 × 30,88 h) | 61,8 | 61,8 | 61,8 | 61,8 | 61,8 | 61,8 | 61,8 | 61,8 | 61,8 | 61,8 | 61,8 | 61,8 | **741,1** | |
| **Delta** | +61,8 | +61,8 | +56,8 | **−80,5** | +34,3 | −2,2 | −19,2 | +37,3 | −14,2 | +7,3 | **−95,8** | +39,8 | +86,7 | |

*(Monatszuordnung wie in den Plänen: KW-Spalten den Monaten zugeordnet; ALLCURA ab Vertragsbeginn Mai 2026.)*

### 2.2 Befunde

1. **Frühjahrs-/Herbstspitze sprengt die Kapazität um Faktor 2,3–2,6.** Der April-Bedarf (142 h) entspricht ca. 18 Personen-Tagen, verfügbar sind ~8. Im November noch extremer. Die Pläne legen zudem ganze Standort-Frühjahrskuren in **eine einzige KW** (z. B. S3: 32,35 h in KW 15) — das ist mit 1 Team-Tag/Woche physisch unmöglich und erzeugt den Dauerrückstand.
2. **Sommer knapp unter Wasser.** Jun–Sep liegen je 2–19 h über der Monatskapazität — noch ohne Anfahrt. Rechnet man pro Einsatztag realistisch 1–2 h Fahrt/Rüsten dazu (bei ~2 Einsatztagen/Woche schnell +10–15 h/Monat), ist jeder Sommermonat strukturell unterdeckt. **Das ist die Zahl hinter „es ist immer mehr Arbeit als gedacht".**
3. **Januar–März und Dezember sind leer** (0–5 h). Die Minijob-Stunden laufen aber weiter (siehe Stundenkonten: Übertrag 13,26 h bzw. 42,5 h aus 2025). Winterleistungen (Gehölzschnitt, Werkzeugpflege, Winterdienst-Kontrollen, Vogelkästen/Habitatpflege) sind nicht eingeplant und nicht verkauft.
4. **Kein Plan/Ist-Regelkreis.** Ist-Stunden liegen verstreut (ALLCURA-Doku-Tab im Excel, 63 Zeiteinträge in der Plattform, Foto-Ordner je Einsatz im Drive). Nichts davon fließt zurück in die Planwerte oder ins nächste Angebot.
5. **Angebots-Unschärfe.** AN-57 nennt den Leistungszeitraum 20.07.2026–31.12.2027 (≈ 17 Monate), setzt aber 90,25 h an — den Planwert für das **Kalenderjahr** 2026. Solche Unschärfen entstehen zwangsläufig, wenn Angebote händisch aus Jahres-Excel abgeleitet werden, und fallen im Zweifel LUMA auf die Füße.
6. **Preisniveau ist nicht das Problem.** 50 €/h netto liegt für Berlin im GaLaBau eher am unteren Rand (übliche Verrechnungssätze Helfer/Facharbeiter ca. 45–75 €/h). Der ALLCURA-Vertrag impliziert sogar ~58–69 €/h (1.512 €/26 h bzw. 3.573 €/52 h für 2027). „Zu teuer" ist ein **Darstellungs- und Vertrauensproblem** (großer Stundenblock, wenig sichtbare Gegenleistung), kein Stundensatzproblem.

---

## 3. Wie ein professioneller GaLaBau-Betrieb Pflege 2026 organisiert

Der Branchenstandard (Hausverwaltungen, Wohnungswirtschaft, öffentliche Auftraggeber) sieht so aus — ALLCURA hat ihn LUMA quasi vorgemacht:

1. **Objektstammblatt + Leistungsverzeichnis je Objekt.** Flächenkennzahlen (m² Rasen, m² Pflanzfläche, lfm Hecke, Wege), Zugänge, Wasseranschlüsse, Besonderheiten. Leistungen als Turnus formuliert: „mtl. Rasenmahd (Apr–Okt)", „Wildkrautentfernung 3–4× p. a.", „Heckenschnitt 2× (Jun, Sep)".
2. **Pflegegänge statt Stunden-Matrix.** Geplant wird in *Besuchen* (Pflegegang = 1 Anfahrt, gebündelte Aufgaben, feste Crew, Soll-Dauer). Der Jahresplan ist eine Liste von Pflegegängen je Objekt, nicht eine KW×Aufgaben-Stundenmatrix.
3. **Tourenplanung.** Objekte desselben Auftraggebers/Kiezes am selben Tag (alle 5 JOPE-Objekte = 1–2 Tourtage), Anfahrt einmal statt fünfmal.
4. **Zeiterfassung je Pflegegang** (mobil, mit Foto-Nachweis) und **Leistungsnachweis an den Kunden** — das ist zugleich Rechnungsgrundlage und „Zu-teuer"-Prävention.
5. **Nachkalkulation.** Je Objekt: verkaufte Stunden vs. geleistete Stunden vs. Kosten → Deckungsbeitrag. Objekte mit Faktor > 1,2 (Ist/Plan) werden im Folgejahr teurer oder im Umfang angepasst — mit Daten begründbar.
6. **Angebot = Jahrespauschale mit Leistungsverzeichnis**, monatlich oder in Dritteln abgerechnet. Stunden sind interne Kalkulation, nicht Verkaufsargument. Zusatzarbeiten außerhalb des LV ausdrücklich nach Aufwand (macht die Pauschale schlank und verteidigbar).
7. **Kapazität als Jahresganglinie.** Personalstunden je Monat vs. verkaufte Pflegestunden je Monat; Spitzen werden geglättet (Zeitfenster statt Stichwoche), Rest über Saisonkräfte/Springer gedeckt.

---

## 4. Zielbild für LUMA: der Regelkreis

```
Pflegeplan (je Standort & Jahr)
   │  Aufgaben mit Saisonfenster + Soll-h  ──────────────┐
   ▼                                                     │
Pflegegänge (generiert, je KW, Soll-h, Crew)             │ Kalibrierung
   ▼  per Drag&Drop terminieren                          │ (Ist/Plan-Faktor
Einsätze (jobs) im Wochenplan, Team zugewiesen           │  je Standort)
   ▼  Pflegekräfte buchen Zeit + Fotos auf den Einsatz   │
Zeiterfassung (time_entries.job_id) + job_photos         │
   ▼                                                     │
Plan/Ist je Standort & Aufgabe  ─────────────────────────┘
   ▼
Angebot & Rechnung (aus Plan generiert, kein Excel mehr)
```

Damit beantwortet die Plattform genau die vier Bedürfnisse: **Klarheit** (ein Plan, eine Wahrheit), **Planbarkeit** (Kapazitätsampel Monate im Voraus), **gute Ergebnisse** (nichts fällt runter — jeder Pflegegang ist ein Einsatz mit Status), **faire, einfache Angebote** (generiert aus kalibrierten Zahlen).

---

## 5. Datenmodell (baut auf Bestehendem auf)

Vorhanden und wiederverwendet: `projects` (alle 11 Pflege-Standorte existieren bereits als Projekte), `clients` + `billing_rates` (50 €/h je Kunde gepflegt), `jobs` (Einsätze inkl. Status, Crew, Fahrzeug, Fotos), `time_entries` (mit `job_id`), `hour_rules`/`user_availability`/`user_absences` (Kapazitätsbasis), `person_cost_rates` (interne Kosten), `people` (Freelancer als Springer). `recurring_templates` (starres Intervall) wird für Pflege **nicht** genutzt — Pflege folgt Saisonfenstern, nicht „alle N Tage".

Neu (eine Migration, RLS wie üblich `is_internal()` / Angebote `is_admin()`):

```sql
-- Jahres-Pflegeplan je Standort
create table pflege_plaene (
  id uuid primary key default gen_random_uuid(),
  project_id text references projects(id),
  jahr int not null,
  status text default 'entwurf',        -- entwurf | aktiv | abgeschlossen
  stundensatz numeric,                  -- default: billing_rates des Kunden
  kalib_faktor numeric default 1.0,     -- Ist/Plan-Faktor aus Vorjahr
  notizen text,                         -- Zielbild/Objektbeschreibung (heute NOTES-Zeile im Excel)
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (project_id, jahr)
);

-- Aufgaben im Plan (aus zentralem Katalog, s. u.)
create table pflege_aufgaben (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references pflege_plaene(id) on delete cascade,
  katalog_key text,                     -- z. B. 'rueckschnitt_gehoelze'
  titel text not null, beschreibung text,
  kategorie text,                       -- pflanzen | bewaesserung | spezial
  -- Saisonfenster statt fixer KW: [{von_monat, bis_monat, turnus, stunden_pro_gang}]
  -- turnus: 'einmalig' | 'monatlich' | '2x_monat' | 'quartal' | 'nach_bedarf'
  fenster jsonb not null default '[]',
  jahres_stunden numeric,               -- Summe (redundant, für schnelle Kalkulation)
  sort_order int default 0
);

-- Generierte Pflegegänge (Planungseinheit; wird beim Terminieren zum Job)
create table pflege_gaenge (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references pflege_plaene(id) on delete cascade,
  jahr int not null, kw int not null,
  titel text,                           -- z. B. 'Frühjahrskur 1/3', 'Sommerpflege Juli'
  aufgaben jsonb default '[]',          -- [{aufgabe_id, stunden}]
  soll_stunden numeric not null,        -- Vor-Ort-Stunden
  fahrt_stunden numeric default 1.5,    -- Anfahrt/Rüsten je Gang — endlich explizit!
  crew_size int default 2,
  job_id text references jobs(id),      -- gesetzt sobald terminiert
  status text default 'geplant'         -- geplant | terminiert | erledigt | entfallen
);

-- Angebote (endlich persistent, statt nur calcAngebot() im Speicher)
create table angebote (
  id uuid primary key default gen_random_uuid(),
  client_id text references clients(id),
  titel text, angebotsnummer text,
  zeitraum_von date, zeitraum_bis date,
  stundensatz numeric,
  positionen jsonb default '[]',        -- [{project_id, beschreibung, stunden, betrag}]
  summe_netto numeric,
  abrechnung text default 'monatlich',  -- monatlich | drittel | einmalig
  status text default 'entwurf',        -- entwurf | versendet | angenommen | abgelehnt
  quelle_plan_ids uuid[],               -- Rückverweis auf pflege_plaene
  notizen text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

alter table jobs add column if not exists planned_hours numeric;  -- Soll-h je Einsatz (auch außerhalb Pflege nützlich)
```

**Aufgaben-Katalog:** Die drei Excel-Pläne benutzen bereits denselben ~17-Zeilen-Katalog (Stauden/Beikräuter, Gehölzschnitt, Düngen, Wege, Mahd, Bewässerung an/ab/auffüllen, IBC, Kletterhilfen, Nachpflanzung, Mulch, Bioreaktor, …). Der wird einmalig als Konstante/Seed hinterlegt (`src/data/pflegeKatalog.js`) — neue Pläne entstehen dann per Ankreuzen + Stunden statt Excel-Kopie. Die Ausnahme-Aufgaben (Lehmquelle SH, Dachgarten P15, Bienenweide BL) bleiben als freie Positionen möglich.

**Plan/Ist braucht keine neue Tabelle:** Ist = `time_entries` je `job_id` → `pflege_gaenge.job_id` → Plan. Der `kalib_faktor` des Folgejahresplans wird daraus vorgeschlagen.

---

## 6. UI: eine neue Seite „Pflege" (+ zwei kleine Erweiterungen)

**Neue Seite `PflegePage` mit 4 Tabs:**

1. **Pläne** — je Standort & Jahr der Pflegeplan als Matrix (Aufgaben × Monate, editierbare Stunden — bewusst nah am vertrauten Excel-Layout), plus Kopf mit Jahres-Summe, Umsatz, Kalibrierungsfaktor, Zielbild-Notiz. Button „Pflegegänge generieren": bündelt die Aufgaben-Fenster in konkrete Gänge je KW (Monatsfenster → 1 Gang/Monat; Frühjahrs-/Herbstkur → 2–3 Gänge über das Fenster verteilt statt einer Monster-KW).
2. **Kapazität** — Jahresganglinie: Balken „Bedarf h/Monat" (alle Pflegegänge inkl. Fahrtstunden) vs. Linie „verfügbar h/Monat" (aus `hour_rules` der Pflegekräfte + `user_availability`/`user_absences`). Ampel je Monat; darunter die konkreten Lücken: *„KW 15: 34 h Bedarf, 8 h Pflege-Kapazität → 26 h Team/Springer nötig"* mit Ein-Klick-Zuweisung an Malte/Lukas/Robert oder Freelancer (`people`). Damit ist „wenn es die Kraft der beiden übersteigt, muss jemand anders ran" nicht mehr Bauchgefühl, sondern eine Liste Monate im Voraus.
3. **Plan/Ist** — je Standort: Soll-h vs. gebuchte h (laufendes Jahr), Abweichung in % und €, Ampel; je Aufgabe aufklappbar. Vorschlag „Kalibrierung fürs nächste Jahr: Faktor 1,25" auf Basis der Daten.
4. **Angebote** — Liste + Generator: Kunde wählen → zieht die aktiven Pflegepläne → erzeugt Angebots-Entwurf mit Leistungsverzeichnis-Positionen je Standort (aus dem Aufgaben-Katalog), Jahresstunden **intern**, nach außen Pauschale mit gewählter Abrechnung (monatlich/Drittel). Export als Text/PDF zum Einfügen ins Rechnungstool (Format wie AN-57: Kopf-Text, Positionen, Fuß-Text — aber mit sauberem Leistungszeitraum).

**Erweiterungen bestehender Seiten:**
- **Wochenplan/Einsätze:** Backlog-Spalte „Fällige Pflegegänge" (Status `geplant`, KW ≤ aktuelle KW + 2) zum Drag-&-Drop-Terminieren → erzeugt `job` mit `planned_hours`, verlinkt den Gang. Im Einsatz sichtbar: Soll-h vs. bisher gebuchte h.
- **Kundenportal:** Erledigte Pflege-Einsätze mit Datum, Leistungen und 2–3 Fotos je Standort anzeigen (Daten existieren: `jobs` + `job_photos`; CUSTOMER_STRATEGY.md schlägt genau das vor). Das ist der stärkste Hebel gegen „zu teuer": Der Kunde *sieht* die 90 Stunden.

---

## 7. Umsetzungsfahrplan

| Phase | Inhalt | Aufwand (grob) |
|---|---|---|
| **0 — sofort, ohne Code** (KW 30–31) | Rest-2026-Pflegegänge aus den Excel-Plänen als `jobs` mit Crew anlegen; Zeiterfassung ab sofort konsequent **je Einsatz** (`job_id`), Fotos in `job_photos` statt Drive-Ordner. Ab da wachsen echte Ist-Daten. | 2–3 h Fleiß |
| **1 — Datenmodell + Import** | Migration aus Kap. 5; Import-Script für die drei Excel-Pläne (Struktur ist einheitlich, KW-Matrix bekannt); Aufgaben-Katalog als Seed. | 1–2 Tage |
| **2 — PflegePage: Pläne + Kapazität** | Matrix-Editor, Gänge-Generator, Kapazitäts-Tab mit Ampel + Springer-Zuweisung; Wochenplan-Backlog. | 3–5 Tage |
| **3 — Plan/Ist + Angebote** | Plan/Ist-Tab, Kalibrierungsvorschlag; `angebote`-Tabelle + Generator + Text/PDF-Export. | 3–4 Tage |
| **4 — Kundenportal-Transparenz** | Erledigte Einsätze + Fotos im Portal; optional Quartals-Leistungsnachweis als PDF/Mail. | 2–3 Tage |

Phasen 1–3 sind der Kern („Planung + faires Angebot"), Phase 4 die Kundenbindung. Jede Phase ist einzeln nach `main` mergebar.

---

## 8. Konkrete Empfehlungen für Saison 2026/27 (unabhängig von der Software)

1. **Spitzen glätten:** Frühjahrskur ist ein *Fenster* (Mitte März–Ende April, 3–4 Gänge), Herbstkur ebenso (Mitte Okt–Anfang Dez). Nie mehr >12 h Standort-Arbeit in eine KW legen. Allein das entschärft April/November um mehr als die Hälfte.
2. **Touren bündeln:** JOPE-Tag(e) (H14+S3+R95+P15+X13 liegen bei einem Auftraggeber), BEW-Tag (BL+MV+SH). Spart je gebündeltem Termin ~1–1,5 h Fahrt/Rüsten.
3. **Springer-Bedarf jetzt planen:** Für Herbst 2026 stehen ~158 h im November im Plan. Das sind bei 2 Minijobs mindestens **8–10 zusätzliche Personen-Tage** aus dem Team (Malte/Lukas/Robert) oder Freelancern — jetzt in den Kalender, nicht im November improvisieren.
4. **Fahrzeit einpreisen:** Je Pflegegang pauschal 1–1,5 h Anfahrt/Rüsten in die Kalkulation (im Stundensatz oder als Anfahrtsposition). Bisher arbeitet LUMA diese Zeit unbezahlt.
5. **Angebote 2027 als Pauschale:** Nach ALLCURA-Vorbild je Objekt Jahrespauschale mit Leistungsverzeichnis + monatlicher Abrechnung; Stunden nur intern. Zusatzarbeiten explizit nach Aufwand. Nicht den Stundensatz senken — 50 €/h ist bereits unteres Marktniveau, und die ALLCURA-Verträge liegen implizit bei ~58–69 €/h.
6. **Winter füllen:** Jan–Mrz/Dez sind leer, die Minijob-Stunden laufen trotzdem. Winterleistungen aktiv anbieten (Gehölz-/Obstschnitt, Habitat-/Nistkastenpflege, Werkzeug/Bewässerungswartung) oder Stundenkonten bewusst als Puffer für die Frühjahrsspitze führen (Übertrag existiert ja bereits: 13,26 h / 42,5 h aus 2025).
7. **AN-57 prüfen:** Leistungszeitraum 07/2026–12/2027 (~17 Monate) vs. 90,25 h (Jahresplanwert 2026) — vor Annahme klären, sonst schenkt LUMA ein halbes Jahr Pflege her.
