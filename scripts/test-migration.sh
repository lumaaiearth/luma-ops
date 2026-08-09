#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Migrations-Prüfstand: fährt die BIOME-Migrationen auf einer frischen,
# leeren Datenbank vorwärts, wieder zurück und noch einmal vorwärts.
#
# Teil des Merge-Gates. Wenn das hier rot ist, ist die Migration nicht
# rückwärts lauffähig und darf nicht nach main.
#
# Voraussetzung: lokaler PostgreSQL (siehe scripts/pg-local.sh).
#   PGHOST=/tmp PGPORT=5433 scripts/test-migration.sh
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

PGHOST="${PGHOST:-/tmp}"
PGPORT="${PGPORT:-5433}"
PGUSER="${PGUSER:-postgres}"
DB="${DB:-biome_pruefstand}"
export PGHOST PGPORT PGUSER

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UP="$ROOT/supabase/migrations/20260809_biome_datenkern.sql"
DOWN="$ROOT/supabase/migrations/down/20260809_biome_datenkern.down.sql"
BOOTSTRAP="$ROOT/fixtures/00_bootstrap.sql"
GROUND="$ROOT/fixtures/ground_truth.sql"
REGELN="$ROOT/fixtures/regeltests.sql"

rot()  { printf '\033[31m%s\033[0m\n' "$1"; }
gruen(){ printf '\033[32m%s\033[0m\n' "$1"; }

lauf() { psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$1" >/dev/null; }

echo "── Frische Datenbank $DB ─────────────────────────────────────────────"
dropdb --if-exists "$DB"
createdb "$DB"

echo "1/6 Bootstrap"                 && lauf "$BOOTSTRAP"
echo "2/6 Migration vorwärts"        && lauf "$UP"

TAB_NACH_UP=$(psql -tAq -d "$DB" -c \
  "select count(*) from pg_tables where schemaname='public' and tablename like 'biome\\_%'")
echo "    $TAB_NACH_UP BIOME-Tabellen angelegt"
[ "$TAB_NACH_UP" -gt 0 ] || { rot "FEHLER: keine BIOME-Tabellen nach der Migration"; exit 1; }

echo "3/6 Migration rückwärts"       && lauf "$DOWN"

TAB_NACH_DOWN=$(psql -tAq -d "$DB" -c \
  "select count(*) from pg_tables where schemaname='public' and tablename like 'biome\\_%'")
FN_NACH_DOWN=$(psql -tAq -d "$DB" -c \
  "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname like 'biome\\_%'")
VIEW_NACH_DOWN=$(psql -tAq -d "$DB" -c \
  "select count(*) from pg_views where schemaname='public' and viewname like 'v\\_biome\\_%'")

if [ "$TAB_NACH_DOWN" != "0" ] || [ "$FN_NACH_DOWN" != "0" ] || [ "$VIEW_NACH_DOWN" != "0" ]; then
  rot "FEHLER: Rücknahme unvollständig — Tabellen:$TAB_NACH_DOWN Funktionen:$FN_NACH_DOWN Sichten:$VIEW_NACH_DOWN"
  psql -d "$DB" -c "select tablename from pg_tables where schemaname='public' and tablename like 'biome\\_%'"
  psql -d "$DB" -c "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'biome\\_%'"
  exit 1
fi
echo "    sauber zurückgebaut"

echo "4/6 Migration erneut vorwärts" && lauf "$UP"

TAB_WIEDER=$(psql -tAq -d "$DB" -c \
  "select count(*) from pg_tables where schemaname='public' and tablename like 'biome\\_%'")
[ "$TAB_WIEDER" = "$TAB_NACH_UP" ] || {
  rot "FEHLER: zweiter Durchlauf ergibt $TAB_WIEDER statt $TAB_NACH_UP Tabellen"; exit 1; }
echo "    identisches Ergebnis ($TAB_WIEDER Tabellen)"

if [ -f "$GROUND" ]; then
  echo "5/6 Ground Truth einspielen"  && lauf "$GROUND"
else
  echo "5/6 Ground Truth fehlt — übersprungen"
fi

if [ -f "$REGELN" ]; then
  echo "6/6 Regeltests"
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$REGELN"
else
  echo "6/6 Regeltests fehlen — übersprungen"
fi

gruen "Migrations-Prüfstand grün."
