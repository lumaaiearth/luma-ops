import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import * as gcal from '../lib/gcal.js'

const GCalContext = createContext(null)

export function GCalProvider({ children }) {
  const [connected, setConnected] = useState(gcal.isConnected)
  const [ready, setReady] = useState(false)
  const [events, setEvents] = useState([])
  const [calendars, setCalendars] = useState([])
  const [enabledCalendars, setEnabledCalendars] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('luma_gcal_enabled') || '[]')) } catch { return new Set() }
  })
  const [calendarId, setCalendarIdState] = useState(() => gcal.getCalendarId())
  const [syncing, setSyncing] = useState(false)
  const rangeRef = useRef(null)
  const enabledRef = useRef(enabledCalendars)
  const calendarsRef = useRef(calendars)

  useEffect(() => { enabledRef.current = enabledCalendars }, [enabledCalendars])
  useEffect(() => { calendarsRef.current = calendars }, [calendars])

  useEffect(() => {
    const check = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(check)
        gcal.initTokenClient((ok) => {
          setConnected(ok)
          if (ok) loadCalendars()
        })
        setReady(true)
        if (gcal.isConnected()) loadCalendars()
      }
    }, 200)
    return () => clearInterval(check)
  }, [])

  async function loadCalendars() {
    try {
      const list = await gcal.listCalendars()
      const mapped = list.map(c => ({
        id: c.id, name: c.summary, primary: c.primary,
        color: c.backgroundColor || '#4285F4',
      }))
      setCalendars(mapped)
      calendarsRef.current = mapped
      // Enable all by default on first connect
      if (!localStorage.getItem('luma_gcal_enabled') || enabledRef.current.size === 0) {
        const allIds = mapped.map(c => c.id)
        const s = new Set(allIds)
        setEnabledCalendars(s)
        enabledRef.current = s
        localStorage.setItem('luma_gcal_enabled', JSON.stringify(allIds))
      }
    } catch {}
  }

  function toggleCalendar(id) {
    setEnabledCalendars(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      enabledRef.current = next
      localStorage.setItem('luma_gcal_enabled', JSON.stringify([...next]))
      // Refetch if we have a range
      if (rangeRef.current && gcal.isConnected()) {
        _doFetch(rangeRef.current.from, rangeRef.current.to, next)
      }
      return next
    })
  }

  async function _doFetch(from, to, enabled) {
    const calMap = Object.fromEntries(calendarsRef.current.map(c => [c.id, c]))
    const calIds = enabled.size > 0 ? [...enabled] : [gcal.getCalendarId()]
    setSyncing(true)
    try {
      const results = await Promise.all(
        calIds.map(id => gcal.fetchEvents(from, to, id).catch(() => []))
      )
      const merged = results.flatMap((evs, i) =>
        evs.map(ev => ({ ...ev, calendarId: calIds[i], calendarColor: calMap[calIds[i]]?.color || '#4285F4' }))
      )
      setEvents(merged)
    } catch (e) {
      if (e.message === 'token_expired') setConnected(false)
    } finally {
      setSyncing(false)
    }
  }

  const fetchForRange = useCallback(async (from, to) => {
    if (!gcal.isConnected()) return
    rangeRef.current = { from, to }
    await _doFetch(from, to, enabledRef.current)
  }, [])

  function connect() { if (!ready) return; gcal.requestToken() }

  function disconnect() {
    gcal.disconnect()
    setConnected(false)
    setEvents([])
  }

  function setCalendarId(id) {
    localStorage.setItem('luma_gcal_calendar_id', id)
    setCalendarIdState(id)
    if (rangeRef.current) fetchForRange(rangeRef.current.from, rangeRef.current.to)
  }

  return (
    <GCalContext.Provider value={{
      connected, ready, syncing, events, calendars, calendarId,
      enabledCalendars, toggleCalendar,
      connect, disconnect, setCalendarId, fetchForRange, reload: loadCalendars,
    }}>
      {children}
    </GCalContext.Provider>
  )
}

export const useGCal = () => useContext(GCalContext)
