export const TEAM = [
  { id: 'malte',  name: 'Malte',  role: 'admin',   color: '#08AA56', initials: 'ML' },
  { id: 'lukas',  name: 'Lukas',  role: 'admin',   color: '#22EAA7', initials: 'LK' },
  { id: 'robert', name: 'Robert', role: 'manager', color: '#F3E0A8', initials: 'RB' },
  { id: 'jona',   name: 'Jona',   role: 'field',   color: '#6EA8C0', initials: 'JN' },
  { id: 'anselm', name: 'Anselm', role: 'field',   color: '#C0966E', initials: 'AS' },
]

export const VEHICLES = [
  { id: 'lumi',       name: 'LUMi',              model: 'Renault Kangoo Maxi', ownership: 'owned',  type: 'van',     color: '#08AA56' },
  { id: 'lumo',       name: 'LUMo',              model: 'Mercedes Vito',       ownership: 'owned',  type: 'van',     color: '#22EAA7' },
  { id: 'hebebuehne', name: 'Hebebühne',         model: 'Leihe',               ownership: 'rental', type: 'lift',    color: '#F59E0B' },
  { id: 'haecksler',  name: 'Häcksler-Anhänger', model: 'Leihe',               ownership: 'rental', type: 'trailer', color: '#F97316' },
  { id: 'pritsche',   name: 'Pritsche',          model: 'Leihe',               ownership: 'rental', type: 'truck',   color: '#8B5CF6' },
]

export const JOB_TYPES = [
  { id: 'pflege',       label: 'Pflege',       labelEN: 'Stewardship',   color: '#08AA56' },
  { id: 'baumpflege',   label: 'Baumpflege',   labelEN: 'Tree Care',     color: '#F59E0B' },
  { id: 'installation', label: 'Installation', labelEN: 'Installation',  color: '#3B82F6' },
  { id: 'beratung',     label: 'Beratung',     labelEN: 'Consulting',    color: '#8B5CF6' },
  { id: 'giessen',      label: 'Gießen',       labelEN: 'Irrigation',    color: '#06B6D4' },
  { id: 'maehen',       label: 'Mähen',        labelEN: 'Mowing',        color: '#84CC16' },
  { id: 'drohne',       label: 'Drohne',       labelEN: 'Drone Survey',  color: '#F97316' },
  { id: 'sonstiges',    label: 'Sonstiges',    labelEN: 'Other',         color: '#6B7280' },
]

export const PROJECTS_OPS = [
  { id: 'mv-bew',       name: 'MV Tiny Forest',        location: 'Berlin-Märkisches Viertel', client: 'BEW / Vattenfall' },
  { id: 'blankenburg',  name: 'BL Blankenburg',         location: 'Berlin-Blankenburg',        client: 'BEW / Vattenfall' },
  { id: 'h14',          name: 'H14 Hermannstraße',      location: 'Berlin-Neukölln',           client: 'JOPE AG' },
  { id: 'preussenpark', name: 'Preußenpark',            location: 'Berlin-Charlottenburg',     client: 'Bezirksamt CW' },
  { id: 'htw',          name: 'HTW Mobile Forests',     location: 'HTW Campus',                client: 'HTW Berlin' },
  { id: 'langen-enden', name: 'LE Langen Enden',        location: 'Berlin',                    client: 'BEW / Vattenfall' },
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
    duration: 'full', assigned_users: ['jona', 'anselm'],
    vehicle_id: 'sprinter', tools: ['Sense', 'Schubkarre', 'Mulch'],
    notes: 'Mulchen + Wildblumen kontrollieren', status: 'planned', recurring_template_id: 'rt1',
  },
  {
    id: 'j2', project_id: 'blankenburg', title: 'Wildbienenweide: Schröpfschnitt',
    job_type: 'maehen', date: daysFromNow(1),
    duration: 'half_am', assigned_users: ['jona'],
    vehicle_id: 'passat', tools: ['Balkenmäher'],
    notes: '', status: 'planned', recurring_template_id: null,
  },
  {
    id: 'j3', project_id: 'h14', title: 'Baumpflege + Kontrolle',
    job_type: 'baumpflege', date: daysFromNow(2),
    duration: 'full', assigned_users: ['malte', 'lukas'],
    vehicle_id: 'sprinter', tools: ['Kletterausrüstung', 'Motorsäge', 'Seilzug'],
    notes: 'FLL-Kontrolle + Schnittvorbereitung Eiche', status: 'planned', recurring_template_id: null,
  },
  {
    id: 'j4', project_id: 'mv-bew', title: 'Gießen — Tröpfchencheck',
    job_type: 'giessen', date: daysFromNow(3),
    duration: 'half_am', assigned_users: ['anselm'],
    vehicle_id: 'passat', tools: ['Schlauch', 'IBC-Schlüssel'],
    notes: 'Sensor zeigt 28% → Bewässerung nötig', status: 'planned', recurring_template_id: null,
  },
  {
    id: 'j5', project_id: 'preussenpark', title: 'Beratung Bezirksamt',
    job_type: 'beratung', date: daysFromNow(4),
    duration: 'half_am', assigned_users: ['malte', 'robert'],
    vehicle_id: null, tools: [],
    notes: 'Konzept Blühstreifen 2026 präsentieren', status: 'planned', recurring_template_id: null,
  },
  {
    id: 'j6', project_id: 'htw', title: 'HTW Mobile Forest: Pflege',
    job_type: 'pflege', date: daysFromNow(5),
    duration: 'half_pm', assigned_users: ['jona', 'anselm'],
    vehicle_id: 'sprinter', tools: ['Gießkanne', 'Schere'],
    notes: '', status: 'planned', recurring_template_id: 'rt2',
  },
  {
    id: 'j7', project_id: 'mv-bew', title: 'NDVI Drohnenbefliegung',
    job_type: 'drohne', date: daysFromNow(7),
    duration: 'half_am', assigned_users: ['lukas'],
    vehicle_id: 'passat', tools: ['DJI Mavic 3', 'Multispektral-Aufsatz'],
    notes: 'Vierteljährliches Monitoring', status: 'planned', recurring_template_id: null,
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
