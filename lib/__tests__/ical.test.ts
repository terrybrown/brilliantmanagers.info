import { describe, it, expect } from 'vitest'
import { generateICS } from '../ical'

describe('generateICS', () => {
  it('returns a VCALENDAR block', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('contains a single VEVENT', () => {
    const ics = generateICS('2025-06-15')
    const beginCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length
    expect(beginCount).toBe(1)
  })

  it('uses CRLF line endings throughout', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('\r\n')
    expect(ics).not.toContain('\n\r')
  })

  it('sets DTSTART as an all-day date', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('DTSTART;VALUE=DATE:20250615')
  })

  it('sets DTEND to the following day', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('DTEND;VALUE=DATE:20250616')
  })

  it('handles month boundary for DTEND', () => {
    const ics = generateICS('2025-01-31')
    expect(ics).toContain('DTEND;VALUE=DATE:20250201')
  })

  it('includes a stable UID', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('UID:reflection-2025-06-15@brilliantmanagers.info')
  })
})
