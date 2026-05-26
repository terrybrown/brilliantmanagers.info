import Link from 'next/link'
import { type ReactNode } from 'react'

export const CARD_STYLE_DEFAULT = {
  background: 'rgba(254,252,247,0.05)',
  border: '1px solid rgba(254,252,247,0.10)',
} as const

export const CARD_STYLE_PRIMARY = {
  background: 'rgba(245,158,11,0.07)',
  border: '1px solid rgba(245,158,11,0.30)',
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
            data-testid="feature-card"
            key={card.href}
            className="flex flex-col rounded-xl p-6"
            style={card.primary ? CARD_STYLE_PRIMARY : CARD_STYLE_DEFAULT}
          >
            <div className="mb-2 flex items-center gap-2">
              {card.icon}
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: '#fefcf7' }}
              >
                {card.title}
              </h2>
            </div>
            <p
              className="mb-4 flex-1 text-sm leading-relaxed"
              style={{ color: 'rgba(254,252,247,0.70)' }}
            >
              {card.body}
            </p>
            <div className="flex justify-end">
              <Link
                href={card.href}
                className="text-xs font-semibold"
                style={{ color: '#f59e0b' }}
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
