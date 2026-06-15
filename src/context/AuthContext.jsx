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

  async function updateProfile({ name, bio_rolle, skills }) {
    const updates = {}
    if (name !== undefined) updates.name = name
    if (bio_rolle !== undefined) updates.bio_rolle = bio_rolle
    if (skills !== undefined) updates.skills = skills
    const { error } = await sb.from('user_profile').update(updates).eq('id', user.id)
    if (error) return { ok: false, error: error.message }
    await fetchProfile(user)
    return { ok: true }
  }

  async function updateEmail(newEmail) {
    const { error } = await sb.auth.updateUser({ email: newEmail })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  async function updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  async function enrollMFA() {
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', issuer: 'LUMA Ops' })
    if (error) return { ok: false, error: error.message }
    return { ok: true, data }
  }

  async function challengeMFA(factorId) {
    const { data, error } = await sb.auth.mfa.challenge({ factorId })
    if (error) return { ok: false, error: error.message }
    return { ok: true, challengeId: data.id }
  }

  async function verifyMFA(factorId, challengeId, code) {
    const { error } = await sb.auth.mfa.verify({ factorId, challengeId, code })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  async function unenrollMFA(factorId) {
    const { error } = await sb.auth.mfa.unenroll({ factorId })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  async function listMFAFactors() {
    const { data, error } = await sb.auth.mfa.listFactors()
    if (error) return { ok: false, error: error.message }
    return { ok: true, factors: data?.all || [] }
  }

  // Derived role helpers
  const isAdmin      = profile?.rolle === 'admin'
  const isMitarbeiter = profile?.rolle === 'mitarbeiter' || isAdmin
  const isKunde      = profile?.rolle === 'kunde_viewer'

  // Display name: prefer profile name, fallback to email
  const displayName = profile?.name || user?.email?.split('@')[0] || '?'

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, isAdmin, isMitarbeiter, isKunde, displayName, updateProfile, updateEmail, updatePassword, enrollMFA, challengeMFA, verifyMFA, unenrollMFA, listMFAFactors }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
