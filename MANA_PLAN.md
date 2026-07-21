# MANA™ — Produktplan

**MANA™** ist das dritte LUMA-Ops-Produkt neben BIOME™ und Florales™: ein
KI-Akquise-Agent (Claude Opus 4.8), der permanent im Interesse von LUMA
lukrative Aufträge recherchiert, bewertet und die Außendarstellung
unterstützt. Benachrichtigungen laufen über Telegram.

MANA besteht aus drei Modulen plus einer Plattform-Ebene, die Claude als
festen Bestandteil in ganz LUMA Ops verankert.

---

## Überblick

| Modul | Was es tut | Status |
|---|---|---|
| **RADAR** | Scannt täglich alle deutschen öffentlichen Ausschreibungen (BKMS), Claude bewertet Passung zu LUMA | ✅ M1+M2 gebaut, Fristen-Warnung + Dashboard-Kachel (M3) |
| **CHANCEN** | Recherche-Agent: Förderprogramme, kommunale Vorhaben, private Leads via Claude + Web-Suche | ✅ gebaut (`mana-chancen.mjs`, Wochen-Cron, Chancen-Tab) |
| **PROMOTE** | Claude entwirft Outreach — erster Ausbau: Anschreiben-Entwurf im Radar-Detail (Freigabe/Versand beim Menschen) | ✅ v1 gebaut, Ausbau geplant (M5) |
| **Plattform-Ebene** | Claude-Proxy (Supabase Edge Function `claude`, deployed) + `src/lib/ai.js` — jede Seite kann KI-Features bekommen | ✅ P1 gebaut, P2-Features geplant |

---

## 1. Modul RADAR — Vergabe-Scanner (gebaut)

### Datenquelle
**Bekanntmachungsservice / Datenservice Öffentlicher Einkauf**
(oeffentlichevergabe.de, Beschaffungsamt des BMI). Seit der eForms-Pflicht
die zentrale Sammelstelle für Bekanntmachungen von Bund, Ländern, Kommunen.

- OpenData-API (verifiziert): `GET https://oeffentlichevergabe.de/api/notice-exports?pubDay=YYYY-MM-DD&format=ocds.zip`
  → ZIP mit ~1.100–1.200 OCDS-JSON-Bekanntmachungen pro Tag, davon
  typischerweise 25–50 mit GaLaBau-CPV-Codes. Kein API-Key, OpenData-Lizenz.
- Später ergänzbar: TED-API (EU), gezieltes Scraping einzelner
  Landesplattformen für Unterschwellen-Vergaben.

### Pipeline (`scripts/mana-scan.mjs` + `.github/workflows/mana-scan.yml`)
Täglicher GitHub-Actions-Cron (~06:30), gleiches Muster wie `backup.yml`:

1. Tagesexport (gestern) laden und entpacken
2. Mechanischer Vorfilter: nur `tag=tender` (keine Zuschläge) mit CPV-Codes
   aus dem Suchprofil (Default-Präfixe `773` Garten-/Landschaftsbau-Dienste,
   `4511` Abbruch-/Erd-/Landschaftsbauarbeiten), optional Regionsfilter (NUTS)
3. Dedupe gegen `mana_ausschreibungen`
4. **Claude Opus 4.8** bewertet jede neue Ausschreibung gegen das
   Firmenprofil (`mana_profil`): Score 0–100 + Begründung + strukturierte
   Eckdaten (Frist, Volumen, Leistungen, Nachweise) — via Structured Outputs
   garantiert als JSON
5. Upsert nach Supabase (service_role via GitHub Secret)
6. Telegram-Digest für Treffer ≥ `min_score` (Default 60)

Manuell auslösbar über `workflow_dispatch` (optional mit Datum), lokal
testbar mit `--dry-run --no-ai`.

### Datenmodell (Migration `20260720_mana_radar.sql`, bereits angewendet)
- **`mana_ausschreibungen`** — id (BKMS-Notice-ID), titel, auftraggeber,
  ort/bundesland, cpv_codes, fristen, url, score, score_begruendung,
  zusammenfassung, eckdaten jsonb, raw jsonb, status
  (`neu → interessant → in_bearbeitung → abgegeben → gewonnen/verloren`,
  alternativ `verworfen`), notizen. RLS `is_internal()`, Realtime aktiv.
