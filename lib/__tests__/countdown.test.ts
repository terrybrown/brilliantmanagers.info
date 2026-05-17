import { describe, it, expect } from 'vitest'
import { daysUntil, countdownLabel, googleCalendarUrl } from '../countdown'

function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

describe('daysUntil', () => {
  it('returns 0 for today', () => {
    const today = localDateString(new Date())
    expect(daysUntil(today)).toBe(0)
  })

  it('returns 1 for tomorrow', () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    expect(daysUntil(localDateString(d))).toBe(1)
  })

  it('returns negative for a past date', () => {
    expect(daysUntil('2020-01-01')).toBeLessThan(0)
  })

  it('returns 30 for a date 30 days away', () => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    expect(daysUntil(localDateString(d))).toBe(30)
  })
})

describe('countdownLabel', () => {
  it.each([
    [-1, 'overdue'],
    [0, 'today'],
    [1, 'tomorrow'],
    [5, 'in 5 days'],
    [30, 'in 30 days'],
  ])('days=%i → "%s"', (days, label) => {
    expect(countdownLabel(days)).toBe(label)
  })
})

describe('googleCalendarUrl', () => {
  it('encodes start date and next day correctly', () => {
    const url = googleCalendarUrl('2025-06-15')
    expect(url).toContain('dates=20250615/20250616')
  })

  it('includes the expected title text', () => {
    const url = googleCalendarUrl('2025-06-15')
    expect(url).toContain('text=Brilliant+Managers+Reflection+Round')
  })

  it('handles month boundary correctly', () => {
    const url = googleCalendarUrl('2025-01-31')
    expect(url).toContain('dates=20250131/20250201')
  })
})
