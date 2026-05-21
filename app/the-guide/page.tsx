import Link from 'next/link'
import { GUIDE_SECTIONS, GUIDE_SECTION_LABELS } from '@/lib/guide'
import { GuideIcon } from '@/components/icons/guide-icons'

export const metadata = { title: 'The Guide' }

const SECTION_EXCERPTS: Record<string, string> = {
  self: 'Understanding yourself before you can lead anyone else.',
  team: 'Building an environment where people do their best work.',
  strategy: 'Connecting day-to-day work to longer-term direction.',
  communications: 'Saying the right things to the right people at the right time.',
  'domain-expertise': 'Knowing enough to lead without needing to know everything.',
}

export default function GuideIndexPage() {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-20"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header className="mb-12">
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
            Five pillars. The honest truth about what management actually requires.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_SECTIONS.map((section) => (
            <Link
              key={section}
              href={`/the-guide/${section}`}
              className="group flex flex-col rounded-xl border p-5 transition-all hover:shadow-md hover:border-[var(--color-accent)]"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-reading)', transition: 'box-shadow 0.15s, border-color 0.15s' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <GuideIcon section={section} size={20} />
                <h2
                  className="text-base font-semibold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
                >
                  {GUIDE_SECTION_LABELS[section]}
                </h2>
              </div>
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