- **`mana_profil`** — firmenprofil (Prompt-Text), cpv_prefixes, regionen,
  min_score, aktiv. In der App editierbar (Admin).

### Kosten
25–50 Claude-Bewertungen/Tag ≈ 1–3 €/Tag mit Opus 4.8. Modell per Env
`MANA_MODEL` umstellbar (z.B. `claude-haiku-4-5` falls Volumen stark wächst).

## 2. Frontend — `src/pages/ManaPage.jsx` (M2, nächster Schritt)

Nach dem etablierten Seiten-Muster:

1. Route `/mana` in `src/App.jsx` (lazy + `<Protected>`), Nav-Eintrag in
   `Layout.jsx` `NAV_GROUPS` unter „Betrieb", Icon z.B. `Radar`/`Sparkles`,
   Label `MANA™`.
2. **Radar-Tab:** Liste sortiert nach Score/Frist, Score-Badge
   (theme.js OK/WARN/DANGER), Fristen-Countdown, Filter (Status, Bundesland,
   Min-Score), Detail-Drawer mit Zusammenfassung, Eckdaten,
   Nachweis-Checkliste, Original-Link, Statuswechsel, Notizen.
3. **Einstellungen-Tab (Admin):** Firmenprofil-Text, CPV-Präfixe, Regionen,
   Score-Schwelle, Aktiv-Schalter.
4. Wiederverwendung: `ui.jsx`, `theme.js`, `sbGet/sbUpsert` (Offline-Outbox),
   Realtime-Subscription wie bei `tasks`.

## 3. Modul CHANCEN — Recherche-Agent (M4)

Claude Opus 4.8 mit **Anthropic-Web-Suche** (Server-Tool) als täglicher/
wöchentlicher Agent, der über Ausschreibungen hinaus recherchiert:

