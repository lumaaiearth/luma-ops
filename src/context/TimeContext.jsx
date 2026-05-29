import { createContext, useContext, useState } from 'react'
import { getTimeEntries, saveTimeEntries, getInvoices, saveInvoices, genId } from '../lib/storage.js'

const TimeContext = createContext(null)

export function TimeProvider({ children }) {
  const [entries, setEntries] = useState(getTimeEntries)
  const [invoices, setInvoices] = useState(getInvoices)

  function _saveEntries(updated) { setEntries(updated); saveTimeEntries(updated) }
  function _saveInvoices(updated) { setInvoices(updated); saveInvoices(updated) }

  function logTime(data) {
    const entry = { ...data, id: genId(), created_at: new Date().toISOString(), invoice_id: null }
    _saveEntries([...entries, entry])
    return entry
  }

  function updateEntry(id, changes) {
    _saveEntries(entries.map(e => e.id === id ? { ...e, ...changes } : e))
  }

  function deleteEntry(id) {
    _saveEntries(entries.filter(e => e.id !== id))
  }

  function createInvoice(data) {
    const inv = { ...data, id: genId(), date_paid: null, created_at: new Date().toISOString() }
    _saveInvoices([...invoices, inv])
    // Mark entries as billed
    _saveEntries(entries.map(e => data.entry_ids.includes(e.id) ? { ...e, invoice_id: inv.id } : e))
    return inv
  }

  function markPaid(invoiceId) {
    _saveInvoices(invoices.map(inv =>
      inv.id === invoiceId ? { ...inv, date_paid: new Date().toISOString().slice(0, 10) } : inv
    ))
  }

  function deleteInvoice(invoiceId) {
    // Unlink entries
    _saveEntries(entries.map(e => e.invoice_id === invoiceId ? { ...e, invoice_id: null } : e))
    _saveInvoices(invoices.filter(inv => inv.id !== invoiceId))
  }

  return (
    <TimeContext.Provider value={{ entries, invoices, logTime, updateEntry, deleteEntry, createInvoice, markPaid, deleteInvoice }}>
      {children}
    </TimeContext.Provider>
  )
}

export const useTime = () => useContext(TimeContext)
