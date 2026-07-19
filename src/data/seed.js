export const TEAM = [
  { id: 'malte',  name: 'Malte',  role: 'admin',   color: '#08AA56', initials: 'ML' },
  { id: 'lukas',  name: 'Lukas',  role: 'admin',   color: '#22EAA7', initials: 'LK' },
  { id: 'robert', name: 'Robert', role: 'manager', color: '#F3E0A8', initials: 'RB' },
  { id: 'jona',   name: 'Jona',   role: 'field',   color: '#6EA8C0', initials: 'JN' },
  { id: 'anselm', name: 'Anselm', role: 'field',   color: '#C0966E', initials: 'AS' },
  { id: 'felix',  name: 'Felix',  role: 'field',   color: '#9B8CE8', initials: 'FX' },
]

// Fallback für SOLL-Stunden-Regeln — die führende Quelle ist die Tabelle
// hour_rules in Supabase (siehe Migration 20260718_stundenkonto_kosten).
// monthly = X h je bezahltem Monat (paid_months), + carryover aus dem Vorjahr.
export const HOUR_TARGETS = {
  malte:  { type: 'balance' },   // track balance with lukas
  lukas:  { type: 'balance' },   // track balance with malte
  jona:   { type: 'monthly', monthly: 30.88, paid_months: ['2026-01', '2026-02'], carryover: 13.26 },
  felix:  { type: 'monthly', monthly: 30.88, paid_months: ['2026-01', '2026-02'], carryover: 42.5 },
  anselm: { type: 'weekly', weekly: 10 },
  robert: { type: 'project' },   // project-based, no fixed target
}

export const VEHICLES = [
  { id: 'lumi',       name: 'LUMi',              model: 'Renault Kangoo Maxi', ownership: 'owned',  type: 'van',     color: '#08AA56' },
  { id: 'lumo',       name: 'LUMo',              model: 'Mercedes Vito',       ownership: 'owned',  type: 'van',     color: '#22EAA7' },
  { id: 'hebebuehne', name: 'Hebebühne',         model: 'Leihe',               ownership: 'rental', type: 'lift',    color: '#F59E0B' },
  { id: 'haecksler',  name: 'Häcksler-Anhänger', model: 'Leihe',               ownership: 'rental', type: 'trailer', color: '#F97316' },
  { id: 'pritsche',   name: 'Pritsche',          model: 'Leihe',               ownership: 'rental', type: 'truck',   color: '#8B5CF6' },
]

// ── Aufgaben / Task Management ────────────────────────────────────────────────
// Notion-artiges Taskboard, vernetzt mit Kunde/Projekt/Team/Einsatz.

// Status-Spalten (Reihenfolge = Board-Reihenfolge). "archive" wird im Board
// standardmäßig ausgeblendet, ist aber über den Filter erreichbar.
export const TASK_STATUSES = [
  { id: 'not_started', label: 'Nicht begonnen', short: 'Offen',    color: '#6B7280' },
  { id: 'in_progress', label: 'In Arbeit',      short: 'Läuft',    color: '#6EA8C0' },
  { id: 'waiting',     label: 'Wartet auf …',   short: 'Wartet',   color: '#F59E0B' },
  { id: 'decision',    label: 'Entscheidung',   short: 'Entsch.',  color: '#A78BFA' },
  { id: 'done',        label: 'Erledigt',       short: 'Fertig',   color: '#22EAA7' },
  { id: 'archive',     label: 'Archiv',         short: 'Archiv',   color: '#4B5563' },
]

export const TASK_PRIORITIES = [
  { id: 'low',     label: 'Niedrig',      color: '#6EA8C0' },
  { id: 'medium',  label: 'Mittel',       color: '#F3E0A8' },
  { id: 'high',    label: 'Hoch',         color: '#F59E0B' },
  { id: 'extreme', label: 'Sehr wichtig', color: '#ef4444' },
]

export const TASK_EFFORTS = [
  { id: 'small',       label: 'Klein',       color: '#22EAA7' },
  { id: 'medium',      label: 'Mittel',      color: '#F3E0A8' },
  { id: 'large',       label: 'Groß',        color: '#F59E0B' },
  { id: 'complicated', label: 'Kompliziert', color: '#ef4444' },
]

