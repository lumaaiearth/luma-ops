import { createContext, useContext, useState, useEffect } from 'react'
import { sb } from '../lib/supabase.js'

// Role hierarchy: admin > mitarbeiter > kunde_viewer
// user_profile table in Supabase stores org_id + rolle

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // Supabase auth user
  const [profile, setProfile] = useState(null) // user_profile row
  const [allProfiles, setAllProfiles] = useState([]) // alle Team-Profile (Brücke TEAM ↔ Accounts)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(supaUser) {
    if (!supaUser) { setProfile(null); setAllProfiles([]); return }
    const { data } = await sb.from('user_profile').select('*').eq('id', supaUser.id).maybeSingle()
    setProfile(data || null)
    // Alle Profile laden (für Avatare/Kontaktdaten app-weit); Fehler unkritisch
    const { data: all } = await sb.from('user_profile').select('id, name, rolle, avatar_url, phone, contact_email, bio, team_id')
    setAllProfiles(all || [])
  }

  useEffect(() => {
    // Restore session
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      fetchProfile(session?.user ?? null).finally(() => setLoading(false))
    })

    // Listen for auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      fetchProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }
    await fetchProfile(data.user)
    return { ok: true }
  }

  // OAuth-Login via Google. Leitet den Browser zu Google und wieder zurück;
  // die Session wird beim Rücksprung von onAuthStateChange aufgefangen.
  async function loginWithGoogle() {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: { prompt: 'select_account' },
      },
    })
    // Bei Erfolg verlässt der Browser die Seite (Redirect) — kein return nötig.
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  // Sendet eine Passwort-Zurücksetzen-Mail (Link führt zurück auf /login).
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  async function logout() {
    await sb.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // ── Mein Profil bearbeiten ────────────────────────────────────────────────
  async function updateProfile(changes) {
    if (!user) return { ok: false, error: 'Nicht angemeldet' }
    // Kein upsert: dessen ON CONFLICT DO UPDATE setzt auch die id-Spalte, für die
    // authenticated kein UPDATE-Grant hat → der ganze Save scheitert (42501).
    const { data, error } = await sb.from('user_profile').update(changes).eq('id', user.id).select('id')
    if (error) return { ok: false, error: error.message }
    if (!data?.length) {
      const { error: insErr } = await sb.from('user_profile').insert({ id: user.id, ...changes })
      if (insErr) return { ok: false, error: insErr.message }
    }
    setProfile(p => ({ ...(p || { id: user.id }), ...changes }))
    setAllProfiles(list => {
      const exists = list.some(x => x.id === user.id)
      return exists
        ? list.map(x => x.id === user.id ? { ...x, ...changes } : x)
        : [...list, { id: user.id, ...changes }]
    })
    return { ok: true }
  }

  async function changePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword })
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  // Löst eine Bestätigungsmail an die neue Adresse aus
  async function changeEmail(newEmail) {
    const { error } = await sb.auth.updateUser({ email: newEmail })
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  /** Profil eines Team-Mitglieds (Seed-TEAM-id wie 'malte') — Brücke für Avatare/Kontakt */
  function profileForTeamId(teamId) {
    return allProfiles.find(p => p.team_id === teamId) || null
  }

  // Derived role helpers
  const isAdmin      = profile?.rolle === 'admin'
  const isMitarbeiter = profile?.rolle === 'mitarbeiter' || isAdmin
  const isKunde      = profile?.rolle === 'kunde_viewer'
  const isGast       = profile?.rolle === 'gast'

  // Display name: prefer profile name, fallback to email
  const displayName = profile?.name || user?.email?.split('@')[0] || '?'

  return (
    <AuthContext.Provider value={{ user, profile, allProfiles, loading, login, loginWithGoogle, resetPassword, logout, isAdmin, isMitarbeiter, isKunde, isGast, displayName, updateProfile, changePassword, changeEmail, profileForTeamId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
