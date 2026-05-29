import { createContext, useContext, useState, useCallback } from 'react'
import { getJobs, saveJobs, getRecurring, saveRecurring, getSensors, saveSensors, getProjects, saveProjects, genId, addDays } from '../lib/storage.js'
import { tgSend, tgGroups, groupsForUsers } from '../lib/telegram.js'
import * as gcal from '../lib/gcal.js'
import { JOB_TYPES } from '../data/seed.js'

const OpsContext = createContext(null)

export function OpsProvider({ children }) {
  const [jobs, setJobs] = useState(getJobs)
  const [recurring, setRecurring] = useState(getRecurring)
  const [sensors, setSensors] = useState(getSensors)
  const [projects, setProjects] = useState(getProjects)

  const updateJobs = useCallback(updated => { setJobs(updated); saveJobs(updated) }, [])
  const updateRecurring = useCallback(updated => { setRecurring(updated); saveRecurring(updated) }, [])
  const updateProjects = useCallback(updated => { setProjects(updated); saveProjects(updated) }, [])

  function createJob(data) {
    const job = { ...data, id: genId(), created_at: new Date().toISOString() }
    updateJobs([...jobs, job])
    // Write to Google Calendar
    if (gcal.isConnected()) {
      const project = projects.find(p => p.id === data.project_id)
      gcal.createEvent(job, project?.name).then(gcalId => {
        if (gcalId) updateJobs([...jobs, { ...job, gcal_event_id: gcalId }])
      }).catch(() => {})
    }
    // Notify field team if Jona or Anselm assigned
    if (data.assigned_users?.some(id => ['jona', 'anselm'].includes(id))) {
      const project = projects.find(p => p.id === data.project_id)
      const type = JOB_TYPES.find(t => t.id === data.job_type)
      const dateStr = new Date(data.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })
      const endStr = data.date_end && data.date_end > data.date
        ? ` – ${new Date(data.date_end + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`
        : ''
      tgSend(tgGroups().pflege,
        `🌿 <b>Neuer Einsatz</b>\n<b>${data.title}</b>\n${project?.name || ''} · ${type?.label || ''}\n📅 ${dateStr}${endStr}`)
    }
    // Check vehicle conflict
    if (data.vehicle_id) {
      const conflict = jobs.find(j =>
        j.vehicle_id === data.vehicle_id &&
        j.status !== 'cancelled' &&
        (j.date === data.date || (j.date_end && j.date_end >= data.date && j.date <= (data.date_end || data.date)))
      )
      if (conflict) {
        tgSend(tgGroups().inter,
          `⚠️ <b>Fahrzeugkonflikt</b>\nFahrzeug wird doppelt gebucht am ${data.date}:\n– ${conflict.title}\n– ${data.title}`)
      }
    }
    return job
  }

  function updateJob(id, changes) {
    const existing = jobs.find(j => j.id === id)
    const updated = jobs.map(j => j.id === id ? { ...j, ...changes } : j)
    updateJobs(updated)
    // Write to Google Calendar
    if (gcal.isConnected() && existing?.gcal_event_id) {
      const merged = { ...existing, ...changes }
      const project = projects.find(p => p.id === merged.project_id)
      gcal.updateEvent(existing.gcal_event_id, merged, project?.name).catch(() => {})
    }
    // Notify on cancellation or date change
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
    updateJobs(jobs.filter(j => j.id !== id))
    if (gcal.isConnected() && job?.gcal_event_id) {
      gcal.deleteEvent(job.gcal_event_id).catch(() => {})
    }
  }

  function setJobStatus(id, status) {
    updateJob(id, { status })
    // If this was a recurring job and is now done, generate next occurrence
    const job = jobs.find(j => j.id === id)
    if (status === 'done' && job?.recurring_template_id) {
      const tmpl = recurring.find(r => r.id === job.recurring_template_id)
      if (tmpl) {
        const nextDate = addDays(job.date, tmpl.interval_days)
        const nextJob = {
          id: genId(),
          project_id: tmpl.project_id,
          title: tmpl.title,
          job_type: tmpl.job_type,
          date: nextDate,
          duration: 'full',
          assigned_users: tmpl.assigned_users,
          vehicle_id: tmpl.vehicle_id,
          tools: tmpl.tools,
          notes: tmpl.notes,
          status: 'planned',
          recurring_template_id: tmpl.id,
          created_at: new Date().toISOString(),
        }
        const updatedRecurring = updateRecurring(
          recurring.map(r => r.id === tmpl.id ? { ...r, last_date: job.date, next_date: nextDate } : r)
        )
        updateJobs([...jobs.map(j => j.id === id ? { ...j, status } : j), nextJob])
      }
    }
  }

  function createRecurring(data) {
    const tmpl = { ...data, id: genId() }
    const updated = [...recurring, tmpl]
    updateRecurring(updated)
    // Immediately generate first job
    const job = {
      id: genId(),
      project_id: tmpl.project_id,
      title: tmpl.title,
      job_type: tmpl.job_type,
      date: tmpl.next_date,
      duration: 'full',
      assigned_users: tmpl.assigned_users,
      vehicle_id: tmpl.vehicle_id,
      tools: tmpl.tools,
      notes: tmpl.notes || '',
      status: 'planned',
      recurring_template_id: tmpl.id,
      created_at: new Date().toISOString(),
    }
    updateJobs([...jobs, job])
    return tmpl
  }

  function deleteRecurring(id) {
    updateRecurring(recurring.filter(r => r.id !== id))
  }

  function createProject(data) {
    const project = { ...data, id: data.id || genId() }
    updateProjects([...projects, project])
    return project
  }

  function updateProject(id, changes) {
    updateProjects(projects.map(p => p.id === id ? { ...p, ...changes } : p))
  }

  function deleteProject(id) {
    updateProjects(projects.filter(p => p.id !== id))
  }

  function updateSensorValue(id, value) {
    const prev = sensors.find(s => s.id === id)
    const updated = sensors.map(s => {
      if (s.id !== id) return s
      const status = value < s.threshold_low ? (value < s.threshold_low * 0.6 ? 'critical' : 'warning') : 'ok'
      return { ...s, value, status, last_updated: new Date().toISOString() }
    })
    setSensors(updated)
    saveSensors(updated)
    // Notify PM group when sensor transitions to critical
    const next = updated.find(s => s.id === id)
    if (next?.status === 'critical' && prev?.status !== 'critical') {
      const project = projects.find(p => p.id === next.project_id)
      tgSend(tgGroups().pm,
        `🚨 <b>Sensor kritisch</b>\n<b>${next.name}</b>\n${project?.name || ''}\nAktuell: ${value}${next.unit} (Min: ${next.threshold_low}${next.unit})`)
    }
  }

  return (
    <OpsContext.Provider value={{ jobs, recurring, sensors, projects, createJob, updateJob, deleteJob, setJobStatus, createRecurring, deleteRecurring, updateSensorValue, createProject, updateProject, deleteProject }}>
      {children}
    </OpsContext.Provider>
  )
}

export const useOps = () => useContext(OpsContext)
