import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { LayoutDashboard, CalendarDays, ListChecks, Radio, Users, Settings, LogOut, Clock, Map, Database, FolderOpen, MoreHorizontal, BarChart2, Flower2, ListTodo, UserCircle } from 'lucide-react'
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

/** Icon-Rail-Eintrag (Desktop): quadratisches Icon mit Tooltip rechts */
function RailLink({ to, icon: Icon, label }) {
  return (
    <NavLink to={to} data-tip={label} aria-label={label}
      className={({ isActive }) => `lu-tip lu-rail-link${isActive ? ' active' : ''}`}
      style={({ isActive }) => ({
        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textDecoration: 'none',
        color: isActive ? A : MUTED,
        background: isActive ? A14 : 'transparent',
      })}>
      <Icon size={19} />
    </NavLink>
  )
}

export default function Layout({ children, fullHeight = false }) {
  const { user, profile, displayName, logout } = useAuth()
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '?'
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Avatar-Menü schließt bei Klick außerhalb
  useEffect(() => {
    if (!userMenuOpen) return
    const h = e => { if (!userMenuRef.current?.contains(e.target)) setUserMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [userMenuOpen])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const closeMobile = () => setMobileOpen(false)

  // Desktop: kompakte Icon-Rail im Stil moderner Dashboards
  const rail = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', background: SURFACE, borderRight: `1px solid ${BORDER}`, padding: '14px 0 12px', gap: 4 }}>
      {/* Brand-Mark */}
      <NavLink to="/dashboard" title="LUMA Ops" style={{ width: 42, height: 42, borderRadius: 14, background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginBottom: 10, flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: 'var(--luma-on-a)', letterSpacing: '0.02em' }}>LU</span>
      </NavLink>

      {/* Nav-Gruppen als Icon-Stapel mit Trennlinien */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, overflowY: 'auto', paddingBottom: 4 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ display: 'contents' }}>
            {gi > 0 && <div style={{ width: 26, height: 1, background: BORDER, margin: '5px 0', flexShrink: 0 }} />}
            {group.items.map(item => <RailLink key={item.to} {...item} />)}
          </div>
        ))}
      </nav>

      <div style={{ width: 26, height: 1, background: BORDER, margin: '4px 0', flexShrink: 0 }} />
      <RailLink to="/settings" icon={Settings} label="Einstellungen" />

      {/* Avatar → Konto-Menü (überall erreichbar) */}
      <div ref={userMenuRef} style={{ position: 'relative', marginTop: 6 }}>
        <button onClick={() => setUserMenuOpen(v => !v)} aria-label="Konto-Menü" data-tip={userMenuOpen ? undefined : `${displayName}${profile?.rolle ? ` · ${profile.rolle}` : ''}`}
          className={userMenuOpen ? '' : 'lu-tip'}
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', display: 'flex' }}>
          <Avatar initials={initials} size={36} src={profile?.avatar_url || null} />
        </button>
        {userMenuOpen && (
          <div className="lu-fade-in" style={{ position: 'absolute', left: 52, bottom: 0, width: 210, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.35)', padding: 6, zIndex: 700 }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>{profile?.rolle || ''}</div>
            </div>
            {[
              { icon: UserCircle, label: 'Mein Profil', onClick: () => { setUserMenuOpen(false); navigate('/profile') } },
              { icon: Settings, label: 'Einstellungen', onClick: () => { setUserMenuOpen(false); navigate('/settings') } },
              { icon: LogOut, label: 'Abmelden', onClick: handleLogout },
            ].map(item => (
              <button key={item.label} onClick={item.onClick} className="lu-nav"
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: SANS, textAlign: 'left' }}>
                <item.icon size={15} /> {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

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
          <div onClick={() => { closeMobile(); navigate('/profile') }} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }} title="Mein Profil">
            <Avatar initials={initials} size={28} src={profile?.avatar_url || null} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: FG, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{profile?.rolle}</div>
            </div>
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

      {/* Desktop: Icon-Rail */}
      <div className="desktop-sidebar" style={{ width: 68, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {rail}
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
            <button onClick={() => navigate('/profile')} aria-label="Mein Profil" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', display: 'flex' }}>
              <Avatar initials={initials} size={28} src={profile?.avatar_url || null} />
            </button>
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
