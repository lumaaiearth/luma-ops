// ────────────────────────────────────────────────────────────────
// Personen-Auswahl für Einsätze & Aufgaben.
// Kern-Team als Pills (schneller Ein-Klick-Zugriff), zusätzliche Personen
// (Selbstständige/Freelancer, bis zu ~20) über ein Auswahlmenü. Ausgewählte
// Freelancer erscheinen als entfernbare Pills neben dem Team.
// multi=true → Mehrfachauswahl (value: Array von ids)
// multi=false → Einzelauswahl, z.B. Verantwortliche:r (value: id | null)
// ────────────────────────────────────────────────────────────────
import { X, UserPlus } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { SURFACE, BORDER, FG, MUTED } from '../lib/theme.js'
import { MONO, SANS } from './ui.jsx'

function PersonPill({ person, active, onClick, removable }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: active ? `${person.color}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? person.color + '80' : BORDER}`, cursor: 'pointer', transition: 'all 0.15s' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: person.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 7, color: '#001219', fontWeight: 700 }}>{person.initials}</span>
      </div>
      <span style={{ fontSize: 13, color: active ? person.color : MUTED }}>{person.name}</span>
      {removable && <X size={11} color={MUTED} />}
    </button>
  )
}

export default function PeoplePicker({ value, onChange, multi = false, exclude = [] }) {
  const { people } = useOps()
  const coreTeam = people.filter(p => !p.freelancer && !exclude.includes(p.id))
  const freelancers = people.filter(p => p.freelancer && !exclude.includes(p.id))

  const selectedIds = multi ? (value || []) : (value ? [value] : [])
  const isActive = id => selectedIds.includes(id)

  function toggle(id) {
    if (multi) onChange(isActive(id) ? value.filter(v => v !== id) : [...(value || []), id])
    else onChange(value === id ? null : id)
  }

  // Freelancer: ausgewählte als Pills, restliche im Auswahlmenü
  const selectedFreelancers = freelancers.filter(f => isActive(f.id))
  const availableFreelancers = freelancers.filter(f => !isActive(f.id))

  function addFromSelect(e) {
    const id = e.target.value
    if (!id) return
    if (multi) onChange([...(value || []), id])
    else onChange(id)
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {coreTeam.map(u => (
          <PersonPill key={u.id} person={u} active={isActive(u.id)} onClick={() => toggle(u.id)} />
        ))}
        {selectedFreelancers.map(f => (
          <PersonPill key={f.id} person={f} active removable onClick={() => toggle(f.id)} />
        ))}
      </div>
      {availableFreelancers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={14} color={MUTED} style={{ flexShrink: 0 }} />
          <select defaultValue="" onChange={addFromSelect}
            style={{ flex: 1, maxWidth: 280, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 10px', color: MUTED, fontFamily: SANS, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="">{multi ? 'Freelancer hinzufügen…' : 'Freelancer wählen…'}</option>
            {availableFreelancers.map(f => (
              <option key={f.id} value={f.id} style={{ color: FG }}>
                {f.name}{f.firma ? ` — ${f.firma}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      {freelancers.length === 0 && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, opacity: 0.7 }}>
          Freelancer verwaltest du unter Stammdaten → Personen.
        </div>
      )}
    </div>
  )
}
