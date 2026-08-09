# Merge-Gate

Was grün sein muss, bevor ein Job-Branch nach `main` geht. Kein Schritt ist
optional; wer einen überspringt, überspringt ihn sichtbar.

```
npm run gate
```

Das Skript (`scripts/merge-gate.sh`) schreibt sein Ergebnis zusätzlich nach
`.gate-status.json`, aus dem die Fortschrittsseite den Stand liest.

## Die sechs Schritte

| # | Schritt | Befehl | Wann rot |
|---|---------|--------|----------|
| 1 | Build | `npm run build` | Der Vite-Build bricht ab. Jeder Push auf `main` deployt auf luma-biome.de — ein kaputter Build ist eine kaputte Website. |
| 2 | Lint | `npm run lint` | Ein **Fehler**. Geerbte Warnungen sind erlaubt, siehe unten. |
| 3 | Typprüfung | `npm run typecheck` | Ein Befund im Geltungsbereich `src/biome/`. |
| 4 | Node-Tests | `npm run test` | Eine Prüfung schlägt fehl. |
| 5 | Migration vor/zurück | `npm run migration:test` | Die Migration läuft nicht vorwärts, nicht rückwärts, oder der zweite Vorwärtslauf ergibt ein anderes Schema. Enthält die 31 Regeltests. |
| 6 | Abnahme | `npx playwright test` | Eine Prüfung eines bereits gewonnenen Jobs schlägt fehl. |

## Zwei Stufen beim Lint, und warum

Beim Scharfstellen des Gates am 2026-08-09 meldete eslint 922 Probleme. 673
davon waren Falschmeldungen: ohne die Regel `react/jsx-uses-vars` hält
`no-unused-vars` jede Komponente für ungenutzt, die nur in JSX vorkommt. In
diesem Rauschen wäre kein echter Fund je aufgefallen.

Nach dem Einschalten der Regel bleiben **249 Warnungen und 0 Fehler**. Die
Warnungen stammen aus dem Altbestand (ungenutzte Bezeichner, Hook-Befunde). Sie
sind Warnung, nicht Fehler: der Merge soll an neuen Fehlern scheitern, nicht an
geerbten.

Für neuen Code unter `src/biome/` gelten dieselben Regeln als **Fehler**.

> Die Zahl 249 soll fallen, nicht wachsen. Wer sie erhöht, sollte einen guten
> Grund haben.

Zwei echte Fehler kamen beim Scharfstellen ans Licht und wurden behoben:
`compressImage` war in `MapPage.jsx` nicht importiert — der Fehler lief in einen
leeren `catch`, dadurch wurde jedes Drohnenbild ungedrosselt hochgeladen statt
auf 4096 px begrenzt.

## Geltungsbereich der Typprüfung

Das Projekt ist reines JavaScript. Eine Typprüfung über alle 38.000 Zeilen auf
einmal wäre ein Berg roter Meldungen, den niemand liest. `scripts/typecheck.mjs`
lässt TypeScript über alles laufen, scheitert aber nur an Befunden unter
`src/biome/`. Befunde außerhalb werden gezählt und ausgegeben, damit sie
sichtbar bleiben.

**Der Geltungsbereich wächst mit jeder Welle.** Was hineinwandert, muss vorher
sauber sein.

Aktuell außerhalb: 1 Befund (`src/lib/outbox.js`).

## Migrationsprüfstand

Braucht einen lokalen PostgreSQL:

```
scripts/pg-local.sh start
npm run migration:test
```

Der Prüfstand legt eine frische Datenbank an, spielt `fixtures/00_bootstrap.sql`
ein (das Minimum an Supabase-Umgebung, auf das die Migrationen zeigen), fährt
die Migration vorwärts, wieder zurück, und noch einmal vorwärts. Danach die
Ground Truth und die Regeltests.

Die Rücknahme muss **vollständig** sein: keine Tabelle, keine Funktion, keine
Sicht darf zurückbleiben. Sonst erzeugt ein Neuaufbau der Umgebung ein anderes
Schema als das laufende.

Die Produktionsdatenbank wird dabei nie angefasst.

## Abnahme

`playwright.config.js` fährt zwei Projekte: `desktop` (1440 × 900) und `mobil`
(Pixel 7). Beide laufen gegen den Fixture-Build:

```
VITE_BIOME_FIXTURE=1 npm run build
npx vite preview --port 4173 --strictPort
BIOME_BASE_URL=http://127.0.0.1:4173 npx playwright test
```

Ohne `BIOME_BASE_URL` startet Playwright den Vorschauserver selbst.

**Jeder gewonnene Job wandert dauerhaft in die Suite.** Eine Regression darin
blockiert den Merge, auch Wellen später. Stand 2026-08-09: 34 Prüfungen
(17 je Gerät), darunter axe-core gegen WCAG 2.1 AA.

## Was das Gate nicht prüft

Ehrlichkeit gehört dazu:

- **Bar 2, der Blindvergleich mit Vergleichsprodukten.** Der Browser dieser
  Umgebung kommt nicht ins Internet (selbst geprüft, siehe `BLOCKED.md`
  Punkt 1). Es gibt keine Incumbent-Screenshots und es werden keine erfunden.
- **Visuelle Regression.** Noch nicht eingerichtet. Die Screenshots unter
  `verdikte/screenshots/` sind Belege für die Verdikte, kein Vergleichsstand.
- **Der Fixture-Modus prüft nicht den echten Supabase-Pfad.** Die Ableitungen
  in `src/biome/daten.js` sind für beide Wege dieselben, der Ladepfad ist es
  nicht.
