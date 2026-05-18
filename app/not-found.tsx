import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center"
      style={{ background: '#1a3a5c' }}
    >
      <p
        className="mb-4 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(254,252,247,0.38)', letterSpacing: '0.2em' }}
      >
        404
      </p>
      <span className="amber-rule mx-auto" />
      <h1
        className="mb-4 italic"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 600,
          color: '#fefcf7',
          letterSpacing: '-0.02em',
        }}
      >
        You&apos;ve gone off-piste.
      </h1>
      <p className="mb-8 text-base" style={{ color: 'rgba(254,252,247,0.55)' }}>
        This page doesn&apos;t exist — but the guide does.
      </p>
      <Link
        href="/the-guide"
        className="rounded-md px-5 py-2.5 text-sm font-semibold"
        style={{ background: '#fefcf7', color: '#1a3a5c' }}
      >
        Back to The Guide →
      </Link>
    </div>
  )
}
