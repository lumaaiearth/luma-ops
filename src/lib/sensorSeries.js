// Reine Rechenlogik für Messwert-Reihen — bewusst ohne Supabase-Import, damit
// sie im Node-Testskript geprüft werden kann und die Kachel-Komponente nicht
// den DB-Client mitzieht. Das Laden steckt in sensorHistory.js.

export const MAX_POINTS = 48

// Gleichmäßig ausdünnen, letzten Punkt immer behalten: die Kachel zeigt den
// aktuellen Wert, der darf beim Ausdünnen nicht wegfallen.
export function downsample(rows, max = MAX_POINTS) {
  if (!Array.isArray(rows) || rows.length <= max) return rows || []
  if (max <= 1) return [rows[rows.length - 1]]
  const step = (rows.length - 1) / (max - 1)
  const out = []
  for (let i = 0; i < max - 1; i++) out.push(rows[Math.round(i * step)])
  out.push(rows[rows.length - 1])
  return out
}

// Messwert zu einer Zahl machen — oder zu NaN, wenn es keiner ist.
//
// Achtung, hier steckt eine Falle: Number(null) ist 0, nicht NaN. Ein `value
// null` aus der DB würde also als echte 0 durchgehen und Min/Ø nach unten
// ziehen (bei Bodenfeuchte sähe eine Lücke wie ein Trockenalarm aus). Leerer
// String verhält sich genauso. Beides deshalb vorab abfangen.
export function toValue(raw) {
  const v = typeof raw === 'number' ? raw : raw?.value !== undefined ? raw.value : raw
  if (v === null || v === undefined || v === '') return NaN
  return Number(v)
}

const TAG_MS = 24 * 3600 * 1000
// Ab wann eine Reihe als veraltet gilt. Die Messwerte kommen in Schüben, nicht
// als Live-Strom — drei Tage ohne neuen Wert heißt in der Praxis: Der Sensor
// liefert gerade nicht, und die Kachel darf das nicht als aktuellen Stand
// ausgeben.
export const STALE_TAGE = 3

const kurzDatum = ts => new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })

// Zeitraum einer Reihe — für die Beschriftung unter der Sparkline.
//
// Bewusst aus den Daten abgeleitet statt fest „7 Tage" hinzuschreiben: Wenn der
// letzte Wert drei Wochen alt ist, wäre jede feste Angabe schlicht gelogen.
export function seriesSpan(series, jetzt = Date.now()) {
  const ts = (series || [])
    .map(p => (typeof p?.ts === 'number' ? p.ts : Number(p?.ts)))
    .filter(t => Number.isFinite(t))
  if (!ts.length) return null
  const from = Math.min(...ts), to = Math.max(...ts)
  const alterTage = (jetzt - to) / TAG_MS
  return {
    from,
    to,
    tage: (to - from) / TAG_MS,
    veraltet: alterTage >= STALE_TAGE,
    alterTage,
    label: from === to ? kurzDatum(from) : `${kurzDatum(from)}–${kurzDatum(to)}`,
  }
}

// Kennzahlen einer Reihe. Lücken (null, leer, NaN) fliegen raus.
export function seriesStats(series) {
  const vals = (series || [])
    .map(toValue)
    .filter(v => Number.isFinite(v))
  if (!vals.length) return null
  const first = vals[0], last = vals[vals.length - 1]
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    first,
    last,
    delta: last - first,
    points: vals.length,
  }
}