// Aufgabentypen — angelehnt an die Notion-Vorlage (Installation, Reinigung, …)
export const TASK_TYPES = [
  { id: 'installation',  label: 'Installation/Montage', color: '#3F51B5' },
  { id: 'pflege',        label: 'Pflege',               color: '#0B8043' },
  { id: 'giessen',       label: 'Gießen',               color: '#039BE5' },
  { id: 'maehen',        label: 'Rasen mähen',          color: '#7CB342' },
  { id: 'beikraut',      label: 'Beikraut entfernen',   color: '#8D6E63' },
  { id: 'reinigung',     label: 'Reinigung',            color: '#26A69A' },
  { id: 'monitoring',    label: 'Monitoring',           color: '#F4511E' },
  { id: 'pflanzung',     label: 'Pflanzung',            color: '#66BB6A' },
  { id: 'bestellung',    label: 'Bestellung',           color: '#AB47BC' },
  { id: 'angebot',       label: 'Angebot',              color: '#EC407A' },
  { id: 'beratung',      label: 'Beratung/Meeting',     color: '#8E24AA' },
  { id: 'orga',          label: 'Orga/Verwaltung',      color: '#78909C' },
  { id: 'sonstiges',     label: 'Sonstiges',            color: '#616161' },
]

// Bereiche = Projektmanagement-Ebene (wie die Notion-Datenbanken PFLEGE_MASTER,
// LUMA_MALTE, STROMNETZ_BERLIN …). Gruppierung ÜBER den Aufgaben.
export const SEED_BOARDS = [
  { id: 'b_pflege', name: 'Pflege',           emoji: '🌿', color: '#0B8043', members: ['malte', 'lukas', 'jona', 'anselm', 'robert'], client_id: null,          sort_order: 0 },
  { id: 'b_office', name: 'LUMA Office',       emoji: '🏢', color: '#08AA56', members: ['malte', 'lukas'],                             client_id: null,          sort_order: 1 },
  { id: 'b_snb',    name: 'Stromnetz Berlin',  emoji: '⚡', color: '#F6BF26', members: ['malte', 'lukas'],                             client_id: 'stromnetz',   sort_order: 2 },
  { id: 'b_jope',   name: 'JOPE',              emoji: '🏗️', color: '#3F51B5', members: ['malte', 'lukas', 'jona'],                     client_id: 'jope',        sort_order: 3 },
  { id: 'b_bew',    name: 'BEW',               emoji: '🌲', color: '#0B8043', members: ['malte', 'lukas', 'anselm'],                   client_id: 'bew',         sort_order: 4 },
  { id: 'b_pp',     name: 'Preußenpark',       emoji: '🌳', color: '#039BE5', members: ['malte', 'robert'],                           client_id: 'gruenflaeche', sort_order: 5 },
]

export const BOARD_EMOJIS = ['🌿', '🏢', '⚡', '🏗️', '🌲', '🌳', '🐝', '💧', '🌻', '🪴', '📋', '🧰', '📦', '🗺️', '⭐', '🔧']
export const BOARD_COLORS = ['#0B8043', '#08AA56', '#F6BF26', '#3F51B5', '#039BE5', '#7CB342', '#8E24AA', '#F4511E', '#26A69A', '#EC407A']

export const JOB_TYPES = [
  { id: 'pflege',       label: 'Pflege',       labelEN: 'Stewardship',   color: '#0B8043' },
  { id: 'baumpflege',   label: 'Baumpflege',   labelEN: 'Tree Care',     color: '#F6BF26' },
  { id: 'installation', label: 'Installation', labelEN: 'Installation',  color: '#3F51B5' },
  { id: 'beratung',     label: 'Beratung',     labelEN: 'Consulting',    color: '#8E24AA' },
  { id: 'giessen',      label: 'Gießen',       labelEN: 'Irrigation',    color: '#039BE5' },
  { id: 'maehen',       label: 'Mähen',        labelEN: 'Mowing',        color: '#7CB342' },
  { id: 'drohne',       label: 'Drohne',       labelEN: 'Drone Survey',  color: '#F4511E' },
  { id: 'sonstiges',    label: 'Sonstiges',    labelEN: 'Other',         color: '#616161' },
]

