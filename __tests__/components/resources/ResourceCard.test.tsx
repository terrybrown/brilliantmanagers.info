import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResourceCard } from '@/components/resources/ResourceCard'
import type { Resource } from '@/lib/db/resources'

const BASE: Resource = {
  id: '1',
  title: 'Black Box Thinking',
  subtitle: 'Why Most People Never Learn from Their Mistakes',
  url: 'https://example.com',
  description: 'A compelling case for learning from failure.',
  resource_type: 'book',
  author: 'Matthew Syed',
  topic: 'Self',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

describe('ResourceCard', () => {
  it('renders the title', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('Black Box Thinking')).toBeTruthy()
  })

  it('renders the subtitle when present', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('Why Most People Never Learn from Their Mistakes')).toBeTruthy()
  })

  it('renders the author when present', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('Matthew Syed')).toBeTruthy()
  })

  it('renders the description', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('A compelling case for learning from failure.')).toBeTruthy()
  })

  it('renders the type badge', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('BOOK')).toBeTruthy()
  })

  it('renders the topic tag when present', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('· Self')).toBeTruthy()
  })

  it('does not render subtitle when null', () => {
    render(<ResourceCard resource={{ ...BASE, subtitle: null }} />)
    expect(screen.queryByText('Why Most People Never Learn from Their Mistakes')).toBeNull()
  })

  it('does not render author when null', () => {
    render(<ResourceCard resource={{ ...BASE, author: null }} />)
    expect(screen.queryByText('Matthew Syed')).toBeNull()
  })

  it('does not render topic when null', () => {
    render(<ResourceCard resource={{ ...BASE, topic: null }} />)
    expect(screen.queryByText(/· /)).toBeNull()
  })
})
