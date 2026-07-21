// ────────────────────────────────────────────────────────────────
// MANA™ — KI-Akquise-Agent
// Modul RADAR: von Claude bewertete öffentliche Ausschreibungen
// (Bekanntmachungsservice) sichten, filtern und im Status-Workflow
// bearbeiten. Einstellungen-Tab (Admin) pflegt das Suchprofil, das
// direkt in den Claude-Prompt des täglichen Scans fließt.
// ────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { Radar, ExternalLink, MapPin, Building2, Clock, Search, SlidersHorizontal, Sparkles, CheckSquare, PenLine, Copy, Compass } from 'lucide-react'
import { A, OK, WARN, DANGER, INFO, MUTED, FG, SURFACE, BORDER } from '../lib/theme.js'
import { PageHeader, Card, Badge, Button, EmptyState, Tabs, Chips, SectionLabel, Modal, INPUT_STYLE, LABEL_STYLE, MONO, SANS, isoToGerman } from '../components/ui.jsx'
import { sb, sbUpdate, sbUpsert } from '../lib/supabase.js'
import { askClaude } from '../lib/ai.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useIsMobile } from '../lib/useIsMobile.js'

const STATUS = [
  ['neu',            'Neu',            INFO],
  ['interessant',    'Interessant',    A],
  ['in_bearbeitung', 'In Bearbeitung', WARN],
  ['abgegeben',      'Abgegeben',      INFO],
  ['gewonnen',       'Gewonnen',       OK],
  ['verloren',       'Verloren',       DANGER],
  ['verworfen',      'Verworfen',      MUTED],
]
const STATUS_LABEL = Object.fromEntries(STATUS.map(([id, label]) => [id, label]))
const STATUS_COLOR = Object.fromEntries(STATUS.map(([id, , color]) => [id, color]))

const scoreColor = (s) => (s == null ? MUTED : s >= 80 ? OK : s >= 60 ? A : s >= 40 ? WARN : DANGER)

function fristInfo(iso) {
  if (!iso) return null
  const days = Math.ceil((new Date(iso) - Date.now()) / 86400e3)
  const color = days < 0 ? MUTED : days <= 3 ? DANGER : days <= 7 ? WARN : MUTED
  const label = days < 0 ? 'abgelaufen' : days === 0 ? 'heute!' : `noch ${days} Tag${days === 1 ? '' : 'e'}`
  return { days, color, label }
}

