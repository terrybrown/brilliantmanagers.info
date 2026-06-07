import { FAQ_SECTIONS } from '@/lib/faq'
import { FaqAccordion } from '@/components/faq/FaqAccordion'
import { FaqSidebarNav } from '@/components/faq/FaqSidebarNav'
import Link from 'next/link'

export const metadata = { title: 'FAQs' }

export default function FaqPage() {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        {/* Page header */}
        <header style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              marginBottom: 6,
            }}
          >
            FAQs
          </h1>
          <span
            style={{
              display: 'block',
              width: 48,
              height: 4,
              background: 'var(--color-accent)',
              borderRadius: 2,
              marginBottom: 14,
            }}
          />
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, maxWidth: 560 }}>
            The questions managers ask most, before and after they start. Can&apos;t find yours?{' '}
            <a
              href="https://www.linkedin.com/in/terrybrownuk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
            >
              Send it our way.
            </a>
          </p>
        </header>

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
          {/* Main accordion */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <FaqAccordion sections={FAQ_SECTIONS} />
          </div>

          {/* Sticky right sidebar — hidden on mobile */}
          <aside
            className="hidden lg:block"
            style={{ width: 256, flexShrink: 0, position: 'sticky', top: 80 }}
          >
            {/* On this page */}
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-faint)',
                  marginBottom: 10,
                }}
              >
                On this page
              </p>
              <FaqSidebarNav sections={FAQ_SECTIONS} />
            </div>

            {/* Still stuck? card */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 1px 2px rgba(40,60,45,.04), 0 2px 5px rgba(40,60,45,.03)',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                Still stuck?
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                We answer every question that comes in.
              </p>
              <Link
                href="https://www.linkedin.com/in/terrybrownuk"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
              >
                Ask a question →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
