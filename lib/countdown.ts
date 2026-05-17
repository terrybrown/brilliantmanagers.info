export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function countdownLabel(days: number): string {
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

function toLocalDateStamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function googleCalendarUrl(dateStr: string): string {
  const start = dateStr.replace(/-/g, '')
  const next = new Date(dateStr + 'T00:00:00')
  next.setDate(next.getDate() + 1)
  const end = toLocalDateStamp(next)
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=Brilliant+Managers+Reflection+Round` +
    `&dates=${start}/${end}` +
    `&details=Time+to+reflect+on+your+management+skills`
  )
}
