# VERGABE-SCANNER — Produktplan

Neues LUMA-Ops-Produkt neben BIOME™ und Florales™: Ein Scanner für öffentliche
Vergabeplattformen mit Claude-Analyse im Hintergrund. Findet automatisch
Ausschreibungen, die zu LUMA passen (GaLaBau, Pflanzungen, Miyawaki-Wälder,
Grünpflege, Entsiegelung), bewertet sie und bereitet die Eckdaten auf.

**Arbeitstitel:** Vergabe-Scanner. Branding-Vorschläge (Entscheidung offen):
`TENDRA™`, `VERGA™`, `LUMA Ausschreibungsradar` — passend zur Namenslinie
BIOME™/Florales™.

---

## 1. Warum / Kontext

- Öffentliche Auftraggeber (Kommunen, Länder, Bund) schreiben laufend
  Grünflächen-, Pflanz- und Landschaftsbauleistungen aus — genau LUMAs Markt
  (siehe auch CUSTOMER_STRATEGY.md: Kommunen als Zielgruppe).
- Manuelles Durchsuchen mehrerer Vergabeplattformen ist zeitaufwendig und
  wird daher nicht regelmäßig gemacht → verpasste Chancen und Fristen.
- Der Scanner automatisiert das: täglicher Abruf → Claude filtert und bewertet
  → nur relevante Treffer landen aufbereitet in der App.

## 2. Datenquellen

**Primärquelle (Phase 1): Bekanntmachungsservice / Datenservice Öffentlicher
Einkauf** (oeffentlichevergabe.de, betrieben vom Beschaffungsamt des BMI).

- Seit der eForms-Pflicht die zentrale Sammelstelle für Bekanntmachungen von
  Bund, Ländern und Kommunen.
- **Offizielle OpenData-Schnittstelle** — Export als eForms-DE (JSON/XML),
  CSV oder OCDS: `https://oeffentlichevergabe.de/api/notice-exports`
  (Swagger-Doku: `https://www.oeffentlichevergabe.de/documentation/swagger-ui/opendata/index.html`).
- Kein API-Key nötig, rechtlich sauber (OpenData), stabil versioniert —
  deutlich robuster als HTML-Scraping einzelner Plattformen.

**Optional (Phase 2+):**
- **TED-API** (EU-weite Oberschwellen-Vergaben) — falls über DE hinaus relevant.
- **Gezieltes Scraping** von 1–2 Landes-/Kommunalplattformen für
  Unterschwellen-Vergaben, die (noch) nicht im BKMS landen. Bewusst erst
  später: pro Plattform Pflegeaufwand, HTML-Änderungen brechen Scraper.

**Vorfilter vor der Claude-Analyse** (spart Kosten, rein mechanisch):
- CPV-Codes: `77300000` (Gartenbau), `77310000` (Grünanlagen Bau+Pflege),
  `77211400/77211500` (Baumarbeiten), `45112700` (Landschaftsgärtnerische
  Bauleistungen), `45112710` (Grünanlagen), ergänzbar über Suchprofil.
- Optional Regionen-/PLZ-Filter (NUTS-Codes) aus dem Suchprofil.

## 3. Architektur

Kein neuer Server — gleiche Muster wie bisher im Repo:

```
GitHub Action (Cron, täglich ~06:00) ─ scripts/vergabe-scan.mjs
  1. BKMS-OpenData-API abrufen (Bekanntmachungen seit letztem Lauf)
  2. CPV-/Regions-Vorfilter (mechanisch, ohne KI)
  3. Dedupe gegen Supabase (notice_id)
  4. Claude-Analyse pro neuer Ausschreibung (Anthropic Messages API):
     Relevanz-Score 0–100 + Begründung + strukturierte Eckdaten
  5. Upsert nach Supabase (Service-Key, wie backup.yml/upload-tiles.mjs)
  6. Telegram-Nachricht bei neuen Treffern ≥ Score-Schwelle
     (Bot-Integration existiert schon in SettingsPage)

React-App (bestehende SPA)
  - Neue Seite src/pages/VergabePage.jsx unter Route /vergabe
  - Liest/schreibt via bestehende sb/sbGet/sbUpsert-Helper (offline-fähig)
```