- **Förderprogramme:** KfW, Länder-Programme, Klimaanpassung (z.B. ANK,
  „Natürlicher Klimaschutz"), kommunale Begrünungsförderung — was können
  LUMA-Kunden beantragen? (Verkaufsargument + eigene Projekte)
- **Kommunale Vorhaben:** Ratsbeschlüsse, Klimaanpassungskonzepte,
  Schwammstadt-/Entsiegelungsprogramme im Zielgebiet → frühe Leads, bevor
  etwas ausgeschrieben wird
- **Private Leads:** Wohnungswirtschaft, Gewerbe mit Begrünungspflichten
  (Dachbegrünungssatzungen etc.)

Ergebnis in neue Tabelle `mana_leads` (quelle, typ, titel, zusammenfassung,
score, url, status), gleiche UI-Logik wie Radar, eigener Telegram-Digest.

## 4. Modul PROMOTE — Outreach & Außendarstellung (M5)

Claude entwirft auf Basis von Radar-/Chancen-Treffern und den
LUMA-Referenzen (aus OpsContext/Projekten):

- Anschreiben und Interessensbekundungen für konkrete Ausschreibungen
- Referenz-One-Pager / Kurzprofile passend zum jeweiligen Auftraggeber
- Social-Media-Posts (Projekt-Storys, Förder-Hinweise für Kommunen)

**Wichtig — Human-in-the-Loop:** MANA versendet nichts automatisch.
Entwürfe landen mit Status `entwurf` in der App, Telegram meldet „Entwurf
bereit", ein Mensch gibt frei und versendet. Grund: Qualitäts-/Markenschutz
und Rechtslage (§7 UWG: E-Mail-Kaltakquise ohne Einwilligung ist auch im
B2B unzulässig — zulässig bleiben Reaktionen auf Ausschreibungen,
Bestandskontakte und postalische/telefonische Wege nach Abwägung).

## 5. Plattform-Ebene — Claude als fester Bestandteil von LUMA Ops (P1/P2)

Das Frontend ist eine statische SPA (GitHub Pages) mit anon-Key — ein
API-Key darf dort nie liegen. Deshalb:

- **P1 — Claude-Proxy:** Supabase Edge Function `claude` hält den
  `ANTHROPIC_API_KEY` serverseitig, prüft die User-Rolle (nur
  admin/mitarbeiter) und reicht Anfragen an die Anthropic Messages API
  durch. Frontend-Helper `src/lib/ai.js` (`askClaude(prompt, opts)` via
  `sb.functions.invoke`). Damit kann **jede** Seite KI-Features bekommen.
- **P2 — KI-Features in den bestehenden Apps** (Beispiele, priorisierbar):
  - Aufgaben: „Board zusammenfassen", Aufgaben aus Freitext anlegen
  - Florales: Pflanzvorschläge je Standort/Habitat begründen
  - BIOME/Analysen: Flächen-/Sensor-Daten in Klartext-Reports übersetzen
  - Kundenportal: automatische Projekt-Statusberichte (nach Freigabe)
- Hintergrund-Agenten (RADAR, CHANCEN) laufen weiterhin als GitHub-Actions-
  Crons — dort liegt der Key in GitHub Secrets.

## 6. Meilensteine

- **M1 ✅ Radar-Pipeline** — Migration (angewendet), `mana-scan.mjs`, Workflow
- **M2 ✅ App-Oberfläche** `ManaPage.jsx` (Radar + Chancen + Einstellungen)
- **M3 ✅ Feinschliff Radar** — Telegram-Fristen-Warnung (≤ 5 Tage),
  Dashboard-Kachel. *Offen: manueller Scan-Button in der App (braucht
  GitHub-Token → später mit den APIs).*
- **M4 ✅ CHANCEN** — `mana-chancen.mjs` (Claude + Web-Suche, montags),
  Tabelle `mana_leads` (angewendet), Chancen-Tab
- **M5 ✅(v1) PROMOTE** — Anschreiben-Entwurf im Radar-Detail via Claude-Proxy.
  Ausbau: Referenz-One-Pager, Social-Posts, eigener Entwürfe-Bereich
- **P1 ✅ Claude-Proxy** — Edge Function `claude` (deployed, Rollen-Check) +
  `src/lib/ai.js`. *Fehlend zum Scharfschalten: `ANTHROPIC_API_KEY` als
  Edge-Function-Secret (Supabase Dashboard → Edge Functions → Secrets).*
- **P2 → KI-Features** in Aufgaben/Florales/BIOME (inkrementell)

## 7. Benötigte Secrets (GitHub → Settings → Secrets → Actions)

| Secret | Zweck |
|---|---|
| `ANTHROPIC_API_KEY` | Claude-Bewertung (console.anthropic.com) |
| `SUPABASE_SERVICE_KEY` | DB-Schreibzugriff des Scan-Skripts (service_role) |
| `TELEGRAM_BOT_TOKEN` | Digest-Nachrichten (Bot existiert bereits, s. SettingsPage) |
| `TELEGRAM_CHAT_ID` | Ziel-Chat/-Gruppe für Digests |

Zusätzlich für die In-App-KI (Anschreiben-Entwurf u.a.): `ANTHROPIC_API_KEY`
als **Supabase-Secret** hinterlegen (Dashboard → Edge Functions → Secrets) —
die Edge Function `claude` ist bereits deployed und meldet bis dahin einen
verständlichen Hinweis statt zu funktionieren.

## 8. Verifikation

- Lokal: `node scripts/mana-scan.mjs --day=2026-07-17 --dry-run --no-ai`
  → getestet: 1.156 Bekanntmachungen geladen, 28 nach Vorfilter. ✅
- Nach Secret-Einrichtung: Workflow manuell auslösen (`workflow_dispatch`),
  Einträge + Scores in Supabase prüfen, Telegram-Digest kontrollieren.
- Scores stichprobenartig gegen Original-Bekanntmachungen plausibilisieren,
  ggf. Firmenprofil-Text in `mana_profil` nachschärfen (wirkt sofort auf den
  nächsten Lauf).
- Vor Merge nach `main`: `npm run build` (Deploy-Regel aus CLAUDE.md).
