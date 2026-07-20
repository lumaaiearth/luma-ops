// Einsätze-Hub: bündelt Liste (Einsatzübersicht), Kalender und Wochenplan
// unter einem Reiter mit Ansicht-Umschalter. Der zuletzt gewählte Modus wird
// gemerkt (localStorage); /calendar, /wochenplan und /jobs leiten hierher um.
import { useState, useEffect, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, CalendarDays, CalendarRange } from 'lucide-react'
import { A, BG, SURFACE, BORDER, MUTED, A14 } from '../lib/theme.js'
import { SANS } from '../components/ui.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'

const JobsPage       = lazy(() => import('./JobsPage.jsx'))
const CalendarPage   = lazy(() => import('./CalendarPage.jsx'))
const WochenplanPage = lazy(() => import('./WochenplanPage.jsx'))

const VIEWS = [
  { id: 'liste',      label: 'Liste',      icon: List },
  { id: 'kalender',   label: 'Kalender',   icon: CalendarDays },
  { id: 'wochenplan', label: 'Wochenplan', icon: CalendarRange },
]
const LS_KEY = 'luma_einsaetze_view'

function Loader() {
  return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: A, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7 }}>lädt…</div>
}

export default function EinsaetzePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const bp = useBreakpoint()
  const isMobile = bp === 'xs' || bp === 'sm'
  const [view, setView] = useState(() => {
    const q = searchParams.get('view')
    if (q && VIEWS.some(v => v.id === q)) return q
    try { const s = localStorage.getItem(LS_KEY); if (VIEWS.some(v => v.id === s)) return s } catch {}
    return 'liste'
  })

  // Deep-Links (?view=…) aus Redirects übernehmen, danach Param aufräumen
  useEffect(() => {
    const q = searchParams.get('view')
    if (q && VIEWS.some(v => v.id === q)) {
      setView(q)
      searchParams.delete('view')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams])

  function switchView(id) {
    setView(id)
    try { localStorage.setItem(LS_KEY, id) } catch {}
  }

  const switcher = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => switchView(id)} className={view === id ? undefined : 'lu-tab'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
            border: 'none', background: view === id ? A14 : 'transparent',
            color: view === id ? A : MUTED, cursor: 'pointer', fontSize: 13,
            fontWeight: view === id ? 600 : 400, fontFamily: SANS, whiteSpace: 'nowrap',
          }}>
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  )

  // Desktop-Kalender: Umschalter wandert in die Kalender-Topbar (spart eine
  // ganze Kopfzeile → der Kalender füllt mehr vom Bildschirm)
  const inlineSwitcher = view === 'kalender' && !isMobile

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: BG }}>
      {/* Ansicht-Umschalter (eigene Leiste nur, wenn nicht in der Kalender-Topbar) */}
      {!inlineSwitcher && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0 }}>
          {switcher}
        </div>
      )}

      {/* Inhalt: Kalender füllt die Höhe, Liste & Wochenplan scrollen selbst */}
      {view === 'kalender' ? (
        <Suspense fallback={<Loader />}>
          <CalendarPage viewSwitcher={inlineSwitcher ? switcher : null} />
        </Suspense>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Suspense fallback={<Loader />}>
            {view === 'liste' && <JobsPage />}
            {view === 'wochenplan' && <WochenplanPage embedded />}
          </Suspense>
        </div>
      )}
    </div>
  )
}
