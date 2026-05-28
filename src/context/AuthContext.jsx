import { createContext, useContext, useState, useEffect } from 'react'
import { TEAM } from '../data/seed.js'

// Passwords are intentionally simple for internal MVP — replace with Supabase Auth before going to production
const CREDENTIALS = {
  malte:  'luma2026',
  lukas:  'luma2026',
  robert: 'luma2026',
  jona:   'luma2026',
  anselm: 'luma2026',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('luma_user')) } catch { return null }
  })

  function login(username, password) {
    if (CREDENTIALS[username] && CREDENTIALS[username] === password) {
      const u = TEAM.find(t => t.id === username)
      setUser(u)
      sessionStorage.setItem('luma_user', JSON.stringify(u))
      return true
    }
    return false
  }

  function logout() {
    setUser(null)
    sessionStorage.removeItem('luma_user')
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
