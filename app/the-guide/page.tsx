import Link from 'next/link'
import { GUIDE_SECTIONS, GUIDE_SECTION_LABELS } from '@/lib/guide'

export const metadata = { title: 'The Guide' }

const SECTION_EXCERPTS: Record<string, string> = {
  measurement: 'How to think about progress — in yourself and in others.',
  self: 'Understanding yourself before you can lead anyone else.',
  team: 'Building an environment where people do their best work.',
  strategy: 'Connecting day-to-day work to longer-term direction.',
  communications: 'Saying the right things to the right people at the right time.',
  'domain-expertise': 'Knowing enough to lead without needing to know everything.',
  faq: 'The questions that come up again and again.',
}

const SECTION_ICONS: Record<string, string> = {
  measurement: '📊',
  self: '🧠',
  team: '👥',
  strategy: '🧭',
  communications: '💬',
  'domain-expertise': '⚙️',
  faq: '❓',
}

export default function GuideIndexPage() {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header className="mb-12">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}
          >
            A Field Guide
          </p>
          <span className="amber-rule" />
          <h1
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            The Guide
          </h1>
          <p className="max-w-xl text-base leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Six pillars. The honest truth about what management actually requires.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_SECTIONS.map((section) => (
            <Link
              key={section}
              href={`/the-guide/${section}`}
              className="group flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-md"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-reading)' }}
            >
              <div className="mb-3 text-2xl">{SECTION_ICONS[section]}</div>
              <h2
                className="mb-2 text-base font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                {GUIDE_SECTION_LABELS[section]}
              </h2>
              <p className="mb-4 flex-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {SECTION_EXCERPTS[section]}
              </p>
              <div className="flex justify-end">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                  Start reading →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
