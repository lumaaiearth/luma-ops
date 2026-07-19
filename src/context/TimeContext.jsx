import { createContext, useContext, useState, useEffect } from 'react'
import { sb, sbUpsert, sbDelete, sbUpdate } from '../lib/supabase.js'
import { getTimeEntries, getInvoices, genId } from '../lib/storage.js'

function dbErr(table, op) {
  return (err) => {
    console.error(`[DB] ${op} on ${table} failed:`, err?.message || err)
    if (window.__lumaToast) window.__lumaToast(`⚠️ Speicherfehler (${table}): ${err?.message || 'unbekannter Fehler'}`)
  }
}

const TimeContext = createContext(null)

export function TimeProvider({ children }) {
  const [entries, setEntries] = useState([])
  const [invoices, setInvoices] = useState([])
  // hour_rules aus Supabase ({team_id: row}); Fallback auf seed.js siehe hourAccounts.js
  const [hourRules, setHourRules] = useState({})
  // Nur für Admins gefüllt — RLS liefert anderen Rollen schlicht 0 Zeilen.
  const [costs, setCosts] = useState([])
  const [rates, setRates] = useState({})

  useEffect(() => {
    async function load() {
      try {
        const [eRows, iRows, rRows, cRows, brRows] = await Promise.all([
          sb.from('time_entries').select('*').order('date', { ascending: false }),
          sb.from('invoices').select('*').order('date_issued', { ascending: false }),
          sb.from('hour_rules').select('*'),
          sb.from('project_costs').select('*').order('date', { ascending: false }),
          sb.from('billing_rates').select('*'),
        ])
        setEntries(eRows.data?.length ? eRows.data : getTimeEntries())
        setInvoices(iRows.data?.length ? iRows.data : getInvoices())
        setHourRules(Object.fromEntries((rRows.data || []).map(r => [r.team_id, r])))
        setCosts(cRows.data || [])
        setRates(Object.fromEntries((brRows.data || []).map(r => [r.client_id, Number(r.hourly_rate)])))
      } catch {
        setEntries(getTimeEntries())
        setInvoices(getInvoices())
      }
    }
    load()
  }, [])

  // Realtime
  useEffect(() => {
    const channel = sb.channel('time-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, payload => {
        setEntries(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(e => e.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [payload.new, ...prev.filter(e => e.id !== payload.new.id)]
          return prev.map(e => e.id === payload.new.id ? payload.new : e)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, payload => {
        setInvoices(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(i => i.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [payload.new, ...prev.filter(i => i.id !== payload.new.id)]
          return prev.map(i => i.id === payload.new.id ? payload.new : i)
        })
      })
      .subscribe()
    return () => sb.removeChannel(channel)
  }, [])

  function logTime(data) {
    const entry = { ...data, id: genId(), created_at: new Date().toISOString(), invoice_id: null }
    setEntries(prev => [entry, ...prev])
    sbUpsert('time_entries', [entry]).catch(dbErr('time','write'))
    return entry
  }

  function updateEntry(id, changes) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e))
    sbUpdate('time_entries', id, changes).catch(dbErr('time','write'))
  }

  function deleteEntry(id) {
    setEntries(prev => prev.filter(e => e.id !== id))
    sbDelete('time_entries', id).catch(dbErr('time','write'))
  }

  function createInvoice(data) {
    const inv = { ...data, id: genId(), date_paid: null, created_at: new Date().toISOString() }
    setInvoices(prev => [inv, ...prev])
    sbUpsert('invoices', [inv]).catch(dbErr('time','write'))
    setEntries(prev => prev.map(e => data.entry_ids.includes(e.id) ? { ...e, invoice_id: inv.id } : e))
    data.entry_ids.forEach(eid => sbUpdate('time_entries', eid, { invoice_id: inv.id }).catch(dbErr('time','write')))
    return inv
  }

  function markPaid(invoiceId) {
    const date_paid = new Date().toISOString().slice(0, 10)
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, date_paid } : inv))
    sbUpdate('invoices', invoiceId, { date_paid }).catch(dbErr('time','write'))
  }

  function deleteInvoice(invoiceId) {
    setEntries(prev => prev.map(e => e.invoice_id === invoiceId ? { ...e, invoice_id: null } : e))
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
    sbDelete('invoices', invoiceId).catch(dbErr('time','write'))
    entries.filter(e => e.invoice_id === invoiceId).forEach(e =>
      sbUpdate('time_entries', e.id, { invoice_id: null }).catch(dbErr('time','write'))
    )
    setCosts(prev => prev.map(c => c.invoice_id === invoiceId ? { ...c, invoice_id: null } : c))
    costs.filter(c => c.invoice_id === invoiceId).forEach(c =>
      sbUpdate('project_costs', c.id, { invoice_id: null }).catch(dbErr('time','write'))
    )
  }

  // ── Materialkosten (admin-only, RLS) ──
  function addCost(data) {
    const cost = { markup: 1.5, billable: true, ...data, id: genId(), invoice_id: null, created_at: new Date().toISOString() }
    setCosts(prev => [cost, ...prev])
    sbUpsert('project_costs', [cost]).catch(dbErr('time','write'))
    return cost
  }

  function deleteCost(id) {
    setCosts(prev => prev.filter(c => c.id !== id))
    sbDelete('project_costs', id).catch(dbErr('time','write'))
  }

  function markCostsBilled(costIds, invoiceId) {
    setCosts(prev => prev.map(c => costIds.includes(c.id) ? { ...c, invoice_id: invoiceId } : c))
    costIds.forEach(cid => sbUpdate('project_costs', cid, { invoice_id: invoiceId }).catch(dbErr('time','write')))
  }

  // ── Stundensatz je Kunde (admin-only, RLS) ──
  function setRate(clientId, hourlyRate) {
    setRates(prev => ({ ...prev, [clientId]: hourlyRate }))
    sb.from('billing_rates')
      .upsert({ client_id: clientId, hourly_rate: hourlyRate, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
      .then(({ error }) => { if (error) dbErr('billing_rates','write')(error) })
  }

  // ── SOLL-Stunden-Regel je Person aktualisieren (intern) ──
  function saveHourRule(teamId, changes) {
    setHourRules(prev => ({ ...prev, [teamId]: { ...(prev[teamId] || { team_id: teamId }), ...changes } }))
    sb.from('hour_rules')
      .upsert({ team_id: teamId, ...changes, updated_at: new Date().toISOString() }, { onConflict: 'team_id' })
      .then(({ error }) => { if (error) dbErr('hour_rules','write')(error) })
  }

  return (
    <TimeContext.Provider value={{ entries, invoices, hourRules, costs, rates, logTime, updateEntry, deleteEntry, createInvoice, markPaid, deleteInvoice, addCost, deleteCost, markCostsBilled, setRate, saveHourRule }}>
      {children}
    </TimeContext.Provider>
  )
}

export const useTime = () => useContext(TimeContext)
