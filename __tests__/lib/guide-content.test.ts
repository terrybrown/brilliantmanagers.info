import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
}))

vi.mock('@/lib/skills', () => ({
  SKILLS: [
    { key: 'self-empathy-compassion', pillar: 'self', label: 'Empathy & Compassion', description: '' },
    { key: 'self-time-task-management', pillar: 'self', label: 'Time & Task Management', description: '' },
  ],
}))

const { parseGuideContent } = await import('@/lib/guide-content')

const SAMPLE_MDX = `
<details>
<summary>Empathy and Compassion</summary>

Some intro text.

#### Definition
The ability to understand and share the feelings of others.

#### Why It Matters
Trust is built through genuine care.

#### This Is Strong When:
* You actively listen without interrupting.
* You follow through on commitments.

#### Warning Signs:
* Dismissing emotions as unprofessional.
* Reactive responses under pressure.

#### Pathways to Improvement:
* Practice reflective listening daily.
* Seek regular feedback from your team.

</details>

<details>
<summary>Time and Task Management</summary>

#### Definition
Effective prioritisation of time and tasks.

#### Why It Matters
Protects focus and reduces burnout.

#### This Is Strong When:
* Meetings have clear agendas.

#### Warning Signs:
* Constantly reactive to incoming requests.

#### Pathways to Improvement:
* Block time for deep work.

</details>
`

describe('parseGuideContent', () => {
  it('returns null for an unrecognised skill label', () => {
    expect(parseGuideContent(SAMPLE_MDX, 'Nonexistent Skill')).toBeNull()
  })

  it('matches a label when the MDX uses "and" and the label uses "&"', () => {
    const result = parseGuideContent(SAMPLE_MDX, 'Empathy & Compassion')
    expect(result).not.toBeNull()
  })

  it('extracts the Definition section', () => {
    const result = parseGuideContent(SAMPLE_MDX, 'Empathy & Compassion')
    expect(result?.definition).toContain('understand and share the feelings')
  })

  it('extracts the Why It Matters section', () => {
    const result = parseGuideContent(SAMPLE_MDX, 'Empathy & Compassion')
    expect(result?.whyItMatters).toContain('Trust is built')
  })

  it('extracts the This Is Strong When section', () => {
    const result = parseGuideContent(SAMPLE_MDX, 'Empathy & Compassion')
    expect(result?.strongWhen).toContain('actively listen')
  })

  it('extracts the Warning Signs section', () => {
    const result = parseGuideContent(SAMPLE_MDX, 'Empathy & Compassion')
    expect(result?.warningSigns).toContain('Dismissing emotions')
  })

  it('extracts the Pathways to Improvement section', () => {
    const result = parseGuideContent(SAMPLE_MDX, 'Empathy & Compassion')
    expect(result?.pathways).toContain('reflective listening')
  })

  it('can match the second details block in the file', () => {
    const result = parseGuideContent(SAMPLE_MDX, 'Time & Task Management')
    expect(result?.definition).toContain('prioritisation')
  })

  it('returns null when there are no details blocks', () => {
    expect(parseGuideContent('no details here', 'Empathy & Compassion')).toBeNull()
  })

  it('parses correctly when details block uses 2-space indentation (real MDX format)', () => {
    const indentedMdx = `
<details>
  <summary>Empathy and Compassion</summary>

  #### Definition
  The ability to understand and share the feelings of others.

  #### Why It Matters
  Trust is built through genuine care.

  #### This Is Strong When:
  * You actively listen without interrupting.

  #### Warning Signs:
  * Dismissing emotions.

  #### Pathways to Improvement:
  * Practice reflective listening.

</details>
`
    const result = parseGuideContent(indentedMdx, 'Empathy & Compassion')
    expect(result).not.toBeNull()
    expect(result?.definition).toContain('understand and share the feelings')
    expect(result?.whyItMatters).toContain('Trust is built')
  })
})
