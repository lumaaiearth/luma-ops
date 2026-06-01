import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { sb, sbUpsert, sbDelete, sbUpdate, sbInsert } from '../lib/supabase.js'
import { getJobs, saveJobs, getRecurring, saveRecurring, getSensors, saveSensors, getProjects, saveProjects, genId, addDays } from '../lib/storage.js'
import { tgSend, tgGroups, groupsForUsers } from '../lib/telegram.js'
import * as gcal from '../lib/gcal.js'
import { JOB_TYPES, SEED_CLIENTS, VEHICLES as SEED_VEHICLES } from '../data/seed.js'

const DEFAULT_CHIPS = [
  'Wochenpflege', 'Rasenmähen', 'Baumpflege', 'Schröpfschnitt',
  'Mulchen', 'Pflanzung', 'Bewässerung', 'Dokumentation',
  'Beratung/Meeting', 'Aufräumen', 'Unkrautentfernung', 'Schnittarbeiten',
]

const OpsContext = createContext(null)

export function OpsProvider({ children }) {
  const [jobs, setJobsState] = useState([])
  const [recurring, setRecurringState] = useState([])
  const [sensors, setSensorsState] = useState(getSensors)
  const [projects, setProjectsState] = useState([])
  const [clients, setClientsState] = useState([])
  const [vehicles, setVehiclesState] = useState([])
  const [chips, setChipsState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('luma_chips')) || DEFAULT_CHIPS } catch { return DEFAULT_CHIPS }
  })
  const [loading, setLoading] = useState(true)

  // ── Load from Supabase on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [pRows, jRows, rRows, sRows, cRows, vRows, settingsRow] = await Promise.all([
          sb.from('projects').select('*'),
          sb.from('jobs').select('*').order('date'),
          sb.from('recurring_templates').select('*'),
          sb.from('sensors').select('*'),
          sb.from('clients').select('*').order('name'),
          sb.from('vehicles').select('*').order('name'),
          sb.from('app_settings').select('*').eq('key', 'activity_chips').maybeSingle(),
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
        } else if (cRows.data) {
          sbUpsert('clients', SEED_CLIENTS).catch(console.error)
          setClientsState(SEED_CLIENTS)
        }
        if (vRows.data?.length) {
          setVehiclesState(vRows.data)
        } else if (vRows.data) {
          sbUpsert('vehicles', SEED_VEHICLES).catch(console.error)
          setVehiclesState(SEED_VEHICLES)
        } else {
          setVehiclesState(SEED_VEHICLES)
        }
        if (settingsRow.data?.value) {
          setChipsState(settingsRow.data.value)
          localStorage.setItem('luma_chips', JSON.stringify(settingsRow.data.value))
        }
      } catch {
        // Offline fallback
        setProjectsState(getProjects())
        setJobsState(getJobs())
        setRecurringState(getRecurring())
        setSensorsState(getSensors())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
      .subscribe()
    return () => sb.removeChannel(channel)
  }, [])

  // ── Jobs ────────────────────────────────────────────────────────────────────
  function createJob(data) {
    const job = { ...data, id: genId(), created_at: new Date().toISOString() }
    setJobsState(prev => [...prev, job])
    sbUpsert('jobs', [job]).catch(console.error)

    if (gcal.isConnected()) {
      const project = projects.find(p => p.id === data.project_id)
      gcal.createEvent(job, project?.name).then(gcalId => {
        if (gcalId) {
          const updated = { ...job, gcal_event_id: gcalId }
          setJobsState(prev => prev.map(j => j.id === job.id ? updated : j))
          sbUpdate('jobs', job.id, { gcal_event_id: gcalId }).catch(console.error)
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
    const existing = jobs.find(j => j.id === id)
    setJobsState(prev => prev.map(j => j.id === id ? { ...j, ...changes } : j))
    sbUpdate('jobs', id, changes).catch(console.error)

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
    setJobsState(prev => prev.filter(j => j.id !== id))
    sbDelete('jobs', id).catch(console.error)
    if (gcal.isConnected() && job?.gcal_event_id) {
      gcal.deleteEvent(job.gcal_event_id).catch(() => {})
    }
  }

  function setJobStatus(id, status) {
    updateJob(id, { status })
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
        }
        setJobsState(prev => [...prev, nextJob])
        sbUpsert('jobs', [nextJob]).catch(console.error)
        const updatedTmpl = { ...tmpl, last_date: job.date, next_date: nextDate }
        setRecurringState(prev => prev.map(r => r.id === tmpl.id ? updatedTmpl : r))
        sbUpdate('recurring_templates', tmpl.id, { last_date: job.date, next_date: nextDate }).catch(console.error)
      }
    }
  }

  // ── Recurring ───────────────────────────────────────────────────────────────
  function createRecurring(data) {
    const tmpl = { ...data, id: genId() }
    setRecurringState(prev => [...prev, tmpl])
    sbUpsert('recurring_templates', [tmpl]).catch(console.error)
    const job = {
      id: genId(), project_id: tmpl.project_id, title: tmpl.title,
      job_type: tmpl.job_type, date: tmpl.next_date, duration: 'full',
      assigned_users: tmpl.assigned_users, vehicle_id: tmpl.vehicle_id,
      tools: tmpl.tools, notes: tmpl.notes || '', status: 'planned',
      recurring_template_id: tmpl.id, created_at: new Date().toISOString(),
    }
    setJobsState(prev => [...prev, job])
    sbUpsert('jobs', [job]).catch(console.error)
    return tmpl
  }

  function deleteRecurring(id) {
    setRecurringState(prev => prev.filter(r => r.id !== id))
    sbDelete('recurring_templates', id).catch(console.error)
  }

  // ── Sensors ─────────────────────────────────────────────────────────────────
  function updateSensorValue(id, value) {
    const prev = sensors.find(s => s.id === id)
    setSensorsState(current => {
      const updated = current.map(s => {
        if (s.id !== id) return s
        const status = value < s.threshold_low ? (value < s.threshold_low * 0.6 ? 'critical' : 'warning') : 'ok'
        return { ...s, value, status, last_updated: new Date().toISOString() }
      })
      const next = updated.find(s => s.id === id)
      if (next?.status === 'critical' && prev?.status !== 'critical') {
        const project = projects.find(p => p.id === next.project_id)
        tgSend(tgGroups().pm, `🚨 <b>Sensor kritisch</b>\n<b>${next.name}</b>\n${project?.name || ''}\nAktuell: ${value}${next.unit} (Min: ${next.threshold_low}${next.unit})`)
      }
      sbUpdate('sensors', id, { value, status: next?.status, last_updated: new Date().toISOString() }).catch(console.error)
      return updated
    })
  }

  // ── Projects ─────────────────────────────────────────────────────────────────
  function createProject(data) {
    const project = { ...data, id: data.id || genId() }
    setProjectsState(prev => [...prev, project])
    sbUpsert('projects', [project]).catch(console.error)
    return project
  }

  function updateProject(id, changes) {
    setProjectsState(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
    sbUpdate('projects', id, changes).catch(console.error)
  }

  function deleteProject(id) {
    setProjectsState(prev => prev.filter(p => p.id !== id))
    sbDelete('projects', id).catch(console.error)
  }

  // ── Clients ──────────────────────────────────────────────────────────────────
  async function createClient(data) {
    const client = { ...data, id: data.id || genId(), created_at: new Date().toISOString() }
    setClientsState(prev => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)))
    await sbInsert('clients', client).catch(console.error)
    return client
  }

  function updateClient(id, changes) {
    setClientsState(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))
    sbUpdate('clients', id, changes).catch(console.error)
  }

  function deleteClient(id) {
    setClientsState(prev => prev.filter(c => c.id !== id))
    sbDelete('clients', id).catch(console.error)
  }

  // ── Vehicles ─────────────────────────────────────────────────────────────────
  async function createVehicle(data) {
    const vehicle = { ...data, id: data.id || genId(), created_at: new Date().toISOString() }
    setVehiclesState(prev => [...prev, vehicle])
    await sbInsert('vehicles', vehicle).catch(console.error)
    return vehicle
  }

  function updateVehicle(id, changes) {
    setVehiclesState(prev => prev.map(v => v.id === id ? { ...v, ...changes } : v))
    sbUpdate('vehicles', id, changes).catch(console.error)
  }

  function deleteVehicle(id) {
    setVehiclesState(prev => prev.filter(v => v.id !== id))
    sbDelete('vehicles', id).catch(console.error)
  }

  // ── Chips ────────────────────────────────────────────────────────────────────
  function saveChips(newChips) {
    setChipsState(newChips)
    localStorage.setItem('luma_chips', JSON.stringify(newChips))
    sb.from('app_settings').upsert({ key: 'activity_chips', value: newChips, updated_at: new Date().toISOString() }, { onConflict: 'key' }).catch(console.error)
  }

  return (
    <OpsContext.Provider value={{ jobs, recurring, sensors, projects, clients, vehicles, chips, loading, createJob, updateJob, deleteJob, setJobStatus, createRecurring, deleteRecurring, updateSensorValue, createProject, updateProject, deleteProject, createClient, updateClient, deleteClient, createVehicle, updateVehicle, deleteVehicle, saveChips }}>
      {children}
    </OpsContext.Provider>
  )
}

export const useOps = () => useContext(OpsContext)
