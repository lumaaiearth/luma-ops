import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { sb, sbUpsert, sbDelete, sbUpdate, sbInsert } from '../lib/supabase.js'
import { getJobs, saveJobs, getRecurring, saveRecurring, getSensors, saveSensors, getProjects, saveProjects, genId, addDays } from '../lib/storage.js'
import { tgSend, tgGroups, groupsForUsers } from '../lib/telegram.js'
import { maybeSendWeeklySummary } from '../lib/weeklySummary.js'
import { maybeSendTaskReminders } from '../lib/taskReminders.js'
import { scheduleJobRemindersDebounced, setReminderOverride, clearReminderOverride } from '../lib/notifications.js'
import { useAuth } from './AuthContext.jsx'
import * as gcal from '../lib/gcal.js'
import { JOB_TYPES, SEED_CLIENTS, VEHICLES as SEED_VEHICLES, SEED_BOARDS } from '../data/seed.js'

// Messwert-Historie: max. ein Reading pro Sensor pro 5 Minuten aufzeichnen,
// damit die Simulation die Tabelle nicht flutet. Fehler still schlucken
// (History ist ein Nebenprodukt, kein kritischer Schreibpfad).
const lastReadingAt = {}
function recordSensorReading(sensorId, value) {
  const now = Date.now()
  if (lastReadingAt[sensorId] && now - lastReadingAt[sensorId] < 5 * 60_000) return
  lastReadingAt[sensorId] = now
  sbInsert('sensor_readings', { sensor_id: sensorId, value }).catch(() => {})
}

// Surface DB errors visibly so data loss is never silent
function dbErr(table, op) {
  return (err) => {
    console.error(`[DB] ${op} on ${table} failed:`, err?.message || err)
    const msg = `⚠️ Speicherfehler (${table}): ${err?.message || 'unbekannter Fehler'}`
    if (window.__lumaToast) window.__lumaToast(msg)
  }
}

const DEFAULT_CHIPS = [
  'Wochenpflege', 'Rasenmähen', 'Baumpflege', 'Schröpfschnitt',
  'Mulchen', 'Pflanzung', 'Bewässerung', 'Dokumentation',
  'Beratung/Meeting', 'Aufräumen', 'Unkrautentfernung', 'Schnittarbeiten',
]

const OpsContext = createContext(null)

