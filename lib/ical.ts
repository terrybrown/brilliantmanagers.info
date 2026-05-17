function toDateStamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function generateICS(scheduledDate: string): string {
  const start = new Date(scheduledDate + 'T00:00:00')
  const end = new Date(scheduledDate + 'T00:00:00')
  end.setDate(end.getDate() + 1)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brilliant Managers//EN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${toDateStamp(start)}`,
    `DTEND;VALUE=DATE:${toDateStamp(end)}`,
    'SUMMARY:Brilliant Managers Reflection Round',
    'DESCRIPTION:Time to reflect on your management skills',
    `UID:reflection-${scheduledDate}@brilliantmanagers.info`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n') + '\r\n'
}
