// Einsatz abschließen: Stunden je Person auf den Einsatz buchen und ihn als
// erledigt markieren — in einem Schritt. Vorher schaltete der Knopf in der
// Einsatzliste nur den Status um; Zeit wurde getrennt (oder gar nicht) und
// ohne Bezug zum Einsatz erfasst. Stand 10/2026: 0 von 64 Zeiteinträgen mit
// Einsatz-Bezug.
import { useMemo, useState } from 'react'
import { useOps } from '../context/OpsContext.jsx'
import { useTime } from '../context/TimeContext.jsx'
import { findPerson } from '../lib/people.js'
import { vorschlagStunden } from '../lib/einsatzAbschluss.js'
import { FG, MUTED, BORDER } from '../lib/theme.js'
import { Modal, Button, INPUT_STYLE, LABEL_STYLE } from './ui.jsx'

export default function EinsatzAbschliessen({ job, onClose }) {
  const { projects, setJobStatus } = useOps()
  const { entries, logTime } = useTime()

  const gebucht = useMemo(() => (entries || []).filter((e) => e.job_id === job.id), [entries, job.id])
  const summeGebucht = gebucht.reduce((s, e) => s + Number(e.hours || 0), 0)

  const [datum, setDatum] = useState(job.date)
  const [stunden, setStunden] = useState(() => vorschlagStunden(job, gebucht))
  const [taetigkeit, setTaetigkeit] = useState(job.title || '')

  const projekt = projects.find((p) => p.id === job.project_id)
  const personen = job.assigned_users || []
  const zuBuchen = Object.entries(stunden).filter(([, h]) => Number(h) > 0)

  function abschliessen(e) {
    e.preventDefault()
    for (const [uid, h] of zuBuchen) {
      logTime({
        user_id: uid, project_id: job.project_id || null, job_id: job.id,
        date: datum, hours: Number(h), description: taetigkeit.trim() || job.title || 'Einsatz',
        start_time: job.start_time || null, end_time: job.end_time || null,
      })
    }
    setJobStatus(job.id, 'done')
    onClose()
  }

  function nurErledigt() {
    setJobStatus(job.id, 'done')
    onClose()
  }

  return (
    <Modal eyebrow="Einsatz abschließen" title={job.title || 'Einsatz'} onClose={onClose} maxWidth={480}>
      <form onSubmit={abschliessen} style={{ padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {projekt && <div style={{ fontSize: 13, color: MUTED }}>{projekt.name}</div>}

        <div>
          <label htmlFor="abschluss-datum" style={LABEL_STYLE}>Datum</label>
          <input id="abschluss-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={INPUT_STYLE} required />
        </div>

        <div>
          <span style={LABEL_STYLE}>Stunden je Person (inkl. An- und Abfahrt)</span>
          {personen.length === 0 && (
            <div style={{ fontSize: 13, color: MUTED }}>Niemand ist eingeteilt. Personen im Einsatz eintragen oder die Zeit unter „Zeiten“ erfassen.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {personen.map((uid) => (
              <div key={uid} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10, alignItems: 'center' }}>
                <label htmlFor={`abschluss-h-${uid}`} style={{ fontSize: 14, color: FG }}>{findPerson(uid)?.name || uid}</label>
                <input id={`abschluss-h-${uid}`} type="number" inputMode="decimal" step="0.25" min="0" max="24"
                  value={stunden[uid] ?? ''} onChange={(e) => setStunden((s) => ({ ...s, [uid]: e.target.value }))}
                  style={{ ...INPUT_STYLE, textAlign: 'right' }} placeholder="h" />
              </div>
            ))}
          </div>
          {summeGebucht > 0 && (
            <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
              Auf diesen Einsatz sind schon {summeGebucht.toLocaleString('de-DE')} h gebucht; der Vorschlag zieht sie ab.
            </div>
          )}
        </div>

        <div>
          <label htmlFor="abschluss-taetigkeit" style={LABEL_STYLE}>Ausgeführte Arbeiten</label>
          <textarea id="abschluss-taetigkeit" rows={2} value={taetigkeit} onChange={(e) => setTaetigkeit(e.target.value)}
            style={{ ...INPUT_STYLE, resize: 'vertical' }}
            placeholder="z. B. Beikrautentfernung, Rasenmahd, Bewässerung" />
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>Kann im Kundenportal erscheinen — bitte nur die Arbeit beschreiben, keine internen Notizen.</div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
          <Button type="button" variant="ghost" onClick={nurErledigt}>Nur als erledigt markieren</Button>
          <Button type="submit" disabled={!zuBuchen.length}>
            {zuBuchen.length ? `Abschließen und ${zuBuchen.reduce((s, [, h]) => s + Number(h), 0).toLocaleString('de-DE')} h buchen` : 'Stunden eintragen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
