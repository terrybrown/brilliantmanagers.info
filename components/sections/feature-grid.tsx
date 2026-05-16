import Link from 'next/link'

interface FeatureCard {
  icon: string
  title: string
  body: string
  href: string
  linkLabel: string
}

interface FeatureGridProps {
  cards: FeatureCard[]
}

export function FeatureGrid({ cards }: FeatureGridProps) {
  return (
    <section className="px-6 pb-20" style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
      <div className="grid gap-5 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.href}
            className="rounded-xl p-5"
            style={{
              background: 'rgba(254,252,247,0.05)',
              border: '1px solid rgba(254,252,247,0.10)',
            }}
          >
            <div className="mb-3 text-2xl">{card.icon}</div>
            <h2
              className="mb-2 text-base font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: '#fefcf7' }}
            >
              {card.title}
            </h2>
            <p
              className="mb-4 text-sm leading-relaxed"
              style={{ color: 'rgba(254,252,247,0.50)' }}
            >
              {card.body}
            </p>
            <Link
              href={card.href}
              className="text-xs font-semibold"
              style={{ color: '#f59e0b' }}
            >
              {card.linkLabel} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
