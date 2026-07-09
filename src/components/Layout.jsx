import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { LayoutDashboard, CalendarDays, ListChecks, Radio, Users, Settings, LogOut, Clock, Map, Database, FolderOpen, MoreHorizontal, BarChart2, Flower2, ListTodo } from 'lucide-react'
import { A, BG, SURFACE, BORDER, FG, MUTED, A14 } from '../lib/theme.js'
import { Avatar, MONO, SANS } from './ui.jsx'

// Navigation nach Arbeitskontext gruppiert — 13 flache Einträge sind schwer scannbar
const NAV_GROUPS = [
  {
    label: 'Betrieb',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/calendar',  icon: CalendarDays,    label: 'Kalender' },
      { to: '/tasks',     icon: ListTodo,        label: 'Offene Aufgaben', short: 'Aufgaben' },
      { to: '/jobs',      icon: ListChecks,      label: 'Einsatzübersicht', short: 'Einsätze' },
    ],
  },
  {
    label: 'Feld & Analyse',
    items: [
      { to: '/map',      icon: Map,      label: 'BIOME™' },
      { to: '/analyse',  icon: BarChart2, label: 'Analysen' },
      { to: '/planning', icon: Flower2,  label: 'Florales™' },
      { to: '/sensors',  icon: Radio,    label: 'Sensoren' },
    ],
  },
  {
    label: 'Verwaltung',
    items: [
      { to: '/time',  icon: Clock,      label: 'Zeiten' },
      { to: '/data',  icon: Database,   label: 'Stammdaten' },
      { to: '/drive', icon: FolderOpen, label: 'Drive' },
      { to: '/team',  icon: Users,      label: 'Team' },
    ],
  },
]

const NAV_FLAT = NAV_GROUPS.flatMap(g => g.items)

// Die 5 wichtigsten Ziele in der mobilen Bottom-Bar; Rest im „Mehr"-Drawer
const BOTTOM_NAV = [NAV_FLAT[0], NAV_FLAT[1], NAV_FLAT[2], NAV_FLAT[3], NAV_FLAT[4]]

function SidebarLink({ to, icon: Icon, label, onNavigate }) {
  return (
    <NavLink to={to} onClick={onNavigate}
      className={({ isActive }) => `lu-nav${isActive ? ' active' : ''}`}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 6,
        textDecoration: 'none',
        fontFamily: SANS,
        fontSize: 14, fontWeight: isActive ? 500 : 400,
        color: isActive ? A : MUTED,
        background: isActive ? A14 : 'transparent',
      })}>
      <Icon size={16} />
      {label}
    </NavLink>
  )
}

export default function Layout({ children, fullHeight = false }) {
  const { user, profile, displayName, logout } = useAuth()
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '?'
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const closeMobile = () => setMobileOpen(false)

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: SURFACE, borderRight: `1px solid ${BORDER}` }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: A, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2 }}>LUMA</div>
        <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 400, color: FG, letterSpacing: '-0.02em' }}>Ops</div>
      </div>

      {/* Nav — gruppiert */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '4px 12px 6px', opacity: 0.75 }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map(item => (
                <SidebarLink key={item.to} {...item} onNavigate={closeMobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Einstellungen + User */}
      <div style={{ padding: '10px 8px', borderTop: `1px solid ${BORDER}` }}>
        <SidebarLink to="/settings" icon={Settings} label="Einstellungen" onNavigate={closeMobile} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginTop: 4 }}>
          <Avatar initials={initials} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: FG, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{profile?.rolle}</div>
          </div>
          <button onClick={handleLogout} title="Abmelden" className="lu-nav"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, flexShrink: 0 }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="luma-root" style={{ display: 'flex', overflow: 'hidden', background: BG }}>
      <style>{`
        .luma-root { height: 100vh; height: 100dvh; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
          .main-content { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={closeMobile}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 220 }} onClick={e => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Mobile topbar — hidden on fullHeight pages (they have their own controls) */}
        {!fullHeight && (
          <div className="mobile-topbar" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, color: A, letterSpacing: '0.18em' }}>LUMA OPS</div>
            <Avatar initials={initials} size={28} />
          </div>
        )}

        <div className="main-content lu-fade-in" style={{ flex: 1, overflowY: fullHeight ? 'hidden' : 'auto', display: fullHeight ? 'flex' : 'block', flexDirection: 'column' }}>
          {children}
        </div>

        {/* Mobile bottom navigation */}
        <div className="mobile-bottom-nav" style={{
          display: 'none', alignItems: 'center', justifyContent: 'space-around',
          borderTop: `1px solid ${BORDER}`, background: SURFACE,
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
          height: 'calc(60px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {BOTTOM_NAV.map(({ to, icon: Icon, label, short }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
                color: isActive ? A : MUTED, flex: 1,
                fontFamily: SANS,
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={20} />
                  <span style={{ fontSize: 10, fontWeight: isActive ? 500 : 400 }}>{short || label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* More button */}
          <button onClick={() => setMobileOpen(true)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 12px', background: 'transparent', border: 'none', color: MUTED, flex: 1, cursor: 'pointer', fontFamily: SANS }}>
            <MoreHorizontal size={20} />
            <span style={{ fontSize: 10 }}>Mehr</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export { A, BG, SURFACE, BORDER, FG, MUTED } from '../lib/theme.js'
