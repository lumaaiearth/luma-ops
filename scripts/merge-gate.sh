#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Merge-Gate für BIOME.
#
# Alles davon muss grün sein, bevor ein Job-Branch nach main geht:
#   1 Build
#   2 Lint (0 Fehler; geerbte Warnungen sind erlaubt, siehe docs/MERGE_GATE.md)
#   3 Typprüfung des BIOME-Codes
#   4 Bestehende Node-Tests
#   5 Migration vorwärts und rückwärts auf frischer Datenbank
#   6 Komplette Playwright-Abnahme inklusive aller bereits gewonnenen Jobs
#
# Kein Schritt ist optional. Wer einen überspringt, überspringt ihn sichtbar:
# das Skript sagt am Ende, was gelaufen ist und was nicht.
# ════════════════════════════════════════════════════════════════════════════
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GRUEN=$'\033[32m'; ROT=$'\033[31m'; GELB=$'\033[33m'; AUS=$'\033[0m'
FEHLER=0
declare -a BERICHT=()
declare -a JSON=()

schritt() {
  local name="$1"; shift
  printf '\n── %s ─────────────────────────────────────────\n' "$name"
  if "$@"; then
    BERICHT+=("${GRUEN}grün${AUS}       $name")
    JSON+=("{\"name\":\"$name\",\"status\":\"gruen\"}")
  else
    BERICHT+=("${ROT}ROT${AUS}        $name")
    JSON+=("{\"name\":\"$name\",\"status\":\"rot\"}")
    FEHLER=1
  fi
}

uebersprungen() {
  BERICHT+=("${GELB}übersprungen${AUS} $1 — $2")
  JSON+=("{\"name\":\"$1\",\"status\":\"offen\",\"grund\":\"$2\"}")
  printf '\n── %s: übersprungen (%s)\n' "$1" "$2"
}

schritt "1 Build"        npm run --silent build
schritt "2 Lint"         npm run --silent lint
schritt "3 Typprüfung"   npm run --silent typecheck
schritt "4 Node-Tests"   npm run --silent test

# Migration braucht einen laufenden lokalen PostgreSQL.
if pg_isready -h "${PGHOST:-/tmp}" -p "${PGPORT:-5433}" >/dev/null 2>&1; then
  schritt "5 Migration vor/zurück" npm run --silent migration:test
else
  uebersprungen "5 Migration vor/zurück" "kein lokaler PostgreSQL auf ${PGHOST:-/tmp}:${PGPORT:-5433} — scripts/pg-local.sh start"
  FEHLER=1
fi

if [ -d tests ] && compgen -G "tests/*.spec.js" >/dev/null; then
  # Eigener Fixture-Build in dist-abnahme/ — Schritt 1 hat dist/ mit der
  # Produktionsfassung belegt, gegen die die Abnahme nichts findet.
  schritt "6 Abnahme (Playwright)" bash scripts/abnahme.sh --reporter=line
else
  uebersprungen "6 Abnahme (Playwright)" "noch keine Abnahme-Tests unter tests/"
fi

{
  printf '{"zeit":"%s","gruen":%s,"schritte":[' \
    "$(date --iso-8601=seconds)" "$([ "$FEHLER" -eq 0 ] && echo true || echo false)"
  printf '%s' "$(IFS=,; echo "${JSON[*]}")"
  printf ']}\n'
} > "$ROOT/.gate-status.json"

printf '\n══ Merge-Gate ══════════════════════════════════════\n'
for z in "${BERICHT[@]}"; do printf '  %s\n' "$z"; done
printf '════════════════════════════════════════════════════\n'

if [ "$FEHLER" -ne 0 ]; then
  printf '%sMerge-Gate ROT — kein Merge nach main.%s\n' "$ROT" "$AUS"
  exit 1
fi
printf '%sMerge-Gate grün.%s\n' "$GRUEN" "$AUS"
