import { createContext, useContext, useState, useEffect } from 'react'
import { sb } from '../lib/supabase.js'

// Role hierarchy: admin > mitarbeiter > kunde_viewer
// user_profile table in Supabase stores org_id + rolle

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // Supabase auth user
  const [profile, setProfile] = useState(null) // user_profile row
  const [loading, setLoading] = useState(true)

  async function fetchProfile(supaUser) {
    if (!supaUser) { setProfile(null); return }
    const { data } = await sb.from('user_profile').select('*').eq('id', supaUser.id).maybeSingle()
    setProfile(data || null)
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

  async function logout() {
    await sb.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    if (!user) return { ok: false, error: 'Nicht angemeldet' }
    const { error } = await sb.from('user_profile').update(updates).eq('id', user.id)
    if (!error) setProfile(prev => ({ ...prev, ...updates }))
    return { ok: !error, error: error?.message }
  }

  async function updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword })
    return { ok: !error, error: error?.message }
  }

  // Derived role helpers
  const isAdmin      = profile?.rolle === 'admin'
  const isMitarbeiter = profile?.rolle === 'mitarbeiter' || isAdmin
  const isKunde      = profile?.rolle === 'kunde_viewer'

  // Display name: prefer profile name, fallback to email
  const displayName = profile?.name || user?.email?.split('@')[0] || '?'

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateProfile, updatePassword, isAdmin, isMitarbeiter, isKunde, displayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
