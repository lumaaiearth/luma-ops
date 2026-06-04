# Luma Ops Platform — Architektur-Analyse & Roadmap

> Erstellt: 2026-06-04 | Basis: Schema v1 + Anforderungen aus Sprachnachrichten

---

## 1. Ist-Zustand — Schema v1

### Kern-Hierarchie

```
Kunde (Auftraggeber/Firma)
 └── Standort (physische Fläche, mit GeoJSON)
 └── Projekt (Auftrag/Vorhaben)
      └── Einsatz (einzelne Arbeitsschicht)
           ├── Kosten (Lohn, Material, Maschine...)
           └── Erlös (Rechnung → Zahlung)
```

### Was gut ist ✅
- Saubere Hierarchie: Kunde → Projekt → Einsatz
- `meta TEXT` JSON-Feld an Einsatz + Kosten für volatile Felder
- Supabase PostgreSQL als Basis — RLS, UUID, JSONB verfügbar
- GeoJSON direkt am Standort → Kartenintegration möglich

### Was fehlt ❌
- Keine Verbindung zwischen `standort` und `projekt` (aktuell nur `kunde_id` am Projekt)
- Keine Pflanzplanung-Tabellen
- Kein User/Auth-System
- Kein Multi-Tenant (RLS fehlt komplett)
- `plants.js` ist statisch — keine DB-Anbindung

---

## 2. Data Flow — Aktuell

```
Browser (React/Vite)
    │
    ├─ plants.js ──────────────────→ PlanningPage (lokal, kein DB)
    │
    ├─ Supabase Client (anon key)
    │       │
    │       ├─ sb.from('kunde').select()       → StammdatenPage
    │       ├─ sb.from('standort').select()    → MapPage, StammdatenPage
    │       ├─ sb.from('projekt').select()     → DashboardPage, JobsPage
    │       ├─ sb.from('einsatz').select()     → CalendarPage, TimePage, JobsPage
    │       ├─ sb.from('kosten').select()      → AnalysePage
    │       ├─ sb.from('erloes').select()      → AnalysePage
    │       └─ storage: job-photos             → JobsPage (Fotos)
    │
    └─ OpsContext.jsx ─────────────→ Globaler State (Projects, Jobs, etc.)
```

---

## 3. Fehlende Tabellen

### A) Pflanzplanung-Workflow

```
pflanzplan → pflanzplan_position (n Pflanzen) → pflanzplan_bestellung → pflanzplan_status
```

**Workflow-Kette:**
```
planung → pdf_erstellt → bestellung → bestellung_bestaetigt → pflanzung_laufend → wachstum → maintenance
```

### B) Multi-Tenant / Auth

```
organisation → user_profile → (RLS auf alle Tabellen)
```

---

## 4. Schema v2 — Neue Tabellen (PostgreSQL/Supabase)

```sql
-- ════════════════════════════════════════════════════════
-- SCHEMA v2 ERWEITERUNGEN — Luma Ops Platform
-- ════════════════════════════════════════════════════════

-- ── A) Projekt ↔ Standort Verknüpfung ─────────────────────────────────────
-- (aktuell fehlt diese Verbindung!)
ALTER TABLE standort ADD COLUMN IF NOT EXISTS projekt_id UUID REFERENCES projekt(id);
-- Alternativ: projekt_standort als Junction Table für n:m

CREATE TABLE IF NOT EXISTS projekt_standort (
  projekt_id   UUID NOT NULL REFERENCES projekt(id) ON DELETE CASCADE,
  standort_id  UUID NOT NULL REFERENCES standort(id) ON DELETE CASCADE,
  PRIMARY KEY (projekt_id, standort_id)
);

-- ── B) Pflanzplanung ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pflanzplan (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id  UUID REFERENCES standort(id),
  projekt_id   UUID REFERENCES projekt(id),
  titel        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'planung' CHECK(status IN (
                 'planung',
                 'pdf_erstellt',
                 'bestellung',
                 'bestellung_bestaetigt',
                 'pflanzung_laufend',
                 'wachstum',
                 'maintenance'
               )),
  flaeche_m2   REAL,
  notizen      TEXT,
  beet_canvas  JSONB,            -- Canvas-Layout aus Beetplaner
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Einzelne Pflanzen im Plan
CREATE TABLE IF NOT EXISTS pflanzplan_position (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pflanzplan_id   UUID NOT NULL REFERENCES pflanzplan(id) ON DELETE CASCADE,
  pflanzen_key    TEXT NOT NULL,   -- Key aus plants.js (z.B. 'quercus_robur')
  name_de         TEXT NOT NULL,
  name_lat        TEXT NOT NULL,
  anzahl          INTEGER NOT NULL DEFAULT 1,
  pflanzabstand_m REAL,
  bereich         TEXT,            -- 'sonne' / 'halbschatten' / 'schatten'
  notiz           TEXT,
  x_pos           REAL,            -- Position im Beetplaner-Canvas
  y_pos           REAL,
  sort_order      INTEGER DEFAULT 0
);

-- Bestellvorgänge (pro Pflanzplan, kann mehrere Baumschulen haben)
CREATE TABLE IF NOT EXISTS pflanzplan_bestellung (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pflanzplan_id   UUID NOT NULL REFERENCES pflanzplan(id) ON DELETE CASCADE,
  baumschule      TEXT,
  datum           DATE,
  pdf_url         TEXT,            -- Supabase Storage Link
  notizen         TEXT,
  status          TEXT DEFAULT 'offen' CHECK(status IN ('offen','bestaetigt','geliefert','teillieferung')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Einzelne Positionen der Bestellung (was wurde tatsächlich bestellt/geliefert)
CREATE TABLE IF NOT EXISTS pflanzplan_bestellung_position (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestellung_id   UUID NOT NULL REFERENCES pflanzplan_bestellung(id) ON DELETE CASCADE,
  pflanzplan_pos_id UUID REFERENCES pflanzplan_position(id),
  pflanzen_key    TEXT NOT NULL,
  name_de         TEXT NOT NULL,
  anzahl_bestellt INTEGER NOT NULL,
  anzahl_geliefert INTEGER DEFAULT 0,
  verfuegbar      BOOLEAN DEFAULT true,
  ersatz_vorschlag TEXT  -- falls nicht verfügbar
);

-- Status-Log (History)
CREATE TABLE IF NOT EXISTS pflanzplan_status_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pflanzplan_id UUID NOT NULL REFERENCES pflanzplan(id) ON DELETE CASCADE,
  von_status    TEXT,
  zu_status     TEXT NOT NULL,
  notiz         TEXT,
  geaendert_von UUID REFERENCES auth.users(id),
  geaendert_am  TIMESTAMPTZ DEFAULT now()
);

-- ── C) Multi-Tenant / Auth ────────────────────────────────────────────────

-- Organisation (Luma = eine Org; zukünftig Kunden als eigene Org)
CREATE TABLE IF NOT EXISTS organisation (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,   -- 'luma', 'bew', 'jope'
  name        TEXT NOT NULL,
  typ         TEXT DEFAULT 'intern' CHECK(typ IN ('intern','kunde','partner')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- User Profile (erweitert Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profile (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES organisation(id),
  name         TEXT,
  rolle        TEXT DEFAULT 'mitarbeiter' CHECK(rolle IN (
                 'admin',        -- Vollzugriff (Malte)
                 'mitarbeiter',  -- Luma-Team
                 'kunde_viewer'  -- Auftraggeber: nur eigene Daten lesen
               )),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── D) Row Level Security (RLS) ───────────────────────────────────────────

-- Beispiel RLS für standort: Jeder sieht nur Standorte seiner Org
ALTER TABLE standort ENABLE ROW LEVEL SECURITY;

CREATE POLICY standort_org_policy ON standort
  USING (
    kunde_id IN (
      SELECT k.id FROM kunde k
      JOIN organisation o ON o.slug = k.kuerzel
      JOIN user_profile up ON up.org_id = o.id
      WHERE up.id = auth.uid()
    )
    OR
    -- Luma-Admins sehen alles
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE id = auth.uid() AND rolle = 'admin'
    )
  );

-- Gleiches Muster für: pflanzplan, projekt, einsatz, kosten, erloes
```

