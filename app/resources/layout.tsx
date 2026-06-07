import { ResourceTypePills } from '@/components/resources/ResourceTypePills'

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            Resources
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>
            Things I keep coming back to. No affiliate links. No filler.
          </p>
          <ResourceTypePills />
        </header>

        <div style={{ marginTop: 28 }}>{children}</div>
      </div>
    </div>
  )
}
