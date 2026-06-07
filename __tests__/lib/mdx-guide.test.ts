import { describe, it, expect } from 'vitest'
import { extractSkills, computeReadingTime } from '@/lib/mdx'
import { SKILLS } from '@/lib/skills'

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

describe('extractSkills — skill key matching', () => {
  it('resolves skillKey for a skill matched via & → and normalisation', () => {
    // SKILLS has label "Time & Task Management"; MDX has "Time and Task Management"
    const source = '  <summary>Time and Task Management</summary>'
    const skills = extractSkills(source)
    expect(skills[0].skillKey).toBe('self-time-task-management')
  })

  it('resolves skillKey for an exact label match', () => {
    const source = '  <summary>Growth Mindset</summary>'
    const skills = extractSkills(source)
    expect(skills[0].skillKey).toBe('self-growth-mindset')
  })

  it('leaves skillKey undefined when no SKILLS label matches', () => {
    const source = '  <summary>Unknown Skill XYZ</summary>'
    const skills = extractSkills(source)
    expect(skills[0].skillKey).toBeUndefined()
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