export const SEED_CLIENTS = [
  { id: 'jope',         name: 'JOPE AG',                       color: '#3F51B5' },
  { id: 'bew',          name: 'BEW / Vattenfall',              color: '#0B8043' },
  { id: 'stromnetz',    name: 'Stromnetz Berlin',              color: '#F6BF26' },
  { id: 'wisag',        name: 'WISAG',                         color: '#D50000' },
  { id: 'miya',         name: 'MIYA',                          color: '#33B679' },
  { id: 'eberswalde',   name: 'Stadt Eberswalde',              color: '#7CB342' },
  { id: 'gruenflaeche', name: 'Grünflächenamt Charlottenburg', color: '#039BE5' },
  { id: 'loidl',        name: 'Loidl',                         color: '#8E24AA' },
  { id: 'htw-client',   name: 'HTW Berlin',                    color: '#E67C73' },
]

export const PROJECTS_OPS = [
  { id: 'mv-bew',       name: 'MV Tiny Forest',        location: 'Berlin-Märkisches Viertel', client: 'BEW / Vattenfall', client_id: 'bew',          lat: 52.5705, lng: 13.3530 },
  { id: 'blankenburg',  name: 'BL Blankenburg',         location: 'Berlin-Blankenburg',        client: 'BEW / Vattenfall', client_id: 'bew',          lat: 52.5747, lng: 13.4560 },
  { id: 'h14',          name: 'H14 Hermannstraße',      location: 'Berlin-Neukölln',           client: 'JOPE AG',          client_id: 'jope',         lat: 52.4792, lng: 13.4292 },
  { id: 'preussenpark', name: 'Preußenpark',            location: 'Berlin-Charlottenburg',     client: 'Grünflächenamt Charlottenburg', client_id: 'gruenflaeche', lat: 52.4974, lng: 13.3065 },
  { id: 'htw',          name: 'HTW Mobile Forests',     location: 'HTW Campus',                client: 'HTW Berlin',       client_id: 'htw-client',   lat: 52.4575, lng: 13.5264 },
  { id: 'langen-enden', name: 'LE Langen Enden',        location: 'Langen Enden, Köpenick',   client: 'BEW / Vattenfall', client_id: 'bew',          lat: 52.4270, lng: 13.6040 },
]

