import Link from 'next/link'
import { type ReactNode } from 'react'

// Use actual token values (not var() references) so toHaveStyle works in JSDOM
export const CARD_STYLE_DEFAULT = {
  background: '#FFFFFF',                     // --color-surface
  border: '1px solid #E2E7DF',               // --color-border
} as const

export const CARD_STYLE_PRIMARY = {
  background: 'rgba(14,124,107,0.05)',       // --color-accent-wash
  border: '1px solid rgba(14,124,107,0.26)', // --color-accent-border
} as const

interface FeatureCard {
  icon: ReactNode
  title: string
  body: string
  href: string
  linkLabel: string
  primary?: boolean
}

interface FeatureGridProps {
  cards: FeatureCard[]
}

export function FeatureGrid({ cards }: FeatureGridProps) {
  return (
    <section className="px-6 pb-20" style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
      <div className="grid gap-5 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            data-testid={`feature-card-${card.href}`}
            key={card.href}
            className="flex flex-col"
            style={{ ...(card.primary ? CARD_STYLE_PRIMARY : CARD_STYLE_DEFAULT), borderRadius: 18, padding: 28, boxShadow: 'var(--shadow-card)' }}
          >
            <div className="mb-2 flex items-center gap-2">
              {card.icon}
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                {card.title}
              </h2>
            </div>
            <p
              className="mb-4 flex-1 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {card.body}
            </p>
            <div className="flex justify-end">
              <Link
                href={card.href}
                className="text-xs font-semibold"
                style={{ color: 'var(--color-accent)' }}
              >
                {card.linkLabel} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
