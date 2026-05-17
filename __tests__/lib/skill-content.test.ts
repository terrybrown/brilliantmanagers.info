import { describe, it, expect } from 'vitest'
import { SKILLS } from '@/lib/skills'
import { SKILL_CONTENT } from '@/lib/skill-content'

describe('SKILL_CONTENT', () => {
  it('has an entry for every skill key', () => {
    SKILLS.forEach(skill => {
      expect(SKILL_CONTENT[skill.key], `Missing content for ${skill.key}`).toBeDefined()
    })
  })

  it('every entry has all four required sections', () => {
    Object.entries(SKILL_CONTENT).forEach(([key, content]) => {
      expect(content.whyItMatters.length, `${key}: whyItMatters empty`).toBeGreaterThan(0)
      expect(content.warningSigns.length, `${key}: warningSigns empty`).toBeGreaterThan(0)
      expect(content.pathways.length, `${key}: pathways empty`).toBeGreaterThan(0)
    })
  })
})
