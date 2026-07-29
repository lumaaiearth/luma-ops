// ────────────────────────────────────────────────────────────────
// Admin-Nutzerverwaltung (Einstellungen → Nutzer & Zugriff).
// Listet alle Konten, erlaubt Rolle setzen, Konto einer Organisation
// zuweisen (= freischalten) bzw. Zugang entziehen, und neue Kunden-
// Organisationen anlegen. Alle Schreibvorgänge laufen über die
// SECURITY-DEFINER-RPCs admin_* (serverseitig per is_admin() abgesichert).
// ────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Check, Plus, Building2, Briefcase } from 'lucide-react'
import { sb } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER } from '../lib/theme.js'
import { Avatar } from './ui.jsx'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

const ROLES = [
  ['admin', 'Admin'],
  ['mitarbeiter', 'Mitarbeiter'],
  ['kunde_viewer', 'Kunde'],
  ['gast', 'Gast'],
]
const ROLE_COLORS = { admin: '#F59E0B', mitarbeiter: A, kunde_viewer: '#3B82F6', gast: MUTED }

const SEL = {
  background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6,
  padding: '6px 8px', color: FG, fontFamily: SANS, fontSize: 12, outline: 'none', cursor: 'pointer',
}

export default function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [newOrg, setNewOrg] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [clientOrgs, setClientOrgs] = useState(null)   // null = RPC nicht verfügbar
  const [busyClient, setBusyClient] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const [u, o, c] = await Promise.all([
      sb.rpc('admin_list_users'),
      sb.rpc('admin_list_orgs'),
      sb.rpc('admin_list_client_orgs'),
    ])
    if (u.error) setError(u.error.message)
    else setUsers(u.data || [])
    if (!o.error) setOrgs(o.data || [])
    // Fehlt die RPC noch (Migration nicht angewendet), blenden wir den
    // Abschnitt „Kundenzugänge“ einfach aus, statt einen Fehler zu zeigen.
    setClientOrgs(c.error ? null : (c.data || []))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function apply(id, params, label) {
    setBusyId(id); setMsg(null)
    const { error: err } = await sb.rpc('admin_set_profile', { p_id: id, ...params })
    if (err) setMsg({ ok: false, text: err.message })
    else { setMsg({ ok: true, text: label || 'Gespeichert' }); await load() }
    setBusyId(null)
  }

  async function createOrg(e) {
    e.preventDefault()
    const name = newOrg.trim()
    if (!name) return
    setCreatingOrg(true); setMsg(null)
    const { error: err } = await sb.rpc('admin_create_org', { p_name: name, p_typ: 'kunde' })
    if (err) setMsg({ ok: false, text: err.message })
    else { setNewOrg(''); setMsg({ ok: true, text: `Organisation „${name}" angelegt` }); await load() }
    setCreatingOrg(false)
  }

  // Auftraggeber ↔ Organisation verknüpfen. Erst diese Zuordnung entscheidet,
  // welche Flächen, Einsätze und Leistungen ein Kundenkonto im Portal sieht.
  async function setClientOrg(clientId, orgId) {
    setBusyClient(clientId); setMsg(null)
    const { error: err } = await sb.from('clients')
      .update({ org_id: orgId || null }).eq('id', clientId)
    if (err) setMsg({ ok: false, text: err.message })
    else { setMsg({ ok: true, text: orgId ? 'Auftraggeber verknüpft' : 'Verknüpfung entfernt' }); await load() }
    setBusyClient(null)
  }

  return (
    <div>
      {/* Kopf: Erklärung + Neu laden */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, maxWidth: 560 }}>
          Rolle festlegen und Konten einer Organisation zuweisen. Kunden sehen im Portal die
          Inhalte ihrer Organisation — „kein Zugang" setzt das Konto zurück in den
          Freischaltungs-Status. Neue Kund:innen registrieren sich selbst (E-Mail/Google) und
          erscheinen hier, sobald sie sich einmal angemeldet haben.
        </div>
        <button onClick={load} disabled={loading} title="Neu laden" className="lu-btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: SANS, flexShrink: 0 }}>
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} /> Aktualisieren
        </button>
      </div>

      {msg && (
        <div className="lu-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: msg.ok ? OK : DANGER, marginBottom: 10 }}>
          {msg.ok && <Check size={13} />}{msg.text}
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: DANGER, marginBottom: 10 }}>Konnte Nutzer nicht laden: {error}</div>}

      {/* Nutzerliste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && users.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, padding: '12px 4px' }}>lädt…</div>
        )}
        {users.map(u => {
          const isSelf = u.id === user?.id
          const initials = (u.name || u.email || '?').slice(0, 2).toUpperCase()
          const pending = !u.org_id && u.rolle !== 'gast'
          return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, opacity: busyId === u.id ? 0.55 : 1, transition: 'opacity 0.15s' }}>
              <Avatar initials={initials} size={34} src={u.avatar_url || null} color={ROLE_COLORS[u.rolle] || A} title={u.name || u.email} />
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: FG }}>
                  {u.name || '—'}
                  {isSelf && <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, fontWeight: 400 }}> · du</span>}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{u.email || '—'}</div>
              </div>

              {pending && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: WARN, background: `color-mix(in srgb, ${WARN} 14%, transparent)`, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>wartet</span>
              )}

              <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rolle</span>
                <select style={SEL} value={u.rolle} disabled={busyId === u.id || isSelf}
                  title={isSelf ? 'Die eigene Rolle kann hier nicht geändert werden' : undefined}
                  onChange={e => apply(u.id, { p_rolle: e.target.value }, 'Rolle geändert')}>
                  {ROLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Organisation</span>
                <select style={SEL} value={u.org_id || ''} disabled={busyId === u.id}
                  onChange={e => {
                    const v = e.target.value
                    if (!v) apply(u.id, { p_clear_org: true }, 'Zugang entzogen')
                    else apply(u.id, { p_org_id: v }, 'Organisation zugewiesen')
                  }}>
                  <option value="">— kein Zugang —</option>
                  {orgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name}{o.typ === 'kunde' ? ' (Kunde)' : o.typ === 'intern' ? ' (intern)' : o.typ === 'partner' ? ' (Partner)' : ''}</option>
                  ))}
                </select>
              </label>
            </div>
          )
        })}
      </div>

      {/* Neue Kunden-Organisation */}
      <form onSubmit={createOrg} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <Building2 size={15} color={MUTED} style={{ flexShrink: 0 }} />
        <input value={newOrg} onChange={e => setNewOrg(e.target.value)} placeholder="Neue Kunden-Organisation, z. B. Riccio"
          style={{ flex: 1, minWidth: 200, maxWidth: 320, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 11px', color: FG, fontFamily: SANS, fontSize: 13, outline: 'none' }} />
        <button type="submit" disabled={creatingOrg || !newOrg.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: newOrg.trim() ? 'pointer' : 'default', opacity: newOrg.trim() ? 1 : 0.5, fontSize: 12, fontWeight: 500, fontFamily: SANS, whiteSpace: 'nowrap' }}>
          <Plus size={13} /> {creatingOrg ? 'Legt an…' : 'Organisation anlegen'}
        </button>
      </form>
      <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 6, opacity: 0.8 }}>
        Danach oben in der Zeile der Kund:in als Organisation auswählen, um sie freizuschalten.
      </div>

      {/* Kundenzugänge: Auftraggeber ↔ Organisation */}
      {clientOrgs && (
        <div style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <Briefcase size={14} color={MUTED} />
            <span style={{ fontSize: 13, fontWeight: 600, color: FG }}>Kundenzugänge</span>
          </div>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, maxWidth: 620, marginBottom: 12 }}>
            Legt fest, welche Organisation welchen Auftraggeber im Portal sieht. Erst mit dieser
            Verknüpfung erscheinen die betreuten Flächen, Einsätze und der Leistungsnachweis für
            das Kundenkonto. Ohne Zuordnung sieht das Konto nichts.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clientOrgs.map(c => (
              <div key={c.client_id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '9px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, opacity: busyClient === c.client_id ? 0.55 : 1, transition: 'opacity 0.15s' }}>
                <div style={{ flex: 1, minWidth: 140, fontSize: 13, color: FG }}>{c.client_name}</div>
                {c.org_id && (
                  <span style={{ fontFamily: MONO, fontSize: 9, color: OK, background: `color-mix(in srgb, ${OK} 14%, transparent)`, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                    Portal aktiv
                  </span>
                )}
                <select style={SEL} value={c.org_id || ''} disabled={busyClient === c.client_id}
                  onChange={e => setClientOrg(c.client_id, e.target.value)}>
                  <option value="">— keine Verknüpfung —</option>
                  {orgs.filter(o => o.typ !== 'intern').map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
