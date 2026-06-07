import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResourceSearch } from '@/components/resources/ResourceSearch'
import type { Resource } from '@/lib/db/resources'

const makeResource = (overrides: Partial<Resource>): Resource => ({
  id: '1',
  title: 'Default Title',
  subtitle: null,
  url: 'https://example.com',
  description: 'Default description',
  resource_type: 'book',
  author: null,
  topic: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
})

const RESOURCES: Resource[] = [
  makeResource({ id: '1', title: 'Black Box Thinking', author: 'Matthew Syed', description: 'About failure' }),
  makeResource({ id: '2', title: 'Co-Active Coaching', author: 'Kimsey-House', description: 'About coaching' }),
  makeResource({ id: '3', title: 'Radical Candor', author: 'Kim Scott', description: 'About feedback' }),
]

describe('ResourceSearch', () => {
  it('renders all resources when search is empty', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    expect(screen.getByText('Black Box Thinking')).toBeTruthy()
    expect(screen.getByText('Co-Active Coaching')).toBeTruthy()
    expect(screen.getByText('Radical Candor')).toBeTruthy()
  })

  it('filters by title', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Black' } })
    expect(screen.getByText('Black Box Thinking')).toBeTruthy()
    expect(screen.queryByText('Co-Active Coaching')).toBeNull()
  })

  it('filters by author', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Kim Scott' } })
    expect(screen.getByText('Radical Candor')).toBeTruthy()
    expect(screen.queryByText('Black Box Thinking')).toBeNull()
  })

  it('filters by description', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'coaching' } })
    expect(screen.getByText('Co-Active Coaching')).toBeTruthy()
    expect(screen.queryByText('Radical Candor')).toBeNull()
  })

  it('is case-insensitive', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'BLACK' } })
    expect(screen.getByText('Black Box Thinking')).toBeTruthy()
  })

  it('shows no results message when nothing matches', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zzznomatch' } })
    expect(screen.getByText(/no resources match/i)).toBeTruthy()
  })
})