- **Warum GitHub Actions statt Supabase Edge Function:** Das Repo nutzt
  bereits einen Actions-Cron (backup.yml) und hat keinerlei Edge Functions;
  Secrets (ANTHROPIC_API_KEY, SUPABASE_SERVICE_KEY) liegen sauber in GitHub
  Secrets; Node-Skripte in `scripts/` sind das etablierte Muster.
  Umzug auf Edge Function + pg_cron bleibt später möglich.
- **Manueller Re-Scan:** Der Workflow bekommt `workflow_dispatch`, zusätzlich
  Button in der App perspektivisch via `repository_dispatch` (Phase 3).

### Claude-Integration

- **SDK:** `@anthropic-ai/sdk` (nur devDependency/Script-Ebene, landet nicht
  im Frontend-Bundle).
- **Modell:** `claude-opus-4-8` (Standard). Kostenhebel: Da pro Tag nach
  CPV-Vorfilter meist nur ~10–50 Ausschreibungen anfallen, bleiben die Kosten
  überschaubar (grob 1–3 kTokens Input + ~0,5 kTokens Output pro Ausschreibung
  → bei 30/Tag ca. 1,5–2,5 €/Tag mit Opus; mit `claude-haiku-4-5` ~0,2–0,5 €/Tag,
  falls das Volumen doch stark wächst — Entscheidung offen, Start mit Opus).
- **Structured Outputs:** `output_config.format` mit JSON-Schema, damit die
  Antwort garantiert parsebar ist:

```json
{
  "score": 87,
  "begruendung": "Neupflanzung von 120 Stadtbäumen inkl. 3 Jahre Pflege …",
  "zusammenfassung": "…",
  "auftraggeber": "Stadt Lüneburg",
  "ort": "Lüneburg", "bundesland": "Niedersachsen",
  "frist_angebot": "2026-08-15",
  "frist_fragen": "2026-08-01",
  "volumen_geschaetzt": "180.000–250.000 €",
  "leistungen": ["Baumpflanzung", "Fertigstellungspflege"],
  "eignungsnachweise": ["Referenzen GaLaBau", "Präqualifikation o. EEE"]
}
```

- **Firmenprofil im Prompt:** kurzes, versioniertes Profil (Leistungsspektrum,
  Regionen, Projektgrößen, Kapazität) — gepflegt in der App
  (Tabelle `vergabe_profil`), vom Skript geladen.

## 4. Datenmodell (Supabase-Migration)

`supabase/migrations/2026XXXX_vergabe_scanner.sql` — RLS nach bestehendem
Muster (`is_internal()`), analog `20260707_tasks_management.sql`:

**`vergabe_ausschreibungen`**
| Spalte | Typ | Anmerkung |
|---|---|---|
| id | text PK | Notice-ID aus BKMS (Dedupe-Schlüssel) |
| quelle | text | 'bkms', später 'ted', … |
| titel, auftraggeber, ort, bundesland | text | |
| cpv_codes | text[] | |
| veroeffentlicht_am, frist_angebot, frist_fragen | date | |
| url | text | Link zur Originalbekanntmachung |
| verfahren_art | text | offen/beschränkt/Verhandlungs… |
| score | int | 0–100 von Claude |
| score_begruendung, zusammenfassung | text | |
| eckdaten | jsonb | volle strukturierte Claude-Extraktion |
| raw | jsonb | eForms-Rohdaten (Nachvollziehbarkeit) |
| status | text | neu / interessant / in_bearbeitung / abgegeben / gewonnen / verloren / verworfen |
| notizen | text | interne Notizen |
| created_at, updated_at | timestamptz | |

