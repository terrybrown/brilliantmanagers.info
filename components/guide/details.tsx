'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Sparkles } from 'lucide-react'
import { toSlug } from '@/lib/slug'
import { useGuideData } from '@/components/guide/guide-data-context'
import { ScoringBadge } from '@/components/guide/scoring-badge'
import type { ScoringLevel } from '@/config/scoring'

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement(node)) {
    return extractText(
      (node.props as { children?: React.ReactNode }).children
    )
  }
  return ''
}

interface GuideDetailsProps {
  children: React.ReactNode
  id?: string
}

export function GuideDetails({ children, id: propsId }: GuideDetailsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const guideData = useGuideData()

  const childArray = React.Children.toArray(children)
  const summaryChild = childArray.find(
    (child) => React.isValidElement(child) && child.type === 'summary'
  )
  const summaryText = summaryChild
    ? extractText(
        (summaryChild as React.ReactElement<{ children?: React.ReactNode }>).props
          .children
      )
    : ''
  const id = propsId ?? toSlug(summaryText)
  const skillData = guideData?.skillDataBySlug[id] ?? null
  const bodyChildren = childArray.filter(
    (child) => !(React.isValidElement(child) && child.type === 'summary')
  )

  return (
    <div
      id={id}
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${isOpen ? 'var(--color-accent-border)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        scrollMarginTop: '5rem',
      }}
    >
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: isOpen ? '18px 22px 6px' : '16px 22px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {isOpen ? (
          <ChevronDown size={17} color="var(--color-text-faint)" strokeWidth={2.2} />
        ) : (
          <ChevronRight size={17} color="var(--color-text-faint)" strokeWidth={2.2} />
        )}
        <span
          style={{
            flex: 1,
            fontSize: 19,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.01em',
          }}
        >
          {summaryText}
        </span>
        {skillData?.level && (
          <ScoringBadge level={skillData.level as ScoringLevel} you />
        )}
      </button>

      {/* Accordion body */}
      {isOpen && (
        <div className="guide-skill-body" style={{ padding: '0 22px 22px' }}>
          {bodyChildren}

          {/* Product tie-in action strip — TODO: wire to real user score/goal data */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 22,
              padding: '14px 16px',
              background: 'var(--color-accent-wash)',
              border: '1px solid var(--color-accent-border)',
              borderRadius: 12,
            }}
          >
            <Sparkles size={18} color="var(--color-accent)" />
            <span
              style={{
                flex: 1,
                fontSize: 13.5,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {skillData?.level ? (
                <>You scored this <strong style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{skillData.level}</strong></>
              ) : (
                'Explore this skill in the scorecard'
              )}
            </span>
            <a
              href="/scorecard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 34,
                padding: '0 14px',
                background: 'transparent',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent-border)',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              Re-score
            </a>
            <a
              href={skillData?.planId ? `/growth?plan=${skillData.planId}` : '/growth'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 34,
                padding: '0 14px',
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                border: 'none',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              {skillData?.hasGoal ? 'View goal' : 'Set a goal'}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
