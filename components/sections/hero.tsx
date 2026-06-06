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
    <section style={{ maxWidth: 'var(--container-width)', margin: '0 auto', padding: '72px 28px 56px' }}>
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_400px]">
        {/* Left: text content */}
        <div>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <span style={{ width: 28, height: 2, background: 'var(--color-accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>{eyebrow}</span>
          </div>
          {/* Headline */}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 750, lineHeight: 1.04, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0 }}>
            {headline}
          </h1>
          {/* Body */}
          <p style={{ fontSize: 18, color: 'var(--color-text-muted)', lineHeight: 1.6,
            marginTop: 24, maxWidth: 460, marginBottom: 0 }}>{body}</p>
          {/* CTAs */}
          {(primaryCta || secondaryCta) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 32 }}>
              {primaryCta && (
                <Link href={primaryCta.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                  height: 48, padding: '0 24px', background: 'var(--color-accent)', color: 'var(--color-accent-fg)',
                  borderRadius: 11, fontSize: 15, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {primaryCta.label} →
                </Link>
              )}
              {secondaryCta && (
                <Link href={secondaryCta.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                  height: 48, padding: '0 22px', background: 'transparent', color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)', borderRadius: 11, fontSize: 15, fontWeight: 600,
                  textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', marginTop: 16 }}>
            ~10 minutes · five pillars · no right answers
          </div>
        </div>
        {/* Right: decorative scorecard preview card */}
        <div style={{ position: 'relative' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 20, padding: 24,
            boxShadow: 'var(--shadow-hero-card)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                Your scorecard
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Latest round</span>
            </div>
            {/* Placeholder radar polygon */}
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-bg-base)', borderRadius: 12, marginBottom: 12 }}>
              <svg viewBox="0 0 200 200" width="180" height="180" aria-hidden="true">
                <polygon points="100,20 168,65 143,145 57,145 32,65"
                  fill="var(--color-accent-wash2)" stroke="var(--color-accent)" strokeWidth="1.5" />
                <polygon points="100,44 148,78 131,133 69,133 52,78"
                  fill="var(--color-manager-wash)" stroke="var(--color-manager)" strokeWidth="1" strokeDasharray="4 2" />
                <circle cx="100" cy="100" r="1.5" fill="none" stroke="var(--color-border)" />
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, background: 'var(--color-bg-base)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 26, fontWeight: 750, color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-display)', lineHeight: 1 }}>3.3</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>Overall · Self</div>
              </div>
              <div style={{ flex: 1, background: 'var(--color-bg-base)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 26, fontWeight: 750, color: 'var(--color-manager)',
                  fontFamily: 'var(--font-display)', lineHeight: 1 }}>2.9</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>Manager view</div>
              </div>
            </div>
          </div>
          {/* Focus badge */}
          <div style={{ position: 'absolute', top: -14, right: -12, background: 'var(--color-accent)',
            color: 'var(--color-accent-fg)', fontSize: 12, fontWeight: 700, padding: '7px 13px',
            borderRadius: 10, boxShadow: 'var(--shadow-badge)',
            display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <span aria-hidden="true">🎯</span> Focus: Team
          </div>
        </div>
      </div>
    </section>
  )
}
