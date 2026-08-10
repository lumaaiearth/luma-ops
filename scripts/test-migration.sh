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
ALT_UP="$ROOT/supabase/migrations/20260810_biome_altbestand_uebernahme.sql"
ALT_DOWN="$ROOT/supabase/migrations/down/20260810_biome_altbestand_uebernahme.down.sql"
LAGE_UP="$ROOT/supabase/migrations/20260810_biome_lagegenauigkeit_und_mehrstaemmigkeit.sql"
LAGE_DOWN="$ROOT/supabase/migrations/down/20260810_biome_lagegenauigkeit_und_mehrstaemmigkeit.down.sql"
ALT_FIXTURE="$ROOT/fixtures/altbestand.sql"
ALT_TESTS="$ROOT/fixtures/regeltests-altbestand.sql"
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
echo "2/6 Migration vorwärts"        && lauf "$UP" && lauf "$LAGE_UP"

# Die Nachtragsmigration einzeln vor und zurück, bevor der große Zyklus läuft.
# Danach muss die Spalte weg und wieder da sein, sonst ist sie nicht rücknehmbar.
lauf "$LAGE_DOWN"
SPALTE_WEG=$(psql -tAq -d "$DB" -c \
  "select count(*) from information_schema.columns
   where table_name='biome_baum' and column_name in ('lagegenauigkeit_bezug','mehrstaemmig')")
[ "$SPALTE_WEG" = "0" ] || { rot "FEHLER: Nachtragsmigration nicht rücknehmbar ($SPALTE_WEG Spalten blieben)"; exit 1; }
lauf "$LAGE_UP"
SPALTE_DA=$(psql -tAq -d "$DB" -c \
  "select count(*) from information_schema.columns
   where table_name='biome_baum' and column_name in ('lagegenauigkeit_bezug','mehrstaemmig')")
[ "$SPALTE_DA" = "2" ] || { rot "FEHLER: Nachtragsmigration nicht wiederholbar ($SPALTE_DA statt 2)"; exit 1; }
echo "    Nachtrag Lagegenauigkeit/Mehrstämmigkeit: vor, zurück, wieder vor"

TAB_NACH_UP=$(psql -tAq -d "$DB" -c \
  "select count(*) from pg_tables where schemaname='public' and tablename like 'biome\\_%'")
echo "    $TAB_NACH_UP BIOME-Tabellen angelegt"
[ "$TAB_NACH_UP" -gt 0 ] || { rot "FEHLER: keine BIOME-Tabellen nach der Migration"; exit 1; }

echo "3/6 Migration rückwärts"       && lauf "$LAGE_DOWN" && lauf "$DOWN"

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

echo "4/6 Migration erneut vorwärts" && lauf "$UP" && lauf "$LAGE_UP"

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
  echo "6/8 Regeltests"
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$REGELN"
else
  echo "6/8 Regeltests fehlen — übersprungen"
fi

# ── Übernahme des Altbestands, ebenfalls vor und zurück ───────────────────
if [ -f "$ALT_UP" ]; then
  echo "7/8 Altbestand: Fixture, Übernahme vorwärts"
  lauf "$ALT_FIXTURE"
  lauf "$ALT_UP"

  echo "8/8 Altbestand: Regeltests, dann rückwärts und erneut vorwärts"
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$ALT_TESTS"

  BAEUME_VOR=$(psql -tAq -d "$DB" -c "select count(*) from biome_baum")
  lauf "$ALT_DOWN"
  REST=$(psql -tAq -d "$DB" -c \
    "select count(*) from pg_tables where schemaname='public' and tablename='biome_altbestand_baum'")
  [ "$REST" = "0" ] || { rot "FEHLER: biome_altbestand_baum blieb nach der Rücknahme stehen"; exit 1; }
  QUELLE=$(psql -tAq -d "$DB" -c "select count(*) from map_features where feature_type='tree'")
  [ "$QUELLE" = "2" ] || { rot "FEHLER: die Rücknahme hat den Ursprung in map_features angetastet ($QUELLE statt 2)"; exit 1; }

  lauf "$ALT_UP"
  BAEUME_NACH=$(psql -tAq -d "$DB" -c "select count(*) from biome_baum")
  [ "$BAEUME_NACH" = "$BAEUME_VOR" ] || {
    rot "FEHLER: zweiter Übernahmelauf ergibt $BAEUME_NACH statt $BAEUME_VOR Bäume"; exit 1; }
  echo "    Übernahme ist rücknehmbar und wiederholbar ($BAEUME_NACH Bäume)"
else
  echo "7/8 Altbestands-Übernahme fehlt — übersprungen"
fi

gruen "Migrations-Prüfstand grün."
