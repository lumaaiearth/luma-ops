# Florales™ — Habitatplanung: Handoff / Arbeitsstand

> Arbeits-/Übergabedokument für die Weiterentwicklung von Florales™ (Pflanz- &
> Habitatplanung). Kann vor dem `main`-Merge wieder entfernt werden.
> Branch: **`claude/floralis-habitat-planning-db4z8y`** · Build grün · Migration in Prod angewandt.

## Ziel
Florales™ (`/planning`) soll nicht nur Pflanzen, sondern auch **Habitatmaßnahmen** planen und
einen **professionellen, ausführbaren Fachkräfte-Plan** erzeugen (vorbereiten · Material bestellen ·
Personal einplanen · fachgerecht einbauen · Pflege ableiten und in LUMA Ops hinterlegen). Nordstern:
Pollinator Pathmaker — aber wissenschaftlicher/professioneller, mit Stellreglern (Generator) und
starker Visualisierung. Später als kostenloses Public-Tool auf der LUMA-Website abspaltbar.

## Entscheidungen (mit Malte abgestimmt)
- Arten: heimische **und** nicht-heimische Zierarten aufnehmen; Zier als `heimisch:false` + Kennzeichnung/Filter „Zierstaude".
- Pflege→Ops: **Dialog beim Anlegen** (pro Plan wählbar, was als Aufgabe/Einsatz/Serie erzeugt wird).
- Datentiefe: **voll recherchiert** (alle Felder je Art; Habitate vollständig).
- Robustheit (alle „ja"): Offline-Outbox + Realtime für Pläne, optionales **Preisfeld**, optionales **Positionsfeld**.

## Was ist FERTIG (auf dem Branch)
- **`src/data/habitats.js`** — Habitatkatalog (17 Elemente: Totholz, Steine, Wasser, Boden, Nisthilfen)
  mit Material, Maßen, `einbau_schritte`, Zielarten, `aufwand_h`, Pflegeintervallen. + `filterHabitats()`,
  `HABITAT_KATEGORIE_LABELS/_EMOJI`, `HABITAT_ZIEL_LABELS`. Quelle: „Treffpunkt Vielfalt" (2023).
- **`supabase/migrations/20260714_pflanzplaene_habitate.sql`** — Spalte `habitate JSONB DEFAULT '[]'`
  + `pflanzplaene` in `supabase_realtime`-Publication (idempotent). **Bereits in Prod angewandt & verifiziert**
  (Projekt `eqwoyfsfyohtcibithak`).
- **`src/data/schema.sql`** — `habitate`-Spalte ergänzt.
- **`src/context/OpsContext.jsx`** — `pflanzplaene`-Schreibpfade über Outbox (`sbUpsert/sbUpdate/sbDelete`);
  Realtime-Abo für `pflanzplaene`; `habitate:[]`-Default in `createPflanzplan`.
- **`src/pages/PlanningPage.jsx`** — Habitat-UI: Katalog-Umschalter „🌱 Pflanzen | 🪵 Habitate",
  `HabitatCatalog`/`HabitatCard`/`HabitatSheet`/`HabitatPlanRow`; Habitat-Abschnitt + Stat-Cards im Plan-Tab;
  `savePflanzplan`/`loadPflanzplan` inkl. `habitate` (+ Fix: beim Update gingen `beet_*`/`flaeche_m2` verloren);
  `habitate`-Snapshot trägt optionales `position`-Feld.
- **`src/data/preise.js`** — Preis-/Kalkulationsgerüst (siehe unten).

## Datenquellen (Google Drive)
**Ordner 1** (Fachgrundlagen) `1aY9kLMPYeZpq1IsFm3-WVZG3a2zNelS8` — bereits ausgewertet:
- Treffpunkt Vielfalt (Arten + Habitate + Pflege) — File `1K64r5FA6m99tP9c_qybclM2d5y5cQsPG`
- Bruns Sortimentskatalog 2022/23 (Bezugsquelle) — File `1DX_7TGUZIr0GKQjQODgpQ7TCQbGLp77o`
- FLL Baumpflanzungen T1 (Pflanz-/Pflegestandard) — File `1CbEPEGkIJO6tk5RfY2G9w28oam2JmKxb`
- Merkblatt Ausgleichsmaßnahmen Neukölln (Pflanzplan-Layout) — File `1xCS5i-3o_P1m00qFLsvVXbwaC2nGpu5N`

**Ordner 2** (Beispiel-Angebote mit **Einkaufspreisen**) — `1uFgLQuj5IUV_RiVQUMgswSdjMui92btj`
→ **NOCH NICHT AUSGEWERTET** (Drive-Connector war zeitweise offline). **Nächster Schritt: EK-Preise hier entnehmen.**

Website (bienenfreundliche Zier-/Duftpflanzen, ~250, 6 Seiten):
`https://www.kraeuter-und-duftpflanzen.de/verwendung/bienen-und-hummelpflanzen?p=1`

## Preismodell — wohin die EK-Preise gehören (`src/data/preise.js`)
Logik: gespeicherte Werte sind **EK netto**; VK = EK + Marge; Arbeit = `aufwand_h` × Stundensatz.
- `MATERIAL_PREISE` — Map `"<material>|<einheit>": ek_netto`. Keys müssen exakt den `material`/`einheit`-Werten
  aus `habitats.js` entsprechen (z. B. `"Waschsand 0/2|m³"`). **Aus Ordner 2 befüllen.**
- `PFLANZEN_PREIS_STANDARD` — Fallback-EK je `type` (staude/strauch/baum…). Einzel-Override: `plant.preis_ek_eur` in `plants.js`.
- `KALKULATION_DEFAULT` — `marge_material_pct`, `marge_pflanzen_pct`, `stundensatz_eur`, `mwst_pct` (später via `app_settings` überschreibbar).
- `calcAngebot({plan, habitatPlan, kalk})` → EK/VK-Summen + `unbekannt` (Positionen ohne Preis).

## Wichtige Code-Fakten / Gotchas
- Habitate **getrennt** von `positionen` speichern (`habitate`-Spalte) — sonst bricht der Biodiversitäts-Score
  im Kundenportal (`KundenPortalPage.jsx:53`, zählt heimisch-Anteil der `positionen`).
- `tasks.material` ist **`text[]`** (keine Objekte) → Materiallisten als Strings joinen. `tasks.checklist` ist JSONB `[{id,text,done}]`.
- Ops-Erzeugung: Muster `ProjectPage.jsx:98 createTasksFromPlan`; Dedup über `source_ref` wie Sensor-Flow (`OpsContext.jsx`).
  `createRecurring` hat **kein** `source_ref` → nur per Opt-in (sonst Job-Spam).
- BeetPlaner-Canvas rechnet mit `pflanzabstand` → Habitate **nicht** einspeisen (NaN-Gefahr).
- Vor `main`-Merge: `npm run build` muss grün sein (Push auf `main` deployt live auf luma-biome.de).
- Migration ist bereits in Prod — neue Clients dürfen `habitate` senden.

## Nächste Schritte (Reihenfolge)
1. **EK-Preise aus Ordner 2** → `preise.js` (MATERIAL_PREISE + ggf. `preis_ek_eur` an Pflanzen).
2. **Profi-PDF** (`exportPdf` in `PlanningPage.jsx`): Habitattabelle + aggregierte Materialbestellliste
   (`rollupMaterial`) + Einbauanleitung + Personal-/Zeitplan + Pflegeplan + Kalkulation (EK/VK). Merkblatt-Layout.
3. **„In LUMA Ops anlegen"-Dialog** + Pflegekalender (Termine aus dem Leitfaden: Staudenrückschnitt März/Apr;
   Magerwiese-Mahd Jun/Jul + Sep/Okt; Vogelkasten-Reinigung Ende Sep; Teich Frühjahr; Totholz alle 5–10 J; Hecke „auf Stock" 10–20 J).
4. **Pflanzenliste erweitern** (Leitfaden-Arten nach Lebensraum + Website + Bruns; dedupe gegen 202 vorhandene; `bluete_monate` Pflicht).
   Beet-Vorlagen (`beetVorlagen.js`) aus den Pflanzlisten #1–#9 des Leitfadens.
5. **Generator** (Regler: Standort/Ziel-Bestäuber/Artenvielfalt/Heimisch/Ästhetik/Blühfolge; Greedy-Score) + **Visualisierung**
   (Drifts, Saison-Schieberegler, Habitatobjekte). Für Public-Modus von OpsContext entkoppelt halten.

## Koordination
Damit sich zwei Instanzen nicht überschreiben: **immer nur eine Instanz bearbeitet diesen Branch gleichzeitig.**
Vor dem Weiterarbeiten `git pull`. Commits klein & mit klarer Message; nach jedem Schritt `npm run build`.
