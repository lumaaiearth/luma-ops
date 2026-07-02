import { sb } from './supabase.js'

// Telegram messages go through the 'tg-send' Edge Function so the bot token
// stays server-side (Supabase secret TELEGRAM_BOT_TOKEN). Chat IDs are
// configured in Settings and stored in app_settings under 'telegram_groups'.
// group: 'pflege' | 'pm' | 'inter' | 'all'

export function tgSend(group, text) {
  if (!group || !text) return Promise.resolve({ ok: false })
  return sb.functions.invoke('tg-send', { body: { group, text } })
    .then(({ data, error }) => (error ? { ok: false, error } : data))
    .catch(() => ({ ok: false }))
}

// Returns which groups to notify given a list of assigned user IDs
export function groupsForUsers(userIds) {
  const groups = []
  const hasPflege = userIds.some(id => ['jona', 'anselm', 'malte'].includes(id))
  const hasPM = userIds.some(id => ['malte', 'lukas', 'robert'].includes(id))
  if (hasPflege) groups.push('pflege')
  if (hasPM && !hasPflege) groups.push('pm')
  if (hasPflege && hasPM) groups.push('inter')
  return [...new Set(groups)]
}
