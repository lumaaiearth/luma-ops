#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Abnahme: baut den Fixture-Stand und fährt die Playwright-Suite dagegen.
#
# Eigenes Skript, weil die Abnahme einen ANDEREN Build braucht als das, was
# ausgeliefert wird:
#   · dist/          Produktionsfassung, geht auf luma-biome.de
#   · dist-abnahme/  mit VITE_BIOME_FIXTURE=1, liest fixtures/ground_truth.json
#
# Ein früherer Merge-Gate-Lauf ist genau daran gescheitert: Schritt 1 hatte
# dist/ mit der Produktionsfassung überschrieben, der Vorschauserver lieferte
# sie aus, und die Abnahme lief gegen eine Anwendung ohne Testdaten. Beide
# Builds liegen deshalb jetzt getrennt.
#
# Ist BIOME_BASE_URL gesetzt, wird nichts gebaut und nichts gestartet — dann
# läuft die Suite gegen den angegebenen Server.
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${BIOME_PORT:-4174}"
AUSGABE=dist-abnahme

if [ -n "${BIOME_BASE_URL:-}" ]; then
  echo "Abnahme gegen ${BIOME_BASE_URL} (extern bereitgestellt)"
  exec npx playwright test "$@"
fi

echo "── Fixture-Build nach ${AUSGABE}/ ─────────────────────────────────────"
VITE_BIOME_FIXTURE=1 npx vite build --outDir "$AUSGABE" >/dev/null

# Die Beispiel-Splat-Aufnahme, auf die der Fixture-Datenstand zeigt. Sie wird
# hier erzeugt und nicht in public/ abgelegt: in der Produktionsfassung hätte
# sie nichts zu suchen. Deterministisch, damit die Dateigröße in
# fixtures/ground_truth.sql stimmt.
node scripts/gen-splat-beispiel.mjs "$AUSGABE/beispiel-splat.glb"

beenden() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
}
trap beenden EXIT

echo "── Vorschauserver auf Port ${PORT} ────────────────────────────────────"
npx vite preview --outDir "$AUSGABE" --port "$PORT" --strictPort >/tmp/abnahme-server.log 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 60); do
  if curl -s -o /dev/null --noproxy '*' "http://127.0.0.1:${PORT}/"; then break; fi
  sleep 1
done

BIOME_BASE_URL="http://127.0.0.1:${PORT}" npx playwright test "$@"
