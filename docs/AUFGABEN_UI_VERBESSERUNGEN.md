# UI-Verbesserungen Arbeitsplanung — Aufgabenliste (Stand 20.07.2026)

> **Status 20.07.2026:** Alle 11 Punkte umgesetzt und nach `main` gemergt
> (Blöcke A–D, je eigener Merge). Neu dabei: Tabelle `person_cost_rates`
> (interne Stundenkosten, admin-only RLS; Migration 20260720) und die
> Routen `/einsaetze` (Hub) sowie `/team/:id` (Mitarbeiter-Detailseite).
> Alte Routen /calendar, /wochenplan, /jobs leiten auf den Hub um.

Feedback von Malte nach dem ersten Test der neuen Arbeitsplanungs-Features
(Wochenplan, Stundenkonto, Abrechnung) in der Mobile-App. Aufgaben bitte
einzeln abarbeiten, nach jedem Block `npm run build` prüfen, dann gemäß
CLAUDE.md auf `main` mergen (deployt automatisch auf luma-biome.de).

## Kontext für die Bearbeitung

- **Stack:** React/Vite (kein TypeScript), Supabase (Projekt `eqwoyfsfyohtcibithak`), Capacitor-App (iOS/Android), styling inline mit Tokens aus `src/lib/theme.js` (A, SURFACE, BORDER, FG, MUTED …), Fonts Space Grotesk/Space Mono.
- **Relevante Dateien:** `src/pages/WochenplanPage.jsx` (neu), `src/pages/CalendarPage.jsx`, `src/pages/JobsPage.jsx`, `src/pages/TimePage.jsx`, `src/pages/TeamPage.jsx`, `src/pages/ProfilePage.jsx`, `src/components/Layout.jsx` (Navigation), `src/components/JobModal.jsx`, `src/lib/hourAccounts.js`, `src/context/TimeContext.jsx` (hour_rules, project_costs, billing_rates), `src/context/OpsContext.jsx`.
- **Rollenmodell:** `user_profile.rolle`: admin (Malte, Lukas) / mitarbeiter / kunde_viewer / gast. **Alle €-Werte (Umsatz, Gewinn, Sätze, Materialkosten, Rechnungen) dürfen NUR für Admins sichtbar sein** — RLS via `is_admin()` existiert bereits; UI-seitig `isAdmin` aus AuthContext nutzen.
- **Stundenkonto-Regel:** 30,88 h je bezahltem Monat (Tabelle `hour_rules`, `paid_months`), Vorjahres-Übertrag; Logik in `src/lib/hourAccounts.js` — nicht duplizieren.
- **Wetter:** Open-Meteo ist bereits integriert (`useWeather` in CalendarPage).

## A · Bugfixes (zuerst)

