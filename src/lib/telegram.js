export function tgSend(chatId, text) {
  if (!chatId) return
  const token = localStorage.getItem('luma_tg_token')
  if (!token) return
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {})
}

export function tgGroups() {
  return {
    pflege: localStorage.getItem('luma_tg_pflege') || '',
    pm: localStorage.getItem('luma_tg_pm') || '',
    inter: localStorage.getItem('luma_tg_inter') || '',
  }
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
