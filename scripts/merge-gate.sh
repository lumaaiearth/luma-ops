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

schritt() {
  local name="$1"; shift
  printf '\n── %s ─────────────────────────────────────────\n' "$name"
  if "$@"; then
    BERICHT+=("${GRUEN}grün${AUS}       $name")
  else
    BERICHT+=("${ROT}ROT${AUS}        $name")
    FEHLER=1
  fi
}

uebersprungen() {
  BERICHT+=("${GELB}übersprungen${AUS} $1 — $2")
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
  schritt "6 Abnahme (Playwright)" npx playwright test
else
  uebersprungen "6 Abnahme (Playwright)" "noch keine Abnahme-Tests unter tests/"
fi

printf '\n══ Merge-Gate ══════════════════════════════════════\n'
for z in "${BERICHT[@]}"; do printf '  %s\n' "$z"; done
printf '════════════════════════════════════════════════════\n'

if [ "$FEHLER" -ne 0 ]; then
  printf '%sMerge-Gate ROT — kein Merge nach main.%s\n' "$ROT" "$AUS"
  exit 1
fi
printf '%sMerge-Gate grün.%s\n' "$GRUEN" "$AUS"
