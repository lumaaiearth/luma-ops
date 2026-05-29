import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { LayoutDashboard, CalendarDays, ListChecks, Radio, Users, Settings, LogOut, Menu, X, Clock } from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar',  icon: CalendarDays,    label: 'Kalender' },
  { to: '/jobs',      icon: ListChecks,      label: 'Einsätze' },
  { to: '/time',      icon: Clock,           label: 'Zeiten' },
  { to: '/sensors',   icon: Radio,           label: 'Sensoren' },
  { to: '/team',      icon: Users,           label: 'Team' },
  { to: '/settings',  icon: Settings,        label: 'Einstellungen' },
]

const A = '#08AA56'
const BG = '#080f14'
const SURFACE = '#0d1a23'
const BORDER = 'rgba(255,255,255,0.07)'
const FG = '#e8f0f5'
const MUTED = 'rgba(232,240,245,0.5)'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: SURFACE, borderRight: `1px solid ${BORDER}` }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2 }}>LUMA</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 400, color: FG, letterSpacing: '-0.02em' }}>Ops</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 6,
              textDecoration: 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: isActive ? 500 : 400,
              color: isActive ? A : MUTED,
              background: isActive ? `${A}14` : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 8px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: user?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#001219', fontWeight: 700 }}>{user?.initials}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, color: FG, fontWeight: 500 }}>{user?.name}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", transition: 'color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = FG; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} /> Abmelden
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: BG }}>
      {/* Desktop sidebar */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column' }} className="desktop-sidebar">
        <style>{`
          @media (max-width: 768px) { .desktop-sidebar { display: none !important; } .mobile-nav-btn { display: flex !important; } }
          @media (min-width: 769px) { .mobile-nav-btn { display: none !important; } }
        `}</style>
        {sidebar}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setMobileOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 200 }} onClick={e => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile topbar */}
        <div className="mobile-nav-btn" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, background: SURFACE }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: FG, padding: 4 }}>
            <Menu size={20} />
          </button>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: A, letterSpacing: '0.15em' }}>LUMA OPS</div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: user?.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#001219', fontWeight: 700 }}>{user?.initials}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export { A, BG, SURFACE, BORDER, FG, MUTED }
