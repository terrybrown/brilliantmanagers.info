import { describe, it, expect } from 'vitest'
import { extractSkills, computeReadingTime } from '@/lib/mdx'

describe('extractSkills', () => {
  it('returns empty array when no summary tags present', () => {
    expect(extractSkills('## Hello\n\nSome text.\n')).toEqual([])
  })

  it('extracts a single skill from a summary tag', () => {
    const source = '<details>\n  <summary>Time and Task Management</summary>\n</details>'
    const skills = extractSkills(source)
    expect(skills).toHaveLength(1)
    expect(skills[0].text).toBe('Time and Task Management')
    expect(skills[0].id).toBe('time-and-task-management')
  })

  it('extracts multiple skills in document order', () => {
    const source = '  <summary>First Skill</summary>\n  <summary>Second Skill</summary>'
    const skills = extractSkills(source)
    expect(skills).toHaveLength(2)
    expect(skills[0].text).toBe('First Skill')
    expect(skills[1].text).toBe('Second Skill')
  })

  it('ignores content that does not match the summary tag pattern', () => {
    const source = 'Some text\n<summary>Real Skill</summary>'
    const skills = extractSkills(source)
    expect(skills).toHaveLength(1)
    expect(skills[0].text).toBe('Real Skill')
  })
})

describe('computeReadingTime', () => {
  it('returns at least 1 minute for very short content', () => {
    expect(computeReadingTime('Hello world')).toBe(1)
  })

  it('returns ~2 minutes for 400 words', () => {
    const source = Array(400).fill('word').join(' ')
    expect(computeReadingTime(source)).toBe(2)
  })

  it('rounds to nearest minute (300 words → 2)', () => {
    const source = Array(300).fill('word').join(' ')
    expect(computeReadingTime(source)).toBe(2)
  })
})
