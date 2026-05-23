interface PullQuoteProps {
  quote: string
  attribution: string
}

export function PullQuote({ quote, attribution }: PullQuoteProps) {
  return (
    <section
      className="border-t px-6 py-16"
      style={{ borderColor: 'rgba(254,252,247,0.08)' }}
    >
      <div style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
        <blockquote
          className="italic leading-snug"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            color: 'rgba(254,252,247,0.80)',
            maxWidth: '640px',
          }}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
        <cite
          className="mt-4 block text-xs not-italic uppercase tracking-widest"
          style={{ color: 'rgba(254,252,247,0.35)' }}
        >
          — {attribution}
        </cite>
      </div>
    </section>
  )
}
