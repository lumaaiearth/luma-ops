# LUMA Biome (luma-ops) — Code Review & Improvement Plan

> Reviewed: 2026-07-02 · Scope: debugging, functionality, UX, improvements
> Snapshot: `dc6cee2` (main) · Build passes (`vite build`, 1.9 MB main bundle)

**TL;DR:** The architecture (React + Supabase, optimistic updates, realtime sync)
is sound for an internal tool. But there is **one critical security hole**
(RLS disabled → the anon key in the public bundle gives anyone full read/write
to the whole database, including customer-portal data), a handful of **real
bugs** (silently swallowed DB errors, a "Meine Einsätze" stat that can never
match, one-click deletes without confirmation), and clear **UX/performance
wins** (route code-splitting, offline handling, GCal token expiry).

---

## 1. Critical — Security (fix before anything else)

- **RLS is off.** `supabase/migrations/20260604_auth_multi_tenant.sql:30-36`
  has all policies commented out, and the anon key is hardcoded in
  `src/lib/supabase.js:3-4`. The key ships in the public JS bundle on
  luma-biome.de, so anyone with DevTools can read/write every table (jobs,
  invoices, time entries, clients …). All auth checks (`RequireAuth`,
  `src/App.jsx:30`) are client-side only.
- **Customer portal filtering is client-side only.**
  `src/pages/KundenPortalPage.jsx:41` filters Pflanzpläne by `org_id` in the
  query, but nothing stops a `kunde_viewer` (or anonymous visitor) from
  querying all internal data directly.
- **Telegram bot token lives in localStorage and is called from the browser**
  (`src/lib/telegram.js:3`, `src/pages/SettingsPage.jsx:110-125`). Any user of
  a configured device can read it; notifications only fire from devices where
  the token was pasted.
- **Job-photos bucket appears public** (`getPublicUrl`,
  `src/lib/supabase.js:47`) — confirm intended visibility.

## 2. Bugs (confirmed in code)

1. **Swallowed DB errors.** supabase-js query builders resolve with
   `{ error }` instead of rejecting, so the raw `.catch(dbErr(...))` calls in
   `src/context/OpsContext.jsx:387, 394, 399, 406` (Pflanzpläne, chips) never
   fire — failed saves show no toast, contradicting the "data loss is never
   silent" design (line 9). The throwing helpers (`sbUpsert` etc.) are fine.
2. **"Meine Einsätze" is always 0.** `src/pages/DashboardPage.jsx:158`
   compares `assigned_users` (hardcoded string IDs like `'malte'`, `'jona'`
   from `src/data/seed.js:1-7`) with the Supabase auth UUID. No mapping exists
   between auth users and TEAM members.
3. **One-click delete, no confirmation, no undo** — jobs
   (`src/pages/JobsPage.jsx:99`), recurring templates, clients, invoices.
   Only the map confirms (`src/pages/MapPage.jsx:709`). A mis-tap on mobile
   permanently deletes a job and its Google-Calendar event.
4. **`sbInsert` is actually an upsert** (`src/lib/supabase.js:26-31`) and
   `genId()` uses 8-char `Math.random` IDs (`src/lib/storage.js:28`) — an ID
   collision silently overwrites an existing row.
5. **Weekly Telegram summary can be lost:** `src/lib/weeklySummary.js:69`
   marks "sent" in localStorage *before* sending; a failed send never retries.
   It also only fires if the app is opened Monday 08–10h.
6. **Offline fallback never persists:** `OpsContext` imports `saveJobs`/
   `saveProjects` but never calls them — the fallback
   (`src/context/OpsContext.jsx:86-89`) restores stale seed data, and
   optimistic writes that failed are gone after reload.
7. **GCal token silently expires after ~1 h** (`src/lib/gcal.js:6-10`) with no
   refresh — sync quietly stops until manually reconnected.

## 3. Functionality gaps

- **Team is static** (`TEAM`, `HOUR_TARGETS` in `src/data/seed.js`) while
  clients/vehicles are DB-backed — new employees require a code change.
- **Recurring jobs only advance when marked done**
  (`src/context/OpsContext.jsx:232-254`) — a forgotten "done" stops the whole
  series; no catch-up generation.
- **Vehicle double-booking only warns via Telegram**
  (`src/context/OpsContext.jsx:188-196`), not in the UI where the booking
  happens; the overlap check misses some multi-day cases.
- Integrations (Telegram, GCal, iCal) are all per-device localStorage —
  behavior differs depending on which device created a job.

## 4. UX & performance

- **1.9 MB main bundle (521 kB gzip), no code-splitting** — Leaflet, geotiff
  and recharts load up-front even for a quick calendar check in the field.
  Route-level `lazy()` is the biggest perceived-speed win.
- **Error boundary "Neu laden" only resets state**
  (`src/components/ErrorBoundary.jsx:21`) — persistent errors just re-crash;
  login errors vanish after 3 s (`src/pages/LoginPage.jsx:24`).
- **Icon-only buttons lack `aria-label`s** throughout.
- **Field-worker reality:** PWA manifest exists but no service worker → no
  offline mode; weather is fixed to Berlin (`src/lib/weather.js:3-5`) although
  projects already carry lat/lng.
- Repo hygiene: `dist/` and `src/lib/useIsMobile.js.bak` are committed; no
  ESLint, no tests, no CI checks.

---

## Proposed plan

### Phase 1 — Lock the door (security, ~1 day)
Enable RLS with policies on all tables (org-scoped for `kunde_viewer`,
authenticated-only for internal tables); verify the customer portal works
through policies rather than client filters; move Telegram sending into a
Supabase Edge Function holding the token server-side; review the job-photos
bucket policy.

### Phase 2 — Correctness (~1–2 days)
Route the four swallowed-error calls through the throwing helpers; switch
`genId()` to `crypto.randomUUID()` and make `sbInsert` a real insert; add
delete confirmation (or undo toast); map auth users to TEAM members via
`user_profile`; mark the weekly summary sent only after a successful send.

### Phase 3 — UX quick wins (~2 days)
Route-based code-splitting; GCal token re-request flow instead of silent
expiry; vehicle-conflict warning inside the JobModal; per-project weather
using existing coordinates; persistent login error; aria-labels on icon
buttons.

### Phase 4 — Foundation (ongoing)
DB-backed team management in Stammdaten; recurring-job catch-up logic;
service worker for offline reads; ESLint + CI build check; remove `dist/`
and `.bak` from git; break up the 1,200–1,500-line page components as they
are touched.

**Recommendation:** do Phase 1 immediately — it is the only actively
dangerous item and independent of everything else.
