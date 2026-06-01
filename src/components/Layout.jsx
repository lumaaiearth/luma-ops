import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { LayoutDashboard, CalendarDays, ListChecks, Radio, Users, Settings, LogOut, Menu, X, Clock, Map, Database, FolderOpen, MoreHorizontal } from 'lucide-react'
import { A, BG, SURFACE, BORDER, FG, MUTED, A14, A06 } from '../lib/theme.js'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar',   icon: CalendarDays,    label: 'Kalender' },
  { to: '/jobs',       icon: ListChecks,      label: 'Einsätze' },
  { to: '/map',        icon: Map,             label: 'Karte' },
  { to: '/time',       icon: Clock,           label: 'Zeiten' },
  { to: '/data',       icon: Database,        label: 'Stammdaten' },
  { to: '/drive',       icon: FolderOpen,      label: 'Drive' },
  { to: '/sensors',    icon: Radio,           label: 'Sensoren' },
  { to: '/team',       icon: Users,           label: 'Team' },
  { to: '/settings',   icon: Settings,        label: 'Einstellungen' },
]

// First 4 nav items show in bottom bar; rest in "More" drawer
const BOTTOM_NAV = NAV.slice(0, 4)

export default function Layout({ children, fullHeight = false }) {
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
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 6,
              textDecoration: 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: isActive ? 500 : 400,
              color: isActive ? A : MUTED,
              background: isActive ? A14 : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            })}>
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
        <button onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", transition: 'color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = FG; e.currentTarget.style.background = A06 }}
          onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = 'transparent' }}>
          <LogOut size={16} /> Abmelden
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: BG }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
          .main-content { padding-bottom: 60px; }
        }
        @media (min-width: 769px) {
          .mobile-topbar { display: none !important; }
          .mobile-bottom-nav { display: none !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {sidebar}
      </div>

      {/* Mobile full-menu overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setMobileOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 220 }} onClick={e => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: A, letterSpacing: '0.18em' }}>LUMA OPS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: user?.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#001219', fontWeight: 700 }}>{user?.initials}</span>
            </div>
          </div>
        </div>

        <div className="main-content" style={{ flex: 1, overflowY: fullHeight ? 'hidden' : 'auto', display: fullHeight ? 'flex' : 'block', flexDirection: 'column' }}>
          {children}
        </div>

        {/* Mobile bottom navigation */}
        <div className="mobile-bottom-nav" style={{
          display: 'none', alignItems: 'center', justifyContent: 'space-around',
          borderTop: `1px solid ${BORDER}`, background: SURFACE,
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          height: 60, paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
                color: isActive ? A : MUTED, flex: 1,
                fontFamily: "'Space Grotesk', sans-serif",
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={20} />
                  <span style={{ fontSize: 10, fontWeight: isActive ? 500 : 400 }}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* More button */}
          <button onClick={() => setMobileOpen(true)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 12px', background: 'transparent', border: 'none', color: MUTED, flex: 1, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
            <MoreHorizontal size={20} />
            <span style={{ fontSize: 10 }}>Mehr</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export { A, BG, SURFACE, BORDER, FG, MUTED } from '../lib/theme.js'
