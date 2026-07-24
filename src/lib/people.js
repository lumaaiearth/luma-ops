// ────────────────────────────────────────────────────────────────
// Zentrale Personen-Verwaltung.
// Kern-Team kommt weiterhin aus data/seed.js (TEAM). Zusätzlich gibt es
// dynamische Personen (Selbstständige/Freelancer) aus der Supabase-Tabelle
// `people` — bis zu ~20 Leute, die täglich für Einsätze/Aufgaben ausgewählt
// werden. Der OpsContext befüllt die Registry; reine Render-Helfer (z.B.
// Avatar-Reihen) lösen Personen über findPerson()/peopleForIds() auf, ohne
// selbst am Context zu hängen.
// ────────────────────────────────────────────────────────────────
import { TEAM } from '../data/seed.js'

// Gut unterscheidbare Farben für Freelancer (Kern-Team hat eigene Farben)
export const FREELANCER_COLORS = [
  '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#3B82F6', '#A3E635', '#E11D48', '#06B6D4', '#D946EF',
  '#84CC16', '#F43F5E', '#0EA5E9', '#EAB308', '#7C3AED',
  '#10B981', '#FB7185', '#60A5FA', '#FBBF24', '#34D399',
]

export function initialsFor(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** DB-Zeile → einheitliches Personen-Objekt (Farbe/Initialen ergänzen) */
export function normalizePerson(row, index = 0) {
  return {
    ...row,
    role: row.rolle || 'freelancer',
    color: row.color || FREELANCER_COLORS[index % FREELANCER_COLORS.length],
    initials: row.initials || initialsFor(row.name),
    freelancer: true,
  }
}

let freelancerRegistry = []

/** Wird vom OpsContext bei Load/Realtime/CRUD aufgerufen */
export function setFreelancerRegistry(rows) {
  freelancerRegistry = (rows || []).map((r, i) => normalizePerson(r, i))
}

// Profilfotos: user_profile verknüpft Login-Konten über team_id mit den
// Personen-ids (Kern-Team wie 'malte', theoretisch auch Freelancer-ids).
let avatarRegistry = {}

/** Wird vom AuthContext befüllt, sobald die Profile geladen sind */
export function setAvatarRegistry(profiles) {
  const map = {}
  for (const p of profiles || []) {
    if (p.team_id && p.avatar_url) map[p.team_id] = p.avatar_url
  }
  avatarRegistry = map
}

/** Profilfoto-URL einer Person, sonst null (→ Initialen-Fallback im Avatar) */
export function avatarFor(id) {
  return (id && avatarRegistry[id]) || null
}

/** Alle auswählbaren Personen: Kern-Team + aktive Freelancer */
export function allPeople() {
  return [...TEAM, ...freelancerRegistry.filter(f => f.active !== false)]
}

/** Person per id auflösen (auch inaktive Freelancer, damit Historie lesbar bleibt) */
export function findPerson(id) {
  if (!id) return null
  return TEAM.find(u => u.id === id) || freelancerRegistry.find(f => f.id === id) || null
}

/** ids → Personen-Objekte (unbekannte ids werden übersprungen) */
export function peopleForIds(ids) {
  return (ids || []).map(findPerson).filter(Boolean)
}
