import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { OpsProvider } from './context/OpsContext.jsx'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import SensorsPage from './pages/SensorsPage.jsx'
import TeamPage from './pages/TeamPage.jsx'

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
      <Route path="/dashboard" element={<RequireAuth><Layout><DashboardPage /></Layout></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><Layout><CalendarPage /></Layout></RequireAuth>} />
      <Route path="/jobs" element={<RequireAuth><Layout><JobsPage /></Layout></RequireAuth>} />
      <Route path="/sensors" element={<RequireAuth><Layout><SensorsPage /></Layout></RequireAuth>} />
      <Route path="/team" element={<RequireAuth><Layout><TeamPage /></Layout></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/luma-ops">
      <AuthProvider>
        <OpsProvider>
          <AppRoutes />
        </OpsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
