#!/usr/bin/env bash
# Lokaler PostgreSQL für den Migrations-Prüfstand.
#
#   scripts/pg-local.sh start | stop | status
#
# Läuft auf Unix-Socket /tmp, Port 5433, ohne Netzwerk-Listener. Die Instanz
# ist ein Wegwerf-Prüfstand: sie enthält nie Produktionsdaten.
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-${TMPDIR:-/tmp}/biome-pgdata}"
PORT="${PGPORT:-5433}"

[ -x "$PGBIN/pg_ctl" ] || { echo "PostgreSQL-Binaries nicht unter $PGBIN — PGBIN setzen."; exit 1; }

case "${1:-status}" in
  start)
    id -u postgres >/dev/null 2>&1 || useradd -m postgres
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
      mkdir -p "$PGDATA"; chown -R postgres "$PGDATA"
      su postgres -c "$PGBIN/initdb -D '$PGDATA' -U postgres --encoding=UTF8 --locale=C" >/dev/null
    fi
    su postgres -c "$PGBIN/pg_ctl -D '$PGDATA' -o '-k /tmp -p $PORT -c listen_addresses=' -l '$PGDATA/log' start"
    sleep 1
    PGHOST=/tmp PGPORT=$PORT psql -U postgres -tAc 'select 1' >/dev/null && echo "PostgreSQL läuft auf /tmp:$PORT"
    ;;
  stop)
    su postgres -c "$PGBIN/pg_ctl -D '$PGDATA' stop -m fast" || true
    ;;
  status)
    pg_isready -h /tmp -p "$PORT" || true
    ;;
  *)
    echo "Aufruf: $0 {start|stop|status}"; exit 1
    ;;
esac
