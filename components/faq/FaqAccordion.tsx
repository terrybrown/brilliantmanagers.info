'use client'

import { useState, type ReactNode } from 'react'
import { Plus, Check } from 'lucide-react'
import type { FaqSection } from '@/lib/faq'

/**
 * Converts a FAQ answer string containing only <a> tags into React nodes.
 * All other HTML is emitted as plain text rather than rendered, avoiding XSS.
 * Anchor attributes are extracted from the source string and applied directly
 * to React anchor elements, so `dangerouslySetInnerHTML` is never needed.
 */
function renderAnswer(html: string): ReactNode[] {
  const ANCHOR_RE = /<a\s([^>]*)>(.*?)<\/a>/g
  const nodes: ReactNode[] = []
  let cursor = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = ANCHOR_RE.exec(html)) !== null) {
    const [fullMatch, attrs, linkText] = match
    const before = html.slice(cursor, match.index)
    if (before) nodes.push(before)

    const href = (attrs.match(/href="([^"]*)"/) ?? [])[1] ?? '#'
    const target = (attrs.match(/target="([^"]*)"/) ?? [])[1]
    const rel = (attrs.match(/rel="([^"]*)"/) ?? [])[1]

    nodes.push(
      <a
        key={key++}
        href={href}
        target={target}
        rel={rel}
        style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
      >
        {linkText}
      </a>
    )

    cursor = match.index + fullMatch.length
  }

  const tail = html.slice(cursor)
  if (tail) nodes.push(tail)

  return nodes
}

interface Props {
  sections: FaqSection[]
}

function makeId(sectionId: string, idx: number) {
  return `${sectionId}-${idx}`
}

export function FaqAccordion({ sections }: Props) {
  const firstId = sections[0]?.items[0] ? makeId(sections[0].id, 0) : null
  const [openId, setOpenId] = useState<string | null>(firstId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {sections.map(section => (
        <div key={section.id} id={section.id}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              marginBottom: 12,
            }}
          >
            {section.label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {section.items.map((item, idx) => {
              const id = makeId(section.id, idx)
              const isOpen = openId === id
              return (
                <div
                  key={id}
                  style={{
                    background: 'var(--color-surface)',
                    border: `1px solid ${isOpen ? 'var(--color-accent-border)' : 'var(--color-border)'}`,
                    borderRadius: 10,
                    boxShadow: '0 1px 2px rgba(40,60,45,.04)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 18px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        flex: 1,
                      }}
                    >
                      {item.q}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: isOpen ? 'var(--color-accent)' : 'var(--color-chip-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isOpen ? '#fff' : 'var(--color-text-muted)',
      }}
                    >
                      {isOpen ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '14px 18px 16px',
                        borderTop: '1px solid var(--color-border)',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.65,
                          color: 'var(--color-text-muted)',
                          margin: 0,
                        }}
                      >
                        {renderAnswer(item.a)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
