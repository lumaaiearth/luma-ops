import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import * as gcal from '../lib/gcal.js'

const GCalContext = createContext(null)

export function GCalProvider({ children }) {
  const [connected, setConnected] = useState(gcal.isConnected)
  const [ready, setReady] = useState(false) // GIS script loaded
  const [events, setEvents] = useState([]) // fetched GCal events for current range
  const [calendars, setCalendars] = useState([])
  const [calendarId, setCalendarIdState] = useState(() => gcal.getCalendarId())
  const [syncing, setSyncing] = useState(false)
  const rangeRef = useRef(null)

  // Wait for Google Identity Services to load
  useEffect(() => {
    const check = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(check)
        gcal.initTokenClient((ok) => {
          setConnected(ok)
          if (ok) loadCalendars()
        })
        setReady(true)
        // If already connected, load calendars
        if (gcal.isConnected()) loadCalendars()
      }
    }, 200)
    return () => clearInterval(check)
  }, [])

  async function loadCalendars() {
    try {
      const list = await gcal.listCalendars()
      setCalendars(list.map(c => ({ id: c.id, name: c.summary, primary: c.primary })))
    } catch {}
  }

  function connect() {
    if (!ready) return
    gcal.requestToken()
  }

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

  const fetchForRange = useCallback(async (from, to) => {
    if (!gcal.isConnected()) return
    rangeRef.current = { from, to }
    setSyncing(true)
    try {
      const items = await gcal.fetchEvents(from, to)
      setEvents(items)
    } catch (e) {
      if (e.message === 'token_expired') setConnected(false)
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <GCalContext.Provider value={{ connected, ready, syncing, events, calendars, calendarId, connect, disconnect, setCalendarId, fetchForRange, reload: loadCalendars }}>
      {children}
    </GCalContext.Provider>
  )
}

export const useGCal = () => useContext(GCalContext)
