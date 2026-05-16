import Link from 'next/link'

interface HeroProps {
  eyebrow: string
  headline: React.ReactNode
  body: string
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export function Hero({ eyebrow, headline, body, primaryCta, secondaryCta }: HeroProps) {
  return (
    <section className="px-6 pb-16 pt-20" style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(254,252,247,0.40)', letterSpacing: '0.2em' }}
      >
        {eyebrow}
      </p>
      <span className="amber-rule" />
      <h1
        className="mb-5 leading-none tracking-tight"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#fefcf7',
        }}
      >
        {headline}
      </h1>
      <p
        className="max-w-lg text-base leading-relaxed"
        style={{ color: 'rgba(254,252,247,0.60)', fontSize: '17px', marginBottom: primaryCta ? '2rem' : '0' }}
      >
        {body}
      </p>
      {(primaryCta || secondaryCta) && (
        <div className="flex flex-wrap gap-3">
          {primaryCta && (
            <Link
              href={primaryCta.href}
              className="rounded-md px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#fefcf7', color: '#1a3a5c' }}
            >
              {primaryCta.label}
            </Link>
          )}
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="rounded-md border px-5 py-2.5 text-sm font-medium"
              style={{ borderColor: 'rgba(254,252,247,0.14)', color: '#fefcf7', background: 'rgba(254,252,247,0.07)' }}
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