export function OpsProvider({ children }) {
  // Nur interne Nutzer (admin/mitarbeiter) dürfen Ops-Daten schreiben/seeden.
  // Für Gäste, Kunden und noch nicht freigeschaltete Konten würde ein Seed-
  // Upsert sonst an der RLS scheitern („new row violates row-level security…").
  const { isMitarbeiter, user } = useAuth()
  const [jobs, setJobsState] = useState([])
  const [recurring, setRecurringState] = useState([])
  const [sensors, setSensorsState] = useState(getSensors)
  const [projects, setProjectsState] = useState([])
  const [clients, setClientsState] = useState([])
  const [vehicles, setVehiclesState] = useState([])
  const [chips, setChipsState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('luma_chips')) || DEFAULT_CHIPS } catch { return DEFAULT_CHIPS }
  })
  const [mapFeatures, setMapFeaturesState] = useState([])
  const [pflanzplaene, setPflanzplaeneState] = useState([])
  const [tasks, setTasksState] = useState([])
  const [boards, setBoardsState] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Load from Supabase on mount ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      // Ohne aktive Session (z. B. auf der Login-Seite) gar nicht laden/seeden:
      // Reads kämen leer zurück und jeder Seed-Upsert würde an der RLS scheitern
      // („new row violates row-level security policy"). Sobald sich jemand
      // anmeldet, ändert sich `user?.id` und der Effekt läuft erneut.
      const { data: { session } } = await sb.auth.getSession()
      if (!session) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const [pRows, jRows, rRows, sRows, cRows, vRows, settingsRow, mfRows, ppRows, tRows, bRows] = await Promise.all([
          sb.from('projects').select('*'),
          sb.from('jobs').select('*').order('date'),
          sb.from('recurring_templates').select('*'),
          sb.from('sensors').select('*'),
          sb.from('clients').select('*').order('name'),
          sb.from('vehicles').select('*').order('name'),
          sb.from('app_settings').select('*').eq('key', 'activity_chips').maybeSingle(),
          sb.from('map_features').select('*').order('created_at'),
          sb.from('pflanzplaene').select('*').order('created_at', { ascending: false }),
          sb.from('tasks').select('*').order('sort_order').order('created_at', { ascending: false }),
          sb.from('boards').select('*').order('sort_order'),
        ])
        if (pRows.data?.length) setProjectsState(pRows.data)
        else setProjectsState(getProjects()) // fallback to localStorage seed
        if (jRows.data) setJobsState(jRows.data)
        else setJobsState(getJobs())
        if (rRows.data) setRecurringState(rRows.data)
        else setRecurringState(getRecurring())
        if (sRows.data?.length) setSensorsState(sRows.data)
        else setSensorsState(getSensors())
        if (cRows.data?.length) {
          setClientsState(cRows.data)
        } else if (cRows.data && isMitarbeiter) {
          sbUpsert('clients', SEED_CLIENTS).catch(dbErr('ops','write'))
          setClientsState(SEED_CLIENTS)
        }
        if (vRows.data?.length) {
          setVehiclesState(vRows.data)
        } else if (vRows.data && isMitarbeiter) {
          sbUpsert('vehicles', SEED_VEHICLES).catch(dbErr('ops','write'))
          setVehiclesState(SEED_VEHICLES)
        } else if (!vRows.data) {
          setVehiclesState(SEED_VEHICLES) // Offline-Fallback (Query fehlgeschlagen)
        }
        if (settingsRow.data?.value) {
          setChipsState(settingsRow.data.value)
          localStorage.setItem('luma_chips', JSON.stringify(settingsRow.data.value))
        }
        if (mfRows.data) setMapFeaturesState(mfRows.data)
        if (ppRows.data) setPflanzplaeneState(ppRows.data)
        if (tRows.data) setTasksState(tRows.data)
        if (bRows.data?.length) {
          setBoardsState(bRows.data)
        } else if (bRows.data && isMitarbeiter) {
          // Erstbefüllung: Standard-Bereiche anlegen
          sbUpsert('boards', SEED_BOARDS).catch(dbErr('boards', 'write'))
          setBoardsState(SEED_BOARDS)
        }
      } catch (e) {
        console.error('[OpsContext] load failed:', e)
        // Offline fallback
        setProjectsState(getProjects())
        setJobsState(getJobs())
        setRecurringState(getRecurring())
        setSensorsState(getSensors())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // Neu laden, sobald sich der Login-Status (user?.id) ändert oder die Rolle
    // feststeht (interne Nutzer dürfen dann seeden).
  }, [isMitarbeiter, user?.id])

  // ── Weekly summary: fires Monday 08:00–09:59 on app load ────────────────────
  useEffect(() => {
    if (!loading) {
      maybeSendWeeklySummary(jobs, projects)
      maybeSendTaskReminders(tasks.filter(t => !t.deleted_at), projects)
    }
  }, [loading])

  // ── Termin-Erinnerungen (Push): nach Laden und bei jeder Job-Änderung neu planen ─
  useEffect(() => {
    if (!loading) scheduleJobRemindersDebounced(jobs)
  }, [loading, jobs])

  // ── Realtime subscriptions ───────────────────────────────────────────────────
  useEffect(() => {
    const channel = sb.channel('ops-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
        setJobsState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(j => j.id !== payload.old.id)
          if (payload.eventType === 'INSERT') {
            const existing = prev.find(j => j.id === payload.new.id)
            // Merge: keep local non-null values for fields that Supabase may return null
            // (can happen briefly after schema migration or if Realtime lags behind upsert)
            const merged = existing ? {
              ...payload.new,
              start_time:  payload.new.start_time  ?? existing.start_time  ?? null,
              end_time:    payload.new.end_time    ?? existing.end_time    ?? null,
              vehicle_ids: payload.new.vehicle_ids ?? existing.vehicle_ids ?? [],
              location:    payload.new.location    ?? existing.location    ?? null,
            } : payload.new
            return [...prev.filter(j => j.id !== merged.id), merged]
          }
          return prev.map(j => j.id === payload.new.id ? payload.new : j)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, payload => {
        setProjectsState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(p => p.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [...prev.filter(p => p.id !== payload.new.id), payload.new]
          return prev.map(p => p.id === payload.new.id ? payload.new : p)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_templates' }, payload => {
        setRecurringState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [...prev.filter(r => r.id !== payload.new.id), payload.new]
          return prev.map(r => r.id === payload.new.id ? payload.new : r)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, payload => {
        setClientsState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(c => c.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [...prev.filter(c => c.id !== payload.new.id), payload.new].sort((a, b) => a.name.localeCompare(b.name))
          return prev.map(c => c.id === payload.new.id ? payload.new : c)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, payload => {
        setVehiclesState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(v => v.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [...prev.filter(v => v.id !== payload.new.id), payload.new]
          return prev.map(v => v.id === payload.new.id ? payload.new : v)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_features' }, payload => {
        setMapFeaturesState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(f => f.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [...prev.filter(f => f.id !== payload.new.id), payload.new]
          return prev.map(f => f.id === payload.new.id ? payload.new : f)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
        setTasksState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(t => t.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [...prev.filter(t => t.id !== payload.new.id), payload.new]
          return prev.map(t => t.id === payload.new.id ? payload.new : t)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, payload => {
        setBoardsState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(b => b.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [...prev.filter(b => b.id !== payload.new.id), payload.new].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          return prev.map(b => b.id === payload.new.id ? payload.new : b)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pflanzplaene' }, payload => {
        setPflanzplaeneState(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(p => p.id !== payload.old.id)
          if (payload.eventType === 'INSERT') return [payload.new, ...prev.filter(p => p.id !== payload.new.id)]
          return prev.map(p => p.id === payload.new.id ? payload.new : p)
        })
      })
      .subscribe()
    return () => sb.removeChannel(channel)
  }, [])

  // ── Jobs ────────────────────────────────────────────────────────────────────
  function createJob(data) {
    // reminder_min ist keine DB-Spalte, sondern eine geräte-lokale Erinnerungs-
    // Einstellung → vor dem Upsert heraustrennen und separat ablegen.
    const { reminder_min, ...jobData } = data
    const job = { ...jobData, id: genId(), created_at: new Date().toISOString() }
    if (reminder_min !== undefined) setReminderOverride(job.id, reminder_min)
    setJobsState(prev => [...prev, job])
    sbUpsert('jobs', [job]).catch(dbErr('ops','write'))

    if (gcal.isConnected()) {
      const project = projects.find(p => p.id === data.project_id)
      gcal.createEvent(job, project?.name).then(gcalId => {
        if (gcalId) {
          const updated = { ...job, gcal_event_id: gcalId }
          setJobsState(prev => prev.map(j => j.id === job.id ? updated : j))
          sbUpdate('jobs', job.id, { gcal_event_id: gcalId }).catch(dbErr('ops','write'))
        }
      }).catch(() => {})
    }
    if (data.assigned_users?.some(id => ['jona', 'anselm'].includes(id))) {
      const project = projects.find(p => p.id === data.project_id)
      const type = JOB_TYPES.find(t => t.id === data.job_type)
      const dateStr = new Date(data.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })
      const endStr = data.date_end && data.date_end > data.date
        ? ` – ${new Date(data.date_end + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`
        : ''
      tgSend(tgGroups().pflege, `🌿 <b>Neuer Einsatz</b>\n<b>${data.title}</b>\n${project?.name || ''} · ${type?.label || ''}\n📅 ${dateStr}${endStr}`)
    }
    if (data.vehicle_id) {
      const conflict = jobs.find(j =>
        j.vehicle_id === data.vehicle_id && j.status !== 'cancelled' &&
        (j.date === data.date || (j.date_end && j.date_end >= data.date && j.date <= (data.date_end || data.date)))
      )
      if (conflict) {
        tgSend(tgGroups().inter, `⚠️ <b>Fahrzeugkonflikt</b>\nFahrzeug wird doppelt gebucht am ${data.date}:\n– ${conflict.title}\n– ${data.title}`)
      }
    }
    return job
  }

  function updateJob(id, changes) {
    // Erinnerungs-Einstellung (geräte-lokal) getrennt behandeln, nicht in die DB schreiben.
    const { reminder_min, ...rest } = changes
    if (reminder_min !== undefined) setReminderOverride(id, reminder_min)
    const existing = jobs.find(j => j.id === id)
    if (Object.keys(rest).length === 0) return
    setJobsState(prev => prev.map(j => j.id === id ? { ...j, ...rest } : j))
    sbUpdate('jobs', id, rest).catch(dbErr('ops','write'))

    if (gcal.isConnected() && existing?.gcal_event_id) {
      const merged = { ...existing, ...changes }
      const project = projects.find(p => p.id === merged.project_id)
      gcal.updateEvent(existing.gcal_event_id, merged, project?.name).catch(() => {})
    }
    if (existing && changes.status === 'cancelled' && existing.status !== 'cancelled') {
      const groups = groupsForUsers(existing.assigned_users || [])
      const project = projects.find(p => p.id === existing.project_id)
      const msg = `❌ <b>Einsatz abgesagt</b>\n<b>${existing.title}</b>\n${project?.name || ''} · ${existing.date}`
      groups.forEach(g => tgSend(tgGroups()[g], msg))
    } else if (existing && changes.date && changes.date !== existing.date) {
      const groups = groupsForUsers(existing.assigned_users || [])
      const project = projects.find(p => p.id === existing.project_id)
      const msg = `📅 <b>Einsatz verschoben</b>\n<b>${existing.title}</b>\n${project?.name || ''}\n${existing.date} → ${changes.date}`
      groups.forEach(g => tgSend(tgGroups()[g], msg))
    }
  }

  function deleteJob(id) {
    const job = jobs.find(j => j.id === id)
    clearReminderOverride(id)
    setJobsState(prev => prev.filter(j => j.id !== id))
    sbDelete('jobs', id).catch(dbErr('ops','write'))
    if (gcal.isConnected() && job?.gcal_event_id) {
      gcal.deleteEvent(job.gcal_event_id).catch(() => {})
    }
  }

  function setJobStatus(id, status) {
    updateJob(id, { status })
    // Einsatz erledigt → verknüpfte Aufgaben mit erledigen
    if (status === 'done') {
      tasks.filter(t => t.job_id === id && t.status !== 'done' && t.status !== 'archive' && !t.deleted_at)
        .forEach(t => updateTask(t.id, { status: 'done' }))
    }
    const job = jobs.find(j => j.id === id)
    if (status === 'done' && job?.recurring_template_id) {
      const tmpl = recurring.find(r => r.id === job.recurring_template_id)
      if (tmpl) {
        const nextDate = addDays(job.date, tmpl.interval_days)
        const nextJob = {
          id: genId(), project_id: tmpl.project_id, title: tmpl.title,
          job_type: tmpl.job_type, date: nextDate, duration: 'full',
          assigned_users: tmpl.assigned_users, vehicle_id: tmpl.vehicle_id,
          tools: tmpl.tools, notes: tmpl.notes, status: 'planned',
          recurring_template_id: tmpl.id, created_at: new Date().toISOString(),
          date_end: null, start_time: null, end_time: null, location: null, color: null, vehicle_ids: [],
        }
        setJobsState(prev => [...prev, nextJob])
        sbUpsert('jobs', [nextJob]).catch(dbErr('ops','write'))
        const updatedTmpl = { ...tmpl, last_date: job.date, next_date: nextDate }
        setRecurringState(prev => prev.map(r => r.id === tmpl.id ? updatedTmpl : r))
        sbUpdate('recurring_templates', tmpl.id, { last_date: job.date, next_date: nextDate }).catch(dbErr('ops','write'))
      }
    }
  }

  // ── Recurring ───────────────────────────────────────────────────────────────
  function createRecurring(data) {
    // Strip job-only fields that don't exist as columns in recurring_templates
    // eslint-disable-next-line no-unused-vars
    const { color, date_end, start_time, end_time, location, vehicle_ids, make_recurring, reminder_min, ...templateFields } = data
    const tmpl = { ...templateFields, id: genId(), last_date: null }
    setRecurringState(prev => [...prev, tmpl])
    sbUpsert('recurring_templates', [tmpl]).catch(dbErr('ops','write'))
    const job = {
      id: genId(), project_id: tmpl.project_id, title: tmpl.title,
      job_type: tmpl.job_type, date: tmpl.next_date, duration: 'full',
      assigned_users: tmpl.assigned_users, vehicle_id: tmpl.vehicle_id,
      tools: tmpl.tools, notes: tmpl.notes || '', status: 'planned',
      recurring_template_id: tmpl.id, created_at: new Date().toISOString(),
      date_end: null, start_time: null, end_time: null, location: null, color: null, vehicle_ids: [],
    }
    setJobsState(prev => [...prev, job])
    sbUpsert('jobs', [job]).catch(dbErr('ops','write'))
    return tmpl
  }

  function deleteRecurring(id) {
    setRecurringState(prev => prev.filter(r => r.id !== id))
    sbDelete('recurring_templates', id).catch(dbErr('ops','write'))
  }

  // ── Sensors ─────────────────────────────────────────────────────────────────
  function updateSensorValue(id, value) {
    const prev = sensors.find(s => s.id === id)
    const status = prev
      ? (value < prev.threshold_low ? (value < prev.threshold_low * 0.6 ? 'critical' : 'warning') : 'ok')
      : 'ok'
    const now = new Date().toISOString()
    setSensorsState(current => current.map(s => s.id === id ? { ...s, value, status, last_updated: now } : s))
    sbUpdate('sensors', id, { value, status, last_updated: now }).catch(dbErr('ops', 'write'))
    recordSensorReading(id, value)

    // Übergang auf "kritisch": Alarm + automatische Gieß-Aufgabe (je Sensor dedupliziert)
    if (status === 'critical' && prev?.status !== 'critical') {
      const project = projects.find(p => p.id === prev?.project_id)
      const u = prev?.unit || ''
      tgSend(tgGroups().pm, `🚨 <b>Sensor kritisch</b>\n<b>${prev?.name}</b>\n${project?.name || ''}\nAktuell: ${value}${u} (Min: ${prev?.threshold_low}${u})`)

      const ref = `sensor:${id}`
      const openExists = tasks.some(t => t.source_ref === ref && t.status !== 'done' && t.status !== 'archive')
      if (!openExists) {
        const clientId = project?.client_id || clients.find(c => c.name === project?.client)?.id || null
        createTask({
          title: `Gießen nötig: ${prev?.name}`,
          description: `Sensor „${prev?.name}" ist kritisch (${value}${u}, Schwellwert ${prev?.threshold_low}${u}). Bewässerung prüfen.`,
          board_id: 'b_pflege',
          status: 'not_started',
          priority: 'high',
          task_type: 'giessen',
          project_id: prev?.project_id || null,
          client_id: clientId,
          source_ref: ref,
        })
      }
    }
  }

  // ── Projects ─────────────────────────────────────────────────────────────────
  function createProject(data) {
    const project = { ...data, id: data.id || genId() }
    setProjectsState(prev => [...prev, project])
    sbUpsert('projects', [project]).catch(dbErr('ops','write'))
    return project
  }

  function updateProject(id, changes) {
    setProjectsState(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
    sbUpdate('projects', id, changes).catch(dbErr('ops','write'))
  }

  function deleteProject(id) {
    setProjectsState(prev => prev.filter(p => p.id !== id))
    sbDelete('projects', id).catch(dbErr('ops','write'))
  }

  // ── Map Features ─────────────────────────────────────────────────────────────
  function createMapFeature(data) {
    const feature = { ...data, id: data.id || genId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    setMapFeaturesState(prev => [...prev, feature])
    sbInsert('map_features', feature).catch(dbErr('map_features', 'write'))
    return feature
  }

  function updateMapFeature(id, changes) {
    const upd = { ...changes, updated_at: new Date().toISOString() }
    setMapFeaturesState(prev => prev.map(f => f.id === id ? { ...f, ...upd } : f))
    sbUpdate('map_features', id, upd).catch(dbErr('map_features', 'write'))
  }

  function deleteMapFeature(id) {
    setMapFeaturesState(prev => prev.filter(f => f.id !== id))
    sbDelete('map_features', id).catch(dbErr('map_features', 'write'))
  }

  // ── Clients ──────────────────────────────────────────────────────────────────
  async function createClient(data) {
    const client = { ...data, id: data.id || genId(), created_at: new Date().toISOString() }
    setClientsState(prev => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)))
    await sbInsert('clients', client).catch(dbErr('ops','write'))
    return client
  }

  function updateClient(id, changes) {
    setClientsState(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))
    sbUpdate('clients', id, changes).catch(dbErr('ops','write'))
  }

  function deleteClient(id) {
    setClientsState(prev => prev.filter(c => c.id !== id))
    sbDelete('clients', id).catch(dbErr('ops','write'))
  }

  // ── Vehicles ─────────────────────────────────────────────────────────────────
  async function createVehicle(data) {
    const vehicle = { ...data, id: data.id || genId(), created_at: new Date().toISOString() }
    setVehiclesState(prev => [...prev, vehicle])
    await sbInsert('vehicles', vehicle).catch(dbErr('ops','write'))
    return vehicle
  }

  function updateVehicle(id, changes) {
    setVehiclesState(prev => prev.map(v => v.id === id ? { ...v, ...changes } : v))
    sbUpdate('vehicles', id, changes).catch(dbErr('ops','write'))
  }

  function deleteVehicle(id) {
    setVehiclesState(prev => prev.filter(v => v.id !== id))
    sbDelete('vehicles', id).catch(dbErr('ops','write'))
  }

  // ── Pflanzplaene ─────────────────────────────────────────────────────────────
  async function createPflanzplan(data) {
    const now = new Date().toISOString()
    const plan = {
      titel: 'Unbenannter Plan',
      status: 'planung',
      positionen: [],
      habitate: [],
      ...data,
      id: data.id || crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    setPflanzplaeneState(prev => [plan, ...prev])
    // Über die Outbox: puffert bei Offline/Netzwerkfehler und sendet bei Reconnect
    await sbUpsert('pflanzplaene', [plan]).catch(dbErr('pflanzplaene', 'write'))
    return plan
  }

  function updatePflanzplan(id, changes) {
    const updated = { ...changes, updated_at: new Date().toISOString() }
    setPflanzplaeneState(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    sbUpdate('pflanzplaene', id, updated).catch(dbErr('pflanzplaene', 'write'))
  }

  function deletePflanzplan(id) {
    setPflanzplaeneState(prev => prev.filter(p => p.id !== id))
    sbDelete('pflanzplaene', id).catch(dbErr('pflanzplaene', 'write'))
  }

  // ── Tasks / Aufgaben ─────────────────────────────────────────────────────────
  function createTask(data) {
    const now = new Date().toISOString()
    const task = {
      title: 'Neue Aufgabe',
      description: '',
      status: 'not_started',
      priority: 'medium',
      assigned_users: [],
      material: [],
      tools: [],
      checklist: [],
      summary: '',
      sort_order: 0,
      ...data,
      id: data.id || genId(),
      created_at: now,
      updated_at: now,
    }
    setTasksState(prev => [task, ...prev])
    sbUpsert('tasks', [task]).catch(dbErr('tasks', 'write'))

    // Benachrichtige zugewiesene Feldkräfte über Telegram (wie bei Einsätzen)
    if (task.assigned_users?.some(id => ['jona', 'anselm'].includes(id))) {
      const project = projects.find(p => p.id === task.project_id)
      const due = task.due_date ? `\n📅 fällig ${new Date(task.due_date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}` : ''
      tgSend(tgGroups().pflege, `✅ <b>Neue Aufgabe</b>\n<b>${task.title}</b>${project ? `\n${project.name}` : ''}${due}`)
    }
    return task
  }

  function updateTask(id, changes) {
    const upd = { ...changes, updated_at: new Date().toISOString() }
    setTasksState(prev => prev.map(t => t.id === id ? { ...t, ...upd } : t))
    sbUpdate('tasks', id, upd).catch(dbErr('tasks', 'write'))
  }

  function deleteTask(id) {
    // Soft-Delete → landet im Papierkorb, wird nicht sofort gelöscht
    updateTask(id, { deleted_at: new Date().toISOString() })
  }

  function restoreTask(id) {
    updateTask(id, { deleted_at: null })
  }

  function purgeTask(id) {
    setTasksState(prev => prev.filter(t => t.id !== id))
    sbDelete('tasks', id).catch(dbErr('tasks', 'write'))
  }

  function setTaskStatus(id, status) {
    updateTask(id, { status })
  }

  // ── Boards / Bereiche ────────────────────────────────────────────────────────
  function createBoard(data) {
    const board = {
      name: 'Neuer Bereich', emoji: '📋', color: '#08AA56', members: [], client_id: null,
      sort_order: boards.length,
      ...data,
      id: data.id || genId(),
      created_at: new Date().toISOString(),
    }
    setBoardsState(prev => [...prev, board])
    sbUpsert('boards', [board]).catch(dbErr('boards', 'write'))
    return board
  }

  function updateBoard(id, changes) {
    setBoardsState(prev => prev.map(b => b.id === id ? { ...b, ...changes } : b))
    sbUpdate('boards', id, changes).catch(dbErr('boards', 'write'))
  }

  function deleteBoard(id) {
    // Aufgaben bleiben erhalten (board_id wird per FK auf NULL gesetzt)
    setBoardsState(prev => prev.filter(b => b.id !== id))
    setTasksState(prev => prev.map(t => t.board_id === id ? { ...t, board_id: null } : t))
    sbDelete('boards', id).catch(dbErr('boards', 'write'))
  }

  // ── Chips ────────────────────────────────────────────────────────────────────
  function saveChips(newChips) {
    setChipsState(newChips)
    localStorage.setItem('luma_chips', JSON.stringify(newChips))
    sb.from('app_settings').upsert({ key: 'activity_chips', value: newChips, updated_at: new Date().toISOString() }, { onConflict: 'key' }).catch(dbErr('ops','write'))
  }

  const activeTasks = tasks.filter(t => !t.deleted_at)
  const deletedTasks = tasks.filter(t => t.deleted_at)

  return (
    <OpsContext.Provider value={{ jobs, recurring, sensors, projects, clients, vehicles, chips, mapFeatures, pflanzplaene, tasks: activeTasks, deletedTasks, boards, loading, createJob, updateJob, deleteJob, setJobStatus, createRecurring, deleteRecurring, updateSensorValue, createProject, updateProject, deleteProject, createClient, updateClient, deleteClient, createVehicle, updateVehicle, deleteVehicle, saveChips, createMapFeature, updateMapFeature, deleteMapFeature, createPflanzplan, updatePflanzplan, deletePflanzplan, createTask, updateTask, deleteTask, restoreTask, purgeTask, setTaskStatus, createBoard, updateBoard, deleteBoard }}>
      {children}
    </OpsContext.Provider>
  )
}

export const useOps = () => useContext(OpsContext)