// ISO week dates relative to today for demo
function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export const SEED_JOBS = [
  {
    id: 'j1', project_id: 'mv-bew', title: 'Wochenpflege Tiny Forest',
    job_type: 'pflege', date: daysFromNow(0),
    start_time: '08:00', end_time: '14:00',
    assigned_users: ['jona', 'anselm'],
    vehicle_ids: ['lumi'], vehicle_id: 'lumi',
    tools: ['Sense', 'Schubkarre', 'Mulch'],
    notes: 'Mulchen + Wildblumen kontrollieren', recurring_template_id: 'rt1',
  },
  {
    id: 'j1b', project_id: 'blankenburg', title: 'Bewässerungskontrolle BL',
    job_type: 'giessen', date: daysFromNow(0),
    start_time: '09:30', end_time: '12:00',
    assigned_users: ['malte'],
    vehicle_ids: ['lumo'], vehicle_id: 'lumo',
    tools: ['IBC-Schlüssel', 'Schlauch'],
    notes: 'Paralleleinsatz zur Wochenpflege MV',
  },
  {
    id: 'j2', project_id: 'blankenburg', title: 'Wildbienenweide: Schröpfschnitt',
    job_type: 'maehen', date: daysFromNow(1),
    start_time: '07:00', end_time: '12:00',
    assigned_users: ['jona'],
    vehicle_ids: ['lumo'], vehicle_id: 'lumo',
    tools: ['Balkenmäher'],
    notes: '',
  },
  {
    id: 'j3', project_id: 'h14', title: 'Baumpflege + Kontrolle',
    job_type: 'baumpflege', date: daysFromNow(2),
    start_time: '08:00', end_time: '17:00',
    assigned_users: ['malte', 'lukas'],
    vehicle_ids: ['lumi'], vehicle_id: 'lumi',
    tools: ['Kletterausrüstung', 'Motorsäge', 'Seilzug'],
    notes: 'FLL-Kontrolle + Schnittvorbereitung Eiche',
  },
  {
    id: 'j4', project_id: 'mv-bew', title: 'Gießen — Tröpfchencheck',
    job_type: 'giessen', date: daysFromNow(3),
    start_time: '07:00', end_time: '11:00',
    assigned_users: ['anselm'],
    vehicle_ids: ['lumo'], vehicle_id: 'lumo',
    tools: ['Schlauch', 'IBC-Schlüssel'],
    notes: 'Sensor zeigt 28% → Bewässerung nötig',
  },
  {
    id: 'j5', project_id: 'preussenpark', title: 'Beratung Bezirksamt',
    job_type: 'beratung', date: daysFromNow(4),
    start_time: '10:00', end_time: '13:00',
    assigned_users: ['malte', 'robert'],
    vehicle_ids: [], vehicle_id: null,
    tools: [],
    notes: 'Konzept Blühstreifen 2026 präsentieren',
    location: 'Bezirksamt Charlottenburg, Stadtentwicklungsamt',
  },
  {
    id: 'j6', project_id: 'htw', title: 'HTW Mobile Forest: Pflege',
    job_type: 'pflege', date: daysFromNow(5),
    start_time: '12:00', end_time: '17:00',
    assigned_users: ['jona', 'anselm'],
    vehicle_ids: ['lumi'], vehicle_id: 'lumi',
    tools: ['Gießkanne', 'Schere'],
    notes: '', recurring_template_id: 'rt2',
  },
  {
    id: 'j7', project_id: 'mv-bew', title: 'NDVI Drohnenbefliegung',
    job_type: 'drohne', date: daysFromNow(7),
    start_time: '08:00', end_time: '11:00',
    assigned_users: ['lukas'],
    vehicle_ids: ['lumo'], vehicle_id: 'lumo',
    tools: ['DJI Mavic 3', 'Multispektral-Aufsatz'],
    notes: 'Vierteljährliches Monitoring',
  },
]

export const SEED_RECURRING = [
  {
    id: 'rt1', project_id: 'mv-bew', title: 'Wochenpflege Tiny Forest',
    job_type: 'pflege', interval_days: 7,
    assigned_users: ['jona', 'anselm'], vehicle_id: 'sprinter',
    tools: ['Sense', 'Schubkarre', 'Mulch'],
    notes: 'Mulchen, Wildblumen, Durchsicht',
    active: true, last_date: daysFromNow(-7), next_date: daysFromNow(0),
  },
  {
    id: 'rt2', project_id: 'htw', title: 'HTW Mobile Forest: Pflege',
    job_type: 'pflege', interval_days: 14,
    assigned_users: ['jona', 'anselm'], vehicle_id: 'sprinter',
    tools: ['Gießkanne', 'Schere'],
    notes: '',
    active: true, last_date: daysFromNow(-9), next_date: daysFromNow(5),
  },
  {
    id: 'rt3', project_id: 'blankenburg', title: 'Rasenmähen BL',
    job_type: 'maehen', interval_days: 21,
    assigned_users: ['jona'], vehicle_id: 'passat',
    tools: ['Balkenmäher'],
    notes: 'Nur Aufenthaltsbereiche, Wildwiese stehen lassen',
    active: true, last_date: daysFromNow(-14), next_date: daysFromNow(7),
  },
]

export const SEED_SENSORS = [
  {
    id: 's1', project_id: 'mv-bew', name: 'Bodenfeuchte Tiny Forest Nord',
    type: 'soil_moisture', unit: '%', value: 28,
    threshold_low: 30, threshold_high: 80,
    status: 'warning', last_updated: new Date().toISOString(),
  },
  {
    id: 's2', project_id: 'mv-bew', name: 'Bodentemperatur',
    type: 'soil_temp', unit: '°C', value: 18,
    threshold_low: 5, threshold_high: 35,
    status: 'ok', last_updated: new Date().toISOString(),
  },
  {
    id: 's3', project_id: 'blankenburg', name: 'IBC Füllstand Hochbeet',
    type: 'soil_moisture', unit: '%', value: 62,
    threshold_low: 25, threshold_high: 90,
    status: 'ok', last_updated: new Date().toISOString(),
  },
  {
    id: 's4', project_id: 'mv-bew', name: 'Bodenfeuchte Wildbienenweide',
    type: 'soil_moisture', unit: '%', value: 15,
    threshold_low: 20, threshold_high: 75,
    status: 'critical', last_updated: new Date().toISOString(),
  },
]

