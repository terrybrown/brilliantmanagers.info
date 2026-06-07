import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { GuideDetails } from '@/components/guide/details'
import { useGuideData } from '@/components/guide/guide-data-context'

vi.mock('@/components/guide/guide-data-context', () => ({
  useGuideData: vi.fn(() => null),
}))

vi.mock('@/components/guide/scoring-badge', () => ({
  ScoringBadge: ({ level, you }: { level: string; you?: boolean }) => (
    <span data-testid="scoring-badge">{you ? `You · ${level}` : level}</span>
  ),
}))

const mockUseGuideData = vi.mocked(useGuideData)

function renderSkill(summaryText = 'Test Skill', bodyText = 'Skill body content.') {
  return render(
    <GuideDetails>
      <summary>{summaryText}</summary>
      <p>{bodyText}</p>
    </GuideDetails>
  )
}

describe('GuideDetails', () => {
  it('renders the skill name in the accordion header', () => {
    renderSkill('Time Management')
    expect(screen.getByText('Time Management')).toBeInTheDocument()
  })

  it('hides body content when accordion is closed', () => {
    renderSkill('Test Skill', 'Hidden content')
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })

  it('shows body content after clicking the header button', () => {
    renderSkill('Test Skill', 'Revealed content')
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Revealed content')).toBeInTheDocument()
  })

  it('collapses body content when header is clicked a second time', () => {
    renderSkill('Test Skill', 'Toggle content')
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(screen.getByText('Toggle content')).toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()
  })

  it('sets aria-expanded to false when closed', () => {
    renderSkill()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('sets aria-expanded to true when open', () => {
    renderSkill()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('uses the summary text as the element id slug', () => {
    const { container } = renderSkill('Time and Task Management')
    expect(container.firstChild).toHaveAttribute('id', 'time-and-task-management')
  })
})

describe('GuideDetails — with score/goal data', () => {
  function renderWithSkillData(data: { level: string | null; hasGoal: boolean; planId?: string }) {
    mockUseGuideData.mockReturnValue({
      pillarScore: null,
      skillDataBySlug: { 'test-skill': data as { level: import('@/lib/skills').Level | null; hasGoal: boolean; planId?: string } },
    })
    return render(
      <GuideDetails>
        <summary>Test Skill</summary>
        <p>Body</p>
      </GuideDetails>
    )
  }

  afterEach(() => {
    mockUseGuideData.mockReturnValue(null)
  })

  it('shows ScoringBadge in header when level is available (closed state)', () => {
    renderWithSkillData({ level: 'Proficient', hasGoal: false })
    expect(screen.getByTestId('scoring-badge')).toBeInTheDocument()
    expect(screen.getByTestId('scoring-badge')).toHaveTextContent('You · Proficient')
  })

  it('does not show ScoringBadge when no score', () => {
    renderWithSkillData({ level: null, hasGoal: false })
    expect(screen.queryByTestId('scoring-badge')).not.toBeInTheDocument()
  })

  it('shows "Set a goal" in action strip when no active goal', () => {
    renderWithSkillData({ level: 'Advanced', hasGoal: false })
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Set a goal')).toBeInTheDocument()
  })

  it('shows "View goal" in action strip when active goal exists', () => {
    renderWithSkillData({ level: 'Advanced', hasGoal: true, planId: 'plan-123' })
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('View goal')).toBeInTheDocument()
  })

  it('shows scored level text in action strip when open', () => {
    renderWithSkillData({ level: 'Expert', hasGoal: false })
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/You scored this/)).toBeInTheDocument()
    expect(screen.getByText('Expert')).toBeInTheDocument()
  })

  it('shows generic copy when no score', () => {
    renderWithSkillData({ level: null, hasGoal: false })
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Explore this skill in the scorecard')).toBeInTheDocument()
  })
})
