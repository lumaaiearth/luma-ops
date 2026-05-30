import { createContext, useContext, useState, useEffect } from 'react'
import { sb, sbUpsert, sbDelete, sbUpdate } from '../lib/supabase.js'
import { getTimeEntries, getInvoices, genId } from '../lib/storage.js'

const TimeContext = createContext(null)

export function TimeProvider({ children }) {
  const [entries, setEntries] = useState([])
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [eRows, iRows] = await Promise.all([
          sb.from('time_entries').select('*').order('date', { ascending: false }),
          sb.from('invoices').select('*').order('date_issued', { ascending: false }),
        ])
        setEntries(eRows.data?.length ? eRows.data : getTimeEntries())
        setInvoices(iRows.data?.length ? iRows.data : getInvoices())
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
    sbUpsert('time_entries', [entry]).catch(console.error)
    return entry
  }

  function updateEntry(id, changes) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e))
    sbUpdate('time_entries', id, changes).catch(console.error)
  }

  function deleteEntry(id) {
    setEntries(prev => prev.filter(e => e.id !== id))
    sbDelete('time_entries', id).catch(console.error)
  }

  function createInvoice(data) {
    const inv = { ...data, id: genId(), date_paid: null, created_at: new Date().toISOString() }
    setInvoices(prev => [inv, ...prev])
    sbUpsert('invoices', [inv]).catch(console.error)
    setEntries(prev => prev.map(e => data.entry_ids.includes(e.id) ? { ...e, invoice_id: inv.id } : e))
    data.entry_ids.forEach(eid => sbUpdate('time_entries', eid, { invoice_id: inv.id }).catch(console.error))
    return inv
  }

  function markPaid(invoiceId) {
    const date_paid = new Date().toISOString().slice(0, 10)
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, date_paid } : inv))
    sbUpdate('invoices', invoiceId, { date_paid }).catch(console.error)
  }

  function deleteInvoice(invoiceId) {
    setEntries(prev => prev.map(e => e.invoice_id === invoiceId ? { ...e, invoice_id: null } : e))
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
    sbDelete('invoices', invoiceId).catch(console.error)
    entries.filter(e => e.invoice_id === invoiceId).forEach(e =>
      sbUpdate('time_entries', e.id, { invoice_id: null }).catch(console.error)
    )
  }

  return (
    <TimeContext.Provider value={{ entries, invoices, logTime, updateEntry, deleteEntry, createInvoice, markPaid, deleteInvoice }}>
      {children}
    </TimeContext.Provider>
  )
}

export const useTime = () => useContext(TimeContext)