**`vergabe_profil`** (1 Zeile, konfigurierbar in der App)
- firmenprofil (text, geht in den Claude-Prompt), cpv_codes text[],
  regionen text[], min_score int (Benachrichtigungs-Schwelle), aktiv bool.

Realtime-Publication für `vergabe_ausschreibungen` (wie tasks/people), damit
neue Treffer live in der App erscheinen.

## 5. Frontend

Nach dem etablierten Seiten-Muster (vgl. MapPage/PlanningPage):

1. **`src/pages/VergabePage.jsx`** — Hauptansicht:
   - Liste der Ausschreibungen, sortiert nach Score/Frist; Score-Badge
     (Farblogik über theme.js OK/WARN/DANGER), Fristen-Countdown.
   - Filter: Status, Bundesland, Mindest-Score; Suche.
   - Detail-Panel/Drawer: Zusammenfassung, Eckdaten, Nachweise-Checkliste,
     Link zur Originalbekanntmachung, Statuswechsel, Notizen.
   - Einstellungs-Tab (nur Admin): Suchprofil (Firmentext, CPV, Regionen,
     Score-Schwelle).
2. **`src/App.jsx`** — Lazy-Import + Route:
   `<Route path="/vergabe" element={<Protected><VergabePage/></Protected>} />`
3. **`src/components/Layout.jsx`** — Nav-Eintrag in `NAV_GROUPS` unter
   „Betrieb" (akquise-nah), Icon `FileSearch` (lucide), Label nach
   Branding-Entscheidung.
4. Wiederverwendung: `ui.jsx` (INPUT_STYLE, Badges, Cards), `theme.js`-Tokens,
   `sbGet/sbUpsert` (Offline-Outbox inklusive), `window.__lumaToast`.

## 6. Meilensteine

**M1 — Datenpipeline (Kern):** Migration + `scripts/vergabe-scan.mjs`
(BKMS-Abruf, CPV-Filter, Dedupe, Claude-Scoring, Supabase-Upsert) +
`.github/workflows/vergabe-scan.yml` (Cron + workflow_dispatch). Testlauf
manuell → Daten liegen in Supabase.

**M2 — App-Oberfläche:** VergabePage mit Liste/Detail/Status-Workflow +
Suchprofil-Einstellungen. Ab hier täglich nutzbar.

**M3 — Benachrichtigung & Feinschliff:** Telegram-Meldung bei Treffern ≥
Schwelle, Fristen-Warnungen, ggf. Dashboard-Kachel, manueller Scan-Button.

**Später (optional):** TED-Anbindung, Unterschwellen-Scraper für ausgewählte
Landesplattformen, Angebots-Unterstützung (Claude erstellt Nachweis-Checkliste
+ Entwurf Teilnahmeantrag), Kundenportal-Freigabe.

## 7. Offene Entscheidungen

1. **Produktname/Branding** (TENDRA™ / VERGA™ / anderes?)
2. **Claude-Modell:** Start mit `claude-opus-4-8` (beste Bewertungsqualität)
   oder direkt kostenoptimiert `claude-haiku-4-5`?
3. **Benachrichtigungskanal:** Telegram (Integration existiert) vs. E-Mail
   (bräuchte zusätzlichen Dienst, z.B. Resend) vs. nur In-App.
4. **Angebots-Unterstützung** (M-später) gewünscht ja/nein.
5. **Secrets:** `ANTHROPIC_API_KEY` muss als GitHub-Secret hinterlegt werden
   (Konto/Key von Malte nötig).

## 8. Verifikation

- `node scripts/vergabe-scan.mjs --dry-run` lokal: API-Abruf + Filter ohne
  DB-Write prüfen.
- Testlauf mit begrenztem Zeitfenster → Einträge in Supabase kontrollieren
  (Score-Plausibilität stichprobenartig gegen Original-Bekanntmachung).
- `npm run build` vor Merge nach `main` (Deploy-Regel aus CLAUDE.md).
