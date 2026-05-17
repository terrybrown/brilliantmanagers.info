import { TYPE_CONFIG } from './type-config'
import { ResourceNavItem } from '@/components/resources/ResourceNavItem'

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header className="mb-10">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            Resources
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Things I keep coming back to. No affiliate links. No filler.
          </p>
        </header>

        {/* Mobile: horizontal scrollable tab strip */}
        <nav
          className="mb-8 flex gap-1 overflow-x-auto md:hidden"
          aria-label="Resource types"
        >
          {TYPE_CONFIG.map(t => (
            <ResourceNavItem
              key={t.slug}
              href={`/resources/${t.slug}`}
              label={t.label}
              tab
            />
          ))}
        </nav>

        {/* Desktop: side nav + main content */}
        <div className="flex gap-10">
          <nav
            className="hidden w-44 flex-shrink-0 md:block"
            aria-label="Resource types"
          >
            <div className="flex flex-col gap-0.5">
              {TYPE_CONFIG.map(t => (
                <ResourceNavItem
                  key={t.slug}
                  href={`/resources/${t.slug}`}
                  label={t.label}
                />
              ))}
            </div>
          </nav>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
