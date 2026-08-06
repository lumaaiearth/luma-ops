# CLAUDE.md

Hinweise für Claude Code in diesem Repository.

## Git-Workflow

- **Pushen auf `main` ist dauerhaft freigegeben.** Claude darf abgeschlossene Änderungen ohne weitere Rückfrage nach `main` mergen und pushen. (Freigabe von Malte, 2026-07-10 — zum Widerrufen diese Zeile entfernen.)
- Jeder Push auf `main` deployed automatisch auf luma-biome.de (GitHub Pages). Deshalb vor dem Push auf `main` immer `npm run build` ausführen und sicherstellen, dass der Build fehlerfrei durchläuft.
- Größere Arbeiten weiterhin auf einem Feature-Branch entwickeln und erst nach erfolgreichem Build nach `main` mergen.

## Datenbank (Supabase)

- **Die Supabase-MCP-Tools sind ohne Rückfrage freigegeben** (`.claude/settings.json`,
  Regel `mcp__Supabase`). Das umfasst `execute_sql` und `apply_migration`, also
  auch schreibende Zugriffe und Schema-Änderungen an der Produktionsdatenbank.
  (Freigabe von Malte, 2026-07-30 — zum Widerrufen die Regel aus
  `.claude/settings.json` entfernen.)
- Die Freigabe gilt für jeden, der Claude Code in diesem Repository startet,
  nicht nur für eine Sitzung.
- Weil damit keine Rückfrage mehr kommt: Vor DDL (`apply_migration`, `DROP`,
  `ALTER`) und vor löschenden oder ändernden Abfragen (`DELETE`, `UPDATE`,
  `TRUNCATE`) vorher ansagen, was passiert, und das Ergebnis danach berichten.
  Reine Leseabfragen brauchen das nicht.
- Jede angewendete Migration gehört als Datei nach `supabase/migrations/` und
  ins Repo. Sonst driften Datenbank und Repo auseinander und ein Neuaufbau der
  Umgebung erzeugt ein anderes Schema als das laufende.