---

## 5. Multi-Tenant Strategie

### Option A: Gleiche DB + Row Level Security (Empfehlung ✅)

```
Supabase DB
 ├── organisation: luma / bew / jope / ...
 ├── user_profile: rolle = admin | mitarbeiter | kunde_viewer
 └── RLS auf allen Tabellen → jeder sieht nur seine Daten
```

**Pro:**
- Kein Infra-Overhead — eine DB, ein Supabase-Projekt
- Supabase RLS ist genau dafür gebaut
- Kunden-Login sofort mit Supabase Auth möglich
- Einfache Abfragen bleiben einfach

**Con:**
- RLS-Policies müssen sorgfältig getestet werden (Datenlecks)
- Bei sehr großen Kundenzahlen ggf. Performance-Thema

### Option B: Separate Schemas pro Kunde

**Pro:** Maximale Isolation
**Con:** Massiver Overhead, nicht für Supabase-Free/Pro skalierbar

**→ Empfehlung: Option A (RLS)** — Supabase ist genau dafür optimiert.

---

## 6. Roadmap — Priorisiert

### Phase 1: Pflanzplan-Workflow (sofort)
1. `pflanzplan` + `pflanzplan_position` Tabellen in Supabase anlegen
2. PlanningPage: Plan in DB speichern (statt nur lokal)
3. Pflanzplan an Standort/Projekt hängen
4. PDF-Export: Browser `window.print()` oder `jsPDF` — Tabelle mit dt. Name, lat. Name, Anzahl

### Phase 2: Bestellworkflow (nächste Woche)
5. `pflanzplan_bestellung` + `_position` anlegen
6. Status-Tracking UI: Kachel mit Status-Badge
7. Baumschule-Bestätigung: Häkchen pro Pflanze (verfügbar / nicht verfügbar / Ersatz)

### Phase 3: Auth & User System (1-2 Wochen)
8. Supabase Auth aktivieren + Login-Page fertigstellen
9. `organisation` + `user_profile` Tabellen
10. RLS-Policies schreiben und testen

### Phase 4: Kunden-Portal (1 Monat)
11. Kunden-Viewer-Rolle: eingeschränkte UI
12. Biodiversitäts-Dashboard für Kunden
13. Pflanzplan-Freigabe: Kunde kann Plan einsehen/kommentieren

---

## 7. Summary für Malte

- **Das Schema ist solide** — Kern-Hierarchie Kunde→Projekt→Einsatz ist richtig. Nur `standort` hängt noch lose (kein direkter Projektbezug).
- **Pflanzplanung braucht 4 neue Tabellen** — `pflanzplan`, `_position`, `_bestellung`, `_bestellung_position`. Status läuft von `planung` bis `maintenance`.
- **PDF-Export ist einfach** — `jsPDF` oder Browser-Print mit custom CSS, keine komplexe Infrastruktur nötig.
- **Multi-Tenant: RLS ist der richtige Weg** — Supabase kann das, du brauchst keine zweite DB. Kunden bekommen einfach eine `kunde_viewer`-Rolle.
- **Reihenfolge:** Erstmal Pflanzplan in DB persistieren → PDF → dann Auth/Kunden. Nicht alles auf einmal.
