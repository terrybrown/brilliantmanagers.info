import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FaqAccordion } from '@/components/faq/FaqAccordion'
import type { FaqSection } from '@/lib/faq'

const SECTIONS: FaqSection[] = [
  {
    id: 'section-a',
    label: 'Section A',
    items: [
      { q: 'Question 1', a: 'Answer 1' },
      { q: 'Question 2', a: 'Answer 2' },
    ],
  },
  {
    id: 'section-b',
    label: 'Section B',
    items: [{ q: 'Question 3', a: 'Answer 3' }],
  },
]

const LINK_SECTIONS: FaqSection[] = [
  {
    id: 'links',
    label: 'Links',
    items: [
      {
        q: 'Internal link',
        a: 'Visit <a href="/the-guide">the guide</a> to learn more.',
      },
      {
        q: 'External link',
        a: 'Connect on <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>.',
      },
    ],
  },
]

describe('FaqAccordion', () => {
  it('renders all section labels', () => {
    render(<FaqAccordion sections={SECTIONS} />)
    expect(screen.getByText('Section A')).toBeTruthy()
    expect(screen.getByText('Section B')).toBeTruthy()
  })

  it('renders all question texts', () => {
    render(<FaqAccordion sections={SECTIONS} />)
    expect(screen.getByText('Question 1')).toBeTruthy()
    expect(screen.getByText('Question 2')).toBeTruthy()
    expect(screen.getByText('Question 3')).toBeTruthy()
  })

  it('opens first item by default and shows its answer', () => {
    render(<FaqAccordion sections={SECTIONS} />)
    expect(screen.getByText('Answer 1')).toBeTruthy()
  })

  it('does not show other answers by default', () => {
    render(<FaqAccordion sections={SECTIONS} />)
    expect(screen.queryByText('Answer 2')).toBeNull()
    expect(screen.queryByText('Answer 3')).toBeNull()
  })

  it('clicking a closed item opens it and shows its answer', () => {
    render(<FaqAccordion sections={SECTIONS} />)
    fireEvent.click(screen.getByText('Question 2'))
    expect(screen.getByText('Answer 2')).toBeTruthy()
  })

  it('clicking an open item closes it', () => {
    render(<FaqAccordion sections={SECTIONS} />)
    fireEvent.click(screen.getByText('Question 1'))
    expect(screen.queryByText('Answer 1')).toBeNull()
  })

  it('only one item is open at a time', () => {
    render(<FaqAccordion sections={SECTIONS} />)
    fireEvent.click(screen.getByText('Question 2'))
    expect(screen.queryByText('Answer 1')).toBeNull()
    expect(screen.getByText('Answer 2')).toBeTruthy()
  })
})

describe('FaqAccordion — answer link rendering', () => {
  it('renders internal link text as an anchor element', () => {
    render(<FaqAccordion sections={LINK_SECTIONS} />)
    const link = screen.getByText('the guide')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/the-guide')
  })

  it('renders surrounding plain text alongside the link', () => {
    render(<FaqAccordion sections={LINK_SECTIONS} />)
    // The answer paragraph contains both plain text and a link child; query the
    // full visible text rather than individual text nodes (which Testing Library
    // does not expose as independent queryable elements).
    const link = screen.getByText('the guide')
    const paragraph = link.closest('p')
    expect(paragraph?.textContent).toContain('Visit')
    expect(paragraph?.textContent).toContain('to learn more.')
  })

  it('renders external link with target and rel attributes', () => {
    render(<FaqAccordion sections={LINK_SECTIONS} />)
    fireEvent.click(screen.getByText('External link'))
    const link = screen.getByText('LinkedIn')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('https://linkedin.com')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('does not inject raw HTML into the DOM', () => {
    const xssSection: FaqSection[] = [
      {
        id: 'xss',
        label: 'XSS',
        items: [{ q: 'XSS test', a: '<script>window.__xss=1</script>Safe text' }],
      },
    ]
    render(<FaqAccordion sections={xssSection} />)
    // The script tag is not an anchor so it is emitted as plain text, not executed
    expect(screen.getByText('<script>window.__xss=1</script>Safe text')).toBeTruthy()
    // @ts-expect-error intentional check for absent global
    expect(window.__xss).toBeUndefined()
  })
})
