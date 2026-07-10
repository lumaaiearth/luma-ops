# CLAUDE.md

Hinweise für Claude Code in diesem Repository.

## Git-Workflow

- **Pushen auf `main` ist dauerhaft freigegeben.** Claude darf abgeschlossene Änderungen ohne weitere Rückfrage nach `main` mergen und pushen. (Freigabe von Malte, 2026-07-10 — zum Widerrufen diese Zeile entfernen.)
- Jeder Push auf `main` deployed automatisch auf luma-biome.de (GitHub Pages). Deshalb vor dem Push auf `main` immer `npm run build` ausführen und sicherstellen, dass der Build fehlerfrei durchläuft.
- Größere Arbeiten weiterhin auf einem Feature-Branch entwickeln und erst nach erfolgreichem Build nach `main` mergen.
