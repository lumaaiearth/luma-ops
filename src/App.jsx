import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { OpsProvider } from './context/OpsContext.jsx'
import { GCalProvider } from './context/GCalContext.jsx'
import { TimeProvider } from './context/TimeContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { WeatherProvider } from './context/WeatherContext.jsx'
import TimePage from './pages/TimePage.jsx'
import MapPage from './pages/MapPage.jsx'
import StammdatenPage from './pages/StammdatenPage.jsx'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import SensorsPage from './pages/SensorsPage.jsx'
import TeamPage from './pages/TeamPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProjectPage from './pages/ProjectPage.jsx'
import DrivePage from './pages/DrivePage.jsx'
import ClientPage from './pages/ClientPage.jsx'
import AnalysePage from './pages/AnalysePage.jsx'
import PlanningPage from './pages/PlanningPage.jsx'
import EpsAnalysePage from './pages/EpsAnalysePage.jsx'
import ArticleViewPage from './pages/ArticleViewPage.jsx'
import KundenPortalPage from './pages/KundenPortalPage.jsx'

function RequireAuth({ children, kundeOk = false }) {
  const { user, loading, isKunde } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#08AA56', fontFamily: 'monospace' }}>...</div>
  if (!user) return <Navigate to="/login" replace />
  // Kunden only see /portal — redirect everything else
  if (isKunde && !kundeOk) return <Navigate to="/portal" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout><Navigate to="/dashboard" replace /></Layout></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><Layout><ErrorBoundary><DashboardPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><Layout fullHeight><ErrorBoundary><CalendarPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/jobs" element={<RequireAuth><Layout><ErrorBoundary><JobsPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/sensors" element={<RequireAuth><Layout><ErrorBoundary><SensorsPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/team" element={<RequireAuth><Layout><ErrorBoundary><TeamPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/time" element={<RequireAuth><Layout><ErrorBoundary><TimePage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/map" element={<RequireAuth><Layout fullHeight><ErrorBoundary><MapPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Layout><ErrorBoundary><SettingsPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/data" element={<RequireAuth><Layout><ErrorBoundary><StammdatenPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/drive" element={<RequireAuth><Layout><ErrorBoundary><DrivePage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/projects/:id" element={<RequireAuth><Layout><ErrorBoundary><ProjectPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/clients/:id" element={<RequireAuth><Layout><ErrorBoundary><ClientPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/analyse" element={<RequireAuth><Layout><ErrorBoundary><AnalysePage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/planning" element={<RequireAuth><Layout fullHeight><ErrorBoundary><PlanningPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/analyse/:id" element={<RequireAuth><Layout><ErrorBoundary><EpsAnalysePage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/analyse/artikel/:id" element={<RequireAuth><Layout><ErrorBoundary><ArticleViewPage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/portal" element={<RequireAuth kundeOk><ErrorBoundary><KundenPortalPage /></ErrorBoundary></RequireAuth>} />
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
        <div key={t.id} style={{ background: '#7f1d1d', border: '1px solid #dc2626', color: '#fca5a5', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 380 }}>
          {t.msg}
        </div>
      ))}
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
            </TimeProvider>
            </WeatherProvider>
          </OpsProvider>
        </GCalProvider>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  )
}
