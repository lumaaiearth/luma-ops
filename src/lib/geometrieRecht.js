// ─────────────────────────────────────────────────────────────────────────────
// Wer darf die Geometrie eines Kartenobjekts ändern?
//
//   · Admin: alles.
//   · Mitarbeitende: eigene Objekte (created_by), solange sie jünger als
//     FRIST_STUNDEN sind — ein frisch falsch gesetzter Baum lässt sich so
//     sofort korrigieren, gewachsene Bestände verändert niemand versehentlich.
//   · Altbestand ohne created_by (vor 2026-10-24): nur Admin.
//   · Luftbilder/Orthomosaike werden hier nie verschoben.
// Geprüft mit scripts/test-geometrie-recht.mjs
// ─────────────────────────────────────────────────────────────────────────────

export const FRIST_STUNDEN = 24
const NIE = new Set(['drone_image', 'ortho_tiles'])

export function darfGeometrieAendern(feature, { isAdmin = false, isMitarbeiter = false, userId = null, jetzt = Date.now() } = {}) {
  if (!feature || NIE.has(feature.feature_type)) return false
  if (isAdmin) return true
  if (!isMitarbeiter || !userId || feature.created_by !== userId) return false
  const angelegt = Date.parse(feature.created_at)
  return Number.isFinite(angelegt) && jetzt - angelegt <= FRIST_STUNDEN * 3600e3
}
