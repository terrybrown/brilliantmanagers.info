import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GuideDetails } from '@/components/guide/details'

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
