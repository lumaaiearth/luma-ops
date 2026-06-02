import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { OpsProvider } from './context/OpsContext.jsx'
import { GCalProvider } from './context/GCalContext.jsx'
import { TimeProvider } from './context/TimeContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
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
import AnalysePage from './pages/AnalysePage.jsx'
import EpsAnalysePage from './pages/EpsAnalysePage.jsx'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
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
      <Route path="/analyse" element={<RequireAuth><Layout><ErrorBoundary><AnalysePage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="/analyse/:id" element={<RequireAuth><Layout><ErrorBoundary><EpsAnalysePage /></ErrorBoundary></Layout></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter basename="/">
      <AuthProvider>
        <GCalProvider>
          <OpsProvider>
            <TimeProvider>
              <AppRoutes />
            </TimeProvider>
          </OpsProvider>
        </GCalProvider>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  )
}
