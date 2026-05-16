interface CalloutProps {
  children: React.ReactNode
  type?: 'tip' | 'warning'
}

export function Callout({ children, type = 'tip' }: CalloutProps) {
  return (
    <div
      className="my-6 rounded-r-lg py-3 pl-4 pr-4 text-sm leading-relaxed"
      style={{
        borderLeft: `3px solid ${type === 'warning' ? '#ef4444' : 'var(--color-accent)'}`,
        background: type === 'warning' ? 'rgba(239,68,68,0.05)' : 'rgba(217,119,6,0.05)',
        color: 'var(--color-text-muted)',
      }}
    >
      {children}
    </div>
  )
}
