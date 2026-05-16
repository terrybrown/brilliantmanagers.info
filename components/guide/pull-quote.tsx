interface GuidePullQuoteProps {
  children: React.ReactNode
  cite?: string
}

export function GuidePullQuote({ children, cite }: GuidePullQuoteProps) {
  return (
    <blockquote className="my-8 border-l-0 pl-0">
      <p
        className="italic leading-snug"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          color: 'var(--color-text-primary)',
        }}
      >
        {children}
      </p>
      {cite && (
        <cite
          className="mt-2 block text-xs not-italic uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)' }}
        >
          — {cite}
        </cite>
      )}
    </blockquote>
  )
}
