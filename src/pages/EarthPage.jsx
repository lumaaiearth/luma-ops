// BIOME Earth (P0): die Karte als eigenständige Vollbild-App ohne Ops-Chrome.
// Wird über /earth aufgerufen — aus BIOME heraus per „Eigenes Fenster"-Button
// (window.open) oder direkt als URL/Lesezeichen. Gleiche Daten, gleiche Rechte.
import MapPage from './MapPage.jsx'

export default function EarthPage() {
  return (
    <div style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: 'var(--luma-bg)' }}>
      <MapPage />
    </div>
  )
}