1. **„Heute"-Button im Wochenplan ohne Funktion.** `WochenplanPage.jsx`: `setWs(weekStart(today))` prüfen — vermutlich ändert sich der State nicht, wenn man bereits in einer anderen Woche ist (oder `ws` ist identisch und es fehlt ein Re-Render). Reproduzieren und fixen.
2. **Layout-Lücke am unteren Rand in der Capacitor-App** (Screenshot: leerer grauer Bereich unter der Bottom-Nav, Fenster wirkt „verrutscht"). Vermutlich Safe-Area/Viewport-Problem (iOS `env(safe-area-inset-bottom)`, `viewport-fit=cover`, oder feste Höhenrechnung in `Layout.jsx`). In der App testen, nicht nur im Browser.
3. **Profilfoto-Upload lädt nicht hoch.** ProfilePage: Foto lässt sich auswählen, wird aber nicht gespeichert/angezeigt. Upload-Pfad (Supabase Storage Bucket, Berechtigungen, `avatar_url`-Update) durchgehen; auch prüfen, ob es in der Capacitor-App am File-Picker liegt.

## B · Navigation & Einsätze-Hub (größter Umbau)

4. **Ein Reiter „Einsätze" statt Kalender + Wochenplan + Einsatzübersicht.**
   Bottom-Nav/Sidebar soll schlanker werden: **Dashboard · Einsätze · Aufgaben** (+ Rest unter „Mehr").
   Der neue Einsätze-Hub hat oben einen Ansicht-Umschalter mit drei Modi:
   - **Liste** (heutige JobsPage-Inhalte: alle Einsätze chronologisch, Status, Vorlagen)
   - **Kalender** (heutige CalendarPage)
   - **Wochenplan** (heutige WochenplanPage)
   Menüpunkte „Kalender" und „Wochenplan" aus der Navigation entfernen; Routen können als Redirect auf den Hub bestehen bleiben. Der zuletzt gewählte Modus soll gemerkt werden (localStorage).
5. **Wochenplan mobil = Tagesansicht mit Swipe.** Auf schmalen Screens (< ~700 px) statt der 7-Spalten-Matrix nur **einen Tag** zeigen: Spalte mit allen Personen und ihren Einsätzen. Swipe nach links/rechts (Touch) bzw. Pfeil-Buttons = ein Tag vor/zurück. **Heutiger Tag deutlich mit Signalfarbe markiert** (auch in der Desktop-Matrix den Spaltenkopf kräftiger hervorheben als bisher).
6. **Einsätze im Wochenplan verschiebbar machen (Drag & Drop).** Einsatz-Chip auf eine andere Zelle ziehen = Datum und/oder Person ändern (`updateJob` mit neuem `date` / `assigned_users`). Öffnen per Klick bleibt. CalendarPage hat bereits Pointer-Drag-Logik (`handleEventPointerDown`) als Vorbild; auf Touch achten (long-press zum Aufnehmen, sonst kollidiert es mit dem Swipe aus Punkt 5).

## C · Zeiterfassung (TimePage-Umbau)

7. **Reiter „Erfassen" entzerren.** Mobil ist das Formular links eingequetscht neben „Letzte Einträge". Neu: „Erfassen" zeigt **nur das Formular**, responsiv über die volle Breite. Die Einträge wandern in einen eigenen Reiter **„Einträge"** als **Gesamttabelle** (sortierbar/filterbar: Datum, Person, Projekt, Start, Ende, Stunden, Tätigkeit; CSV-Export von dort erreichbar).
8. **Reiter „Statistiken" = bisherige Übersicht + Statistiken zusammengelegt**, intern zweigeteilt:
   - **Personen:** wer hat wo/wann/wieviel gearbeitet (PersonCards, Kontostände 30,88-h-Regel, Monatstabellen — bestehende Komponenten wiederverwenden).
   - **Projekte (nur Admin):** Umsatz je Projekt (Stunden × Kundensatz aus `billing_rates` + Materialkosten-Verkaufswert aus `project_costs`) und **Gewinn** = Umsatz − Materialeinkauf − Personalkosten. Für Personalkosten braucht es einen internen Stundenkostensatz je Person — als neue Admin-Einstellung anlegen (z. B. Spalte in `hour_rules` oder eigene Tabelle, admin-only RLS!) und im UI pflegbar machen.
9. **Kundenreport statt Rechnung im Fokus.** Im Abrechnungs-Tab pro Standort/Projekt einen **druckbaren Report** erzeugen (wie bestehender PDF-Export, aber kundentauglich aufbereitet):
   - alle Arbeitseinsätze des Zeitraums mit Datum + Tätigkeitsbeschreibung,
   - Jahresverlauf-Statistik (Stunden pro Monat als Balken),
   - **Zusammenfassung nach Tätigkeiten** (wieviel Stunden Rasenmähen, Beikräuter entfernen, Bewässerung …). Tätigkeiten aus den Freitext-Beschreibungen ableiten: Stichwort-Mapping auf die Kategorien aus `TASK_TYPES`/Chips (`seed.js`); Einsätze können mehrere Tätigkeiten enthalten — dann Stunden anteilig oder je Nennung ausweisen, pragmatisch lösen und im Report als „ca." kennzeichnen.
   - Vorbereitung: Platz für Foto-Doku-Link (Drive-Ordner je Fläche steht in `projects.bilder_link`) — Link optional mit ausgeben.
   - **Keine internen €-Sätze im Report**, außer Admin aktiviert es explizit (Checkbox „Beträge ausweisen").

## D · Team & Wetter

10. **Mitarbeiter-Detailseite.** TeamPage-Karten klickbar machen → Route `/team/:id` mit allem zu einer Person: Kontakt, Verfügbarkeit + Abwesenheiten (editierbar), kommende + vergangene Einsätze, geleistete Stunden/Kontostand (aus hourAccounts), Top-Projekte. Bestehende Bausteine wiederverwenden.
11. **Wetter prominenter in Kalender- und Wochenansicht.** Pro Tagesspalte gut sichtbar: Wetter-Icon, Max-/Min-Temperatur, Regenwahrscheinlichkeit, UV-Hinweis bei starker Sonne (Open-Meteo liefert `uv_index_max`, `precipitation_probability` — `useWeather` ggf. erweitern). Farbcodierung: z. B. Warnton bei Regen > 60 %, Sonnen-/UV-Badge bei UV ≥ 6. Auch in der neuen mobilen Tagesansicht anzeigen (dort ist Platz für eine größere Wetterzeile).

## Empfohlene Reihenfolge

A1–A3 (Bugfixes) → B4 (Hub) → B5+B6 (Mobil-Tagesansicht + Drag&Drop) → C7 (Erfassen/Einträge) → C8 (Statistiken) → C9 (Kundenreport) → D10 (Teamseiten) → D11 (Wetter).

Nach jedem Schritt: Build prüfen, auf Mobile-Viewport testen (die App ist primär ein Handy-Werkzeug), dann mergen. Bei allem, was €-Beträge zeigt: immer gegen die Rollen prüfen (admin-only).
