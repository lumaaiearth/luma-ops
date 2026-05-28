import { createContext, useContext, useState, useCallback } from 'react'
import { getJobs, saveJobs, getRecurring, saveRecurring, getSensors, saveSensors, genId, addDays } from '../lib/storage.js'

const OpsContext = createContext(null)

export function OpsProvider({ children }) {
  const [jobs, setJobs] = useState(getJobs)
  const [recurring, setRecurring] = useState(getRecurring)
  const [sensors, setSensors] = useState(getSensors)

  const updateJobs = useCallback(updated => { setJobs(updated); saveJobs(updated) }, [])
  const updateRecurring = useCallback(updated => { setRecurring(updated); saveRecurring(updated) }, [])

  function createJob(data) {
    const job = { ...data, id: genId(), created_at: new Date().toISOString() }
    const updated = [...jobs, job]
    updateJobs(updated)
    return job
  }

  function updateJob(id, changes) {
    const updated = jobs.map(j => j.id === id ? { ...j, ...changes } : j)
    updateJobs(updated)
  }

  function deleteJob(id) {
    updateJobs(jobs.filter(j => j.id !== id))
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

  function updateSensorValue(id, value) {
    const updated = sensors.map(s => {
      if (s.id !== id) return s
      const status = value < s.threshold_low ? (value < s.threshold_low * 0.6 ? 'critical' : 'warning') : 'ok'
      return { ...s, value, status, last_updated: new Date().toISOString() }
    })
    setSensors(updated)
    saveSensors(updated)
  }

  return (
    <OpsContext.Provider value={{ jobs, recurring, sensors, createJob, updateJob, deleteJob, setJobStatus, createRecurring, deleteRecurring, updateSensorValue }}>
      {children}
    </OpsContext.Provider>
  )
}

export const useOps = () => useContext(OpsContext)