export const SEED_TIME_ENTRIES = [
  // This week
  { id: 'te1', user_id: 'jona',   project_id: 'mv-bew',       job_id: 'j1', date: daysFromNow(0),  hours: 8,   description: 'Wochenpflege, Mulchen, Wildblumen kontrollieren', invoice_id: null },
  { id: 'te2', user_id: 'anselm', project_id: 'mv-bew',       job_id: 'j1', date: daysFromNow(0),  hours: 8,   description: 'Wochenpflege, Mulchen', invoice_id: null },
  { id: 'te3', user_id: 'jona',   project_id: 'blankenburg',  job_id: 'j2', date: daysFromNow(1),  hours: 4,   description: 'Schröpfschnitt Wildbienenweide', invoice_id: null },
  { id: 'te4', user_id: 'malte',  project_id: 'h14',          job_id: 'j3', date: daysFromNow(2),  hours: 6,   description: 'Baumpflege + FLL-Kontrolle', invoice_id: null },
  { id: 'te5', user_id: 'lukas',  project_id: 'h14',          job_id: 'j3', date: daysFromNow(2),  hours: 6,   description: 'Baumpflege, Schnittvorbereitung Eiche', invoice_id: null },
  { id: 'te6', user_id: 'malte',  project_id: 'preussenpark', job_id: 'j5', date: daysFromNow(4),  hours: 3,   description: 'Beratung Bezirksamt, Konzept Blühstreifen 2026', invoice_id: null },
  { id: 'te7', user_id: 'robert', project_id: 'preussenpark', job_id: 'j5', date: daysFromNow(4),  hours: 3,   description: 'Beratung Bezirksamt', invoice_id: null },
  // Last week
  { id: 'te8',  user_id: 'jona',   project_id: 'mv-bew',      job_id: null, date: daysFromNow(-7), hours: 8,   description: 'Pflege Tiny Forest', invoice_id: 'inv1' },
  { id: 'te9',  user_id: 'anselm', project_id: 'mv-bew',      job_id: null, date: daysFromNow(-7), hours: 8,   description: 'Pflege Tiny Forest', invoice_id: 'inv1' },
  { id: 'te10', user_id: 'malte',  project_id: 'mv-bew',      job_id: null, date: daysFromNow(-6), hours: 5,   description: 'Standortanalyse + Protokoll', invoice_id: 'inv1' },
  { id: 'te11', user_id: 'lukas',  project_id: 'mv-bew',      job_id: null, date: daysFromNow(-6), hours: 4,   description: 'Drohnenbefliegung NDVI', invoice_id: 'inv1' },
  { id: 'te12', user_id: 'jona',   project_id: 'htw',         job_id: null, date: daysFromNow(-5), hours: 4,   description: 'Pflege Mobile Forest', invoice_id: null },
  { id: 'te13', user_id: 'anselm', project_id: 'htw',         job_id: null, date: daysFromNow(-5), hours: 4,   description: 'Pflege Mobile Forest', invoice_id: null },
  { id: 'te14', user_id: 'malte',  project_id: 'langen-enden',job_id: null, date: daysFromNow(-4), hours: 7,   description: 'Installation Pflanzzone A', invoice_id: null },
  { id: 'te15', user_id: 'lukas',  project_id: 'langen-enden',job_id: null, date: daysFromNow(-4), hours: 7,   description: 'Installation Pflanzzone A + B', invoice_id: null },
]

export const SEED_INVOICES = [
  {
    id: 'inv1',
    project_id: 'mv-bew',
    client: 'BEW / Vattenfall',
    invoice_number: 'RE-2026-003',
    date_issued: daysFromNow(-10),
    date_paid: daysFromNow(-2),
    entry_ids: ['te8', 'te9', 'te10', 'te11'],
    total_hours: 25,
    amount: 3250,
    notes: 'Pflege + Monitoring KW 20',
  },
]
