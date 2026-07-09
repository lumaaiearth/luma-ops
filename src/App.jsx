import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { OpsProvider } from './context/OpsContext.jsx'
import { GCalProvider } from './context/GCalContext.jsx'
import { TimeProvider } from './context/TimeContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { WeatherProvider } from './context/WeatherContext.jsx'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import { outboxCount } from './lib/outbox.js'

// Code-Splitting: schwere/selten genutzte Seiten erst bei Bedarf laden
// (holt Leaflet/GeoTIFF/Recharts aus dem Start-Bundle → schnellerer Erststart)
const TimePage         = lazy(() => import('./pages/TimePage.jsx'))
const MapPage          = lazy(() => import('./pages/MapPage.jsx'))
const StammdatenPage   = lazy(() => import('./pages/StammdatenPage.jsx'))
const CalendarPage     = lazy(() => import('./pages/CalendarPage.jsx'))
const JobsPage         = lazy(() => import('./pages/JobsPage.jsx'))
const TasksPage        = lazy(() => import('./pages/TasksPage.jsx'))
const SensorsPage      = lazy(() => import('./pages/SensorsPage.jsx'))
const TeamPage         = lazy(() => import('./pages/TeamPage.jsx'))
const SettingsPage     = lazy(() => import('./pages/SettingsPage.jsx'))
const ProjectPage      = lazy(() => import('./pages/ProjectPage.jsx'))
const DrivePage        = lazy(() => import('./pages/DrivePage.jsx'))
const ClientPage       = lazy(() => import('./pages/ClientPage.jsx'))
const AnalysePage      = lazy(() => import('./pages/AnalysePage.jsx'))
const PlanningPage     = lazy(() => import('./pages/PlanningPage.jsx'))
const EpsAnalysePage   = lazy(() => import('./pages/EpsAnalysePage.jsx'))
const ArticleViewPage  = lazy(() => import('./pages/ArticleViewPage.jsx'))
const KundenPortalPage = lazy(() => import('./pages/KundenPortalPage.jsx'))

function RequireAuth({ children, kundeOk = false }) {
  const { user, loading, isKunde } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#08AA56', fontFamily: 'monospace' }}>...</div>
  if (!user) return <Navigate to="/login" replace />
  // Kunden only see /portal — redirect everything else
  if (isKunde && !kundeOk) return <Navigate to="/portal" replace />
  return children
}

function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#08AA56', fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7 }}>
      lädt…
    </div>
  )
}

// Wrapper: Auth-Schutz + Layout (Sidebar bleibt sichtbar) + Suspense fürs Nachladen
function Protected({ children, fullHeight = false }) {
  return (
    <RequireAuth>
      <Layout fullHeight={fullHeight}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </ErrorBoundary>
      </Layout>
    </RequireAuth>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<Protected><Navigate to="/dashboard" replace /></Protected>} />
      <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/calendar" element={<Protected fullHeight><CalendarPage /></Protected>} />
      <Route path="/jobs" element={<Protected><JobsPage /></Protected>} />
      <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
      <Route path="/sensors" element={<Protected><SensorsPage /></Protected>} />
      <Route path="/team" element={<Protected><TeamPage /></Protected>} />
      <Route path="/time" element={<Protected><TimePage /></Protected>} />
      <Route path="/map" element={<Protected fullHeight><MapPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="/data" element={<Protected><StammdatenPage /></Protected>} />
      <Route path="/drive" element={<Protected><DrivePage /></Protected>} />
      <Route path="/projects/:id" element={<Protected><ProjectPage /></Protected>} />
      <Route path="/clients/:id" element={<Protected><ClientPage /></Protected>} />
      <Route path="/analyse" element={<Protected><AnalysePage /></Protected>} />
      <Route path="/planning" element={<Protected fullHeight><PlanningPage /></Protected>} />
      <Route path="/analyse/:id" element={<Protected><EpsAnalysePage /></Protected>} />
      <Route path="/analyse/artikel/:id" element={<Protected><ArticleViewPage /></Protected>} />
      <Route path="/portal" element={<RequireAuth kundeOk><ErrorBoundary><Suspense fallback={<PageLoader />}><KundenPortalPage /></Suspense></ErrorBoundary></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function DbToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    window.__lumaToast = (msg) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, msg }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
    }
    return () => { delete window.__lumaToast }
  }, [])

  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} className="lu-fade-in" style={{ background: 'color-mix(in srgb, var(--luma-danger) 18%, var(--luma-card))', border: '1px solid color-mix(in srgb, var(--luma-danger) 50%, transparent)', color: 'var(--luma-danger)', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.35)', maxWidth: 380 }}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [pending, setPending] = useState(outboxCount())
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const oc = e => setPending(e.detail)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener('luma-outbox', oc)
    const t = setInterval(() => setPending(outboxCount()), 5000)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('luma-outbox', oc)
      clearInterval(t)
    }
  }, [])
  if (online && pending === 0) return null
  const offline = !online
  return (
    <div className="lu-fade-in" style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 9998, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, background: `color-mix(in srgb, ${offline ? 'var(--luma-warn)' : 'var(--luma-info)'} 14%, var(--luma-card))`, border: `1px solid ${offline ? 'var(--luma-warn)' : 'var(--luma-info)'}`, color: offline ? 'var(--luma-warn)' : 'var(--luma-info)', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: offline ? 'var(--luma-warn)' : 'var(--luma-info)' }} />
      {offline ? 'Offline' : 'Synchronisiere…'}{pending > 0 ? ` · ${pending} ausstehend` : ''}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter basename="/">
      <AuthProvider>
        <GCalProvider>
          <OpsProvider>
            <WeatherProvider>
            <TimeProvider>
              <AppRoutes />
              <DbToast />
              <OfflineBadge />
            </TimeProvider>
            </WeatherProvider>
          </OpsProvider>
        </GCalProvider>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  )
}