export default function ManaPage() {
  const { isAdmin } = useAuth()
  const isMobile = useIsMobile()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('radar')
  const [statusFilter, setStatusFilter] = useState('offen')
  const [landFilter, setLandFilter] = useState('alle')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let alive = true
    sb.from('mana_ausschreibungen').select('*')
      .order('score', { ascending: false, nullsFirst: false })
      .order('veroeffentlicht_am', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) window.__lumaToast?.(`MANA: ${error.message}`)
        setRows(data || [])
        setLoading(false)
      })
    // Realtime: neue Scan-Treffer erscheinen ohne Reload
    const ch = sb.channel('mana-radar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mana_ausschreibungen' }, payload => {
        setRows(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== payload.old?.id)
          const row = payload.new
          const rest = prev.filter(r => r.id !== row.id)
          return [...rest, row].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
        })
      })
      .subscribe()
    return () => { alive = false; sb.removeChannel(ch) }
  }, [])

  const laender = useMemo(
    () => [...new Set(rows.map(r => r.bundesland).filter(Boolean))].sort(),
    [rows],
  )

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter === 'offen' && ['verworfen', 'verloren', 'gewonnen'].includes(r.status)) return false
    if (statusFilter !== 'alle' && statusFilter !== 'offen' && r.status !== statusFilter) return false
    if (landFilter !== 'alle' && r.bundesland !== landFilter) return false
    if (query) {
      const q = query.toLowerCase()
      const hay = `${r.titel} ${r.auftraggeber} ${r.ort} ${r.zusammenfassung}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [rows, statusFilter, landFilter, query])

  async function patch(id, changes) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...changes } : r)))
    setSelected(prev => (prev?.id === id ? { ...prev, ...changes } : prev))
    try { await sbUpdate('mana_ausschreibungen', id, { ...changes, updated_at: new Date().toISOString() }) }
    catch (e) { window.__lumaToast?.(`Speichern fehlgeschlagen: ${e.message}`) }
  }

  return (
    <div style={{ padding: isMobile ? '16px 14px 90px' : '28px 32px', maxWidth: 1080, margin: '0 auto', fontFamily: SANS }}>
      <PageHeader
        eyebrow="MANA™ · KI-Akquise"
        title="Ausschreibungs-Radar"
        sub={loading ? 'lädt…' : `${filtered.length} von ${rows.length} Ausschreibungen`}
        isMobile={isMobile}
      />

      <Tabs
        isMobile={isMobile}
        active={tab}
        onChange={setTab}
        tabs={[['radar', 'Radar'], ['chancen', 'Chancen'], ...(isAdmin ? [['einstellungen', 'Einstellungen']] : [])]}
      />

      {tab === 'radar' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <Chips
              value={statusFilter}
              onChange={setStatusFilter}
              colors={{ ...STATUS_COLOR, offen: A }}
              options={[['offen', 'Offen'], ['alle', 'Alle'], ...STATUS.map(([id, label]) => [id, label])]}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
                <Search size={14} color={MUTED} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={query} onChange={e => setQuery(e.target.value)} placeholder="Suchen…"
                  style={{ ...INPUT_STYLE, padding: '8px 12px 8px 32px', fontSize: 13 }}
                />
              </div>
              <select value={landFilter} onChange={e => setLandFilter(e.target.value)}
                style={{ ...INPUT_STYLE, width: 'auto', padding: '8px 12px', fontSize: 13 }}>
                <option value="alle">Alle Bundesländer</option>
                {laender.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {loading ? null : filtered.length === 0 ? (
            <EmptyState
              icon={Radar}
              title={rows.length === 0 ? 'Noch keine Scan-Ergebnisse' : 'Keine Treffer für diesen Filter'}
              hint={rows.length === 0 ? 'Der tägliche MANA-Scan füllt diese Liste automatisch, sobald die GitHub-Secrets hinterlegt sind.' : undefined}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(r => {
                const frist = fristInfo(r.frist_angebot)
                return (
                  <Card key={r.id} onClick={() => setSelected(r)} accent={scoreColor(r.score)}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        fontFamily: MONO, fontSize: 18, fontWeight: 700, lineHeight: 1,
                        color: scoreColor(r.score), minWidth: 40, textAlign: 'center', paddingTop: 2,
                      }}>
                        {r.score ?? '–'}
                        <div style={{ fontSize: 8, fontWeight: 400, color: MUTED, marginTop: 3, letterSpacing: '0.08em' }}>SCORE</div>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: FG, lineHeight: 1.3 }}>{r.titel}</span>
                          <Badge color={STATUS_COLOR[r.status] || MUTED}>{STATUS_LABEL[r.status] || r.status}</Badge>
                        </div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: MONO, fontSize: 11, color: MUTED }}>
                          {r.auftraggeber && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={11} />{r.auftraggeber.length > 48 ? r.auftraggeber.slice(0, 48) + '…' : r.auftraggeber}</span>}
                          {(r.ort || r.bundesland) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{[r.ort, r.bundesland].filter(Boolean).join(', ')}</span>}
                          {frist && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: frist.color }}><Clock size={11} />{isoToGerman(r.frist_angebot?.slice(0, 10))} · {frist.label}</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'chancen' && <ChancenTab />}

      {tab === 'einstellungen' && isAdmin && <ProfilTab />}

      {selected && (
        <DetailModal
          row={selected}
          onClose={() => setSelected(null)}
          onPatch={patch}
        />
      )}
    </div>
  )
}

function DetailModal({ row, onClose, onPatch }) {
  const [notizen, setNotizen] = useState(row.notizen || '')
  const [draft, setDraft] = useState('')
  const [drafting, setDrafting] = useState(false)
  const eck = row.eckdaten || {}
  const frist = fristInfo(row.frist_angebot)

  // PROMOTE: Claude entwirft ein Interessens-/Begleitschreiben (Versand bleibt beim Menschen)
  async function makeDraft() {
    setDrafting(true)
    try {
      const { data: prof } = await sb.from('mana_profil').select('firmenprofil').eq('id', 1).single()
      const text = await askClaude({
        system: `Du bist MANA, der Akquise-Assistent von LUMA.\n\nFIRMENPROFIL:\n${prof?.firmenprofil || ''}`,
        prompt: 'Entwirf ein professionelles, prägnantes Interessens-/Begleitschreiben für diese Ausschreibung '
          + '(deutsch, förmlich aber modern, max. 250 Wörter, mit Betreffzeile). Beziehe passende LUMA-Stärken ein, '
          + 'erfinde keine Referenzen, Zahlen oder Ansprechpartner.\n\n'
          + JSON.stringify({
              titel: row.titel, auftraggeber: row.auftraggeber,
              ort: [row.ort, row.bundesland].filter(Boolean).join(', '),
              zusammenfassung: row.zusammenfassung, leistungen: eck.leistungen,
            }),
        maxTokens: 1500,
      })
      setDraft(text)
    } catch (e) { window.__lumaToast?.(`Entwurf: ${e.message}`) }
    setDrafting(false)
  }

  return (
    <Modal eyebrow={`MANA · Score ${row.score ?? '–'}`} eyebrowColor={scoreColor(row.score)} title={row.titel} onClose={onClose} maxWidth={640}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, fontFamily: SANS }}>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS.map(([id, label, color]) => (
            <button key={id} onClick={() => onPatch(row.id, { status: id })} className="lu-chip"
              style={{
                padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontFamily: SANS,
                border: `1px solid ${row.status === id ? color : BORDER}`,
                background: row.status === id ? `color-mix(in srgb, ${color} 14%, transparent)` : 'transparent',
                color: row.status === id ? color : MUTED,
              }}>
              {label}
            </button>
          ))}
        </div>

        {row.zusammenfassung && (
          <div>
            <SectionLabel style={{ marginBottom: 6 }}>Zusammenfassung</SectionLabel>
            <div style={{ fontSize: 13.5, color: FG, lineHeight: 1.55 }}>{row.zusammenfassung}</div>
          </div>
        )}

        {row.score_begruendung && (
          <div>
            <SectionLabel style={{ marginBottom: 6 }}>Claude-Einschätzung</SectionLabel>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, borderLeft: `2px solid ${scoreColor(row.score)}`, paddingLeft: 10, display: 'flex', gap: 8 }}>
              <Sparkles size={13} color={scoreColor(row.score)} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{row.score_begruendung}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <MetaField label="Auftraggeber" value={row.auftraggeber} />
          <MetaField label="Ort" value={[row.ort, row.bundesland].filter(Boolean).join(', ')} />
          <MetaField label="Frist" value={row.frist_angebot ? `${isoToGerman(row.frist_angebot.slice(0, 10))}${frist ? ` (${frist.label})` : ''}` : null} color={frist?.color} />
          <MetaField label="Volumen (geschätzt)" value={eck.volumen_geschaetzt} />
          <MetaField label="Verfahren" value={row.verfahren_art} />
          <MetaField label="CPV" value={(row.cpv_codes || []).join(', ')} />
        </div>

        {Array.isArray(eck.leistungen) && eck.leistungen.length > 0 && (
          <div>
            <SectionLabel style={{ marginBottom: 6 }}>Leistungen</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {eck.leistungen.map((l, i) => <Badge key={i} color={A} style={{ fontSize: 10 }}>{l}</Badge>)}
            </div>
          </div>
        )}

        {Array.isArray(eck.eignungsnachweise) && eck.eignungsnachweise.length > 0 && (
          <div>
            <SectionLabel style={{ marginBottom: 6 }}>Geforderte Nachweise</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {eck.eignungsnachweise.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 13, color: FG }}>
                  <CheckSquare size={13} color={MUTED} style={{ flexShrink: 0, marginTop: 2 }} />{n}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionLabel style={{ marginBottom: 6 }}>Notizen</SectionLabel>
          <textarea
            value={notizen} onChange={e => setNotizen(e.target.value)}
            onBlur={() => { if (notizen !== (row.notizen || '')) onPatch(row.id, { notizen }) }}
            rows={3} placeholder="Interne Notizen…"
            style={{ ...INPUT_STYLE, resize: 'vertical', fontSize: 13 }}
          />
        </div>

        {draft && (
          <div>
            <SectionLabel
              style={{ marginBottom: 6 }}
              action={
                <button
                  onClick={() => { navigator.clipboard?.writeText(draft); window.__lumaToast?.('Entwurf kopiert.') }}
                  className="lu-chip"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 14, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 11, fontFamily: SANS }}>
                  <Copy size={11} /> Kopieren
                </button>
              }>
              Anschreiben-Entwurf (Claude) — prüfen, anpassen, dann selbst versenden
            </SectionLabel>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={10}
              style={{ ...INPUT_STYLE, resize: 'vertical', fontSize: 13, lineHeight: 1.5 }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" icon={drafting ? Sparkles : PenLine} onClick={makeDraft} disabled={drafting}>
            {drafting ? 'Claude schreibt…' : draft ? 'Neu entwerfen' : 'Anschreiben entwerfen'}
          </Button>
          {row.url && (
            <Button icon={ExternalLink} onClick={() => window.open(row.url, '_blank', 'noopener')}>
              Zur Bekanntmachung
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function MetaField({ label, value, color }) {
  if (!value) return null
  return (
    <div>
      <div style={LABEL_STYLE}>{label}</div>
      <div style={{ fontSize: 13, color: color || FG, lineHeight: 1.4 }}>{value}</div>
    </div>
  )
}

// ── Chancen: Leads aus dem wöchentlichen Recherche-Agenten ────────────────────
const LEAD_TYP = {
  foerderung: ['Förderung', OK],
  vorhaben:   ['Vorhaben', INFO],
  privat:     ['Privat', WARN],
  sonstiges:  ['Sonstiges', MUTED],
}

function ChancenTab() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('offen')

  useEffect(() => {
    let alive = true
    sb.from('mana_leads').select('*')
      .order('score', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) window.__lumaToast?.(`Chancen: ${error.message}`)
        setLeads(data || [])
        setLoading(false)
      })
    const ch = sb.channel('mana-chancen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mana_leads' }, payload => {
        setLeads(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(l => l.id !== payload.old?.id)
          const row = payload.new
          return [...prev.filter(l => l.id !== row.id), row].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
        })
      })
      .subscribe()
    return () => { alive = false; sb.removeChannel(ch) }
  }, [])

  const shown = leads.filter(l => (filter === 'offen' ? l.status !== 'verworfen' : filter === 'alle' ? true : l.status === filter))

  async function setStatus(id, status) {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, status } : l)))
    try { await sbUpdate('mana_leads', id, { status, updated_at: new Date().toISOString() }) }
    catch (e) { window.__lumaToast?.(`Speichern fehlgeschlagen: ${e.message}`) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Chips
        value={filter} onChange={setFilter}
        colors={{ offen: A, interessant: A, verworfen: MUTED }}
        options={[['offen', 'Offen'], ['alle', 'Alle'], ['interessant', 'Interessant'], ['verworfen', 'Verworfen']]}
      />
      {loading ? null : shown.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={leads.length === 0 ? 'Noch keine recherchierten Chancen' : 'Keine Treffer für diesen Filter'}
          hint={leads.length === 0 ? 'Der wöchentliche MANA-Recherche-Agent (Claude + Web-Suche) füllt diese Liste, sobald die GitHub-Secrets hinterlegt sind.' : undefined}
        />
      ) : shown.map(l => {
        const [typLabel, typColor] = LEAD_TYP[l.typ] || LEAD_TYP.sonstiges
        return (
          <Card key={l.id} accent={scoreColor(l.score)}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, lineHeight: 1, color: scoreColor(l.score), minWidth: 40, textAlign: 'center', paddingTop: 2 }}>
                {l.score ?? '–'}
                <div style={{ fontSize: 8, fontWeight: 400, color: MUTED, marginTop: 3, letterSpacing: '0.08em' }}>SCORE</div>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: FG, lineHeight: 1.3 }}>{l.titel}</span>
                  <Badge color={typColor}>{typLabel}</Badge>
                  {l.status === 'interessant' && <Badge color={A}>Interessant</Badge>}
                </div>
                {l.region && <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 5 }}>{l.region}</div>}
                {l.zusammenfassung && <div style={{ fontSize: 13, color: FG, lineHeight: 1.5, opacity: 0.92 }}>{l.zusammenfassung}</div>}
                {l.begruendung && (
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 5, display: 'flex', gap: 6 }}>
                    <Sparkles size={12} color={scoreColor(l.score)} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{l.begruendung}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {l.url && (
                    <Button variant="ghost" icon={ExternalLink} style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => window.open(l.url, '_blank', 'noopener')}>Quelle</Button>
                  )}
                  {l.status !== 'interessant' && (
                    <Button variant="ghost" style={{ padding: '5px 12px', fontSize: 12, color: A, borderColor: A }}
                      onClick={() => setStatus(l.id, 'interessant')}>Interessant</Button>
                  )}
                  {l.status !== 'verworfen' && (
                    <Button variant="ghost" style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => setStatus(l.id, 'verworfen')}>Verwerfen</Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Einstellungen: Suchprofil (fließt in den Claude-Prompt des Scans) ─────────
function ProfilTab() {
  const [profil, setProfil] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sb.from('mana_profil').select('*').eq('id', 1).single().then(({ data, error }) => {
      if (error) { window.__lumaToast?.(`Profil: ${error.message}`); return }
      setProfil(data)
    })
  }, [])

  if (!profil) return null
  const set = (k, v) => setProfil(p => ({ ...p, [k]: v }))
  const csv = (arr) => (arr || []).join(', ')
  const parseCsv = (s) => s.split(',').map(x => x.trim()).filter(Boolean)

  async function save() {
    setSaving(true)
    try {
      await sbUpsert('mana_profil', [{ ...profil, updated_at: new Date().toISOString() }])
      window.__lumaToast?.('Suchprofil gespeichert — wirkt ab dem nächsten Scan.')
    } catch (e) { window.__lumaToast?.(`Speichern fehlgeschlagen: ${e.message}`) }
    setSaving(false)
  }

  return (
    <Card padding="20px 22px" style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: SANS }}>
        <SectionLabel><SlidersHorizontal size={11} style={{ verticalAlign: '-1px', marginRight: 5 }} />Suchprofil — steuert Vorfilter & Claude-Bewertung</SectionLabel>

        <div>
          <label style={LABEL_STYLE}>Firmenprofil (geht wörtlich in den Claude-Prompt)</label>
          <textarea value={profil.firmenprofil || ''} onChange={e => set('firmenprofil', e.target.value)}
            rows={7} style={{ ...INPUT_STYLE, resize: 'vertical', fontSize: 13, lineHeight: 1.5 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label style={LABEL_STYLE}>CPV-Präfixe (Komma-getrennt)</label>
            <input value={csv(profil.cpv_prefixes)} onChange={e => set('cpv_prefixes', parseCsv(e.target.value))}
              placeholder="773, 4511" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Regionen (NUTS-Präfixe, leer = bundesweit)</label>
            <input value={csv(profil.regionen)} onChange={e => set('regionen', parseCsv(e.target.value))}
              placeholder="z.B. DE9, DE6, DEF" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Telegram ab Score</label>
            <input type="number" min={0} max={100} value={profil.min_score ?? 60}
              onChange={e => set('min_score', Number(e.target.value))} style={INPUT_STYLE} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: FG, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!profil.aktiv} onChange={e => set('aktiv', e.target.checked)} />
          Täglicher Scan aktiv
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={save} disabled={saving}>{saving ? 'Speichert…' : 'Speichern'}</Button>
        </div>
      </div>
    </Card>
  )
}
