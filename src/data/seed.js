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
