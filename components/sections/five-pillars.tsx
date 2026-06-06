const PILLARS = [
  { num: '01', name: 'Self', desc: 'Self-awareness, growth mindset, how you manage your own time and energy.' },
  { num: '02', name: 'Team', desc: 'Coaching, 1:1s, progression, and holding a fair performance bar.' },
  { num: '03', name: 'Strategy', desc: 'Prioritisation and decisions — turning ambiguity into direction.' },
  { num: '04', name: 'Communications', desc: 'Difficult conversations, influence, and being genuinely heard.' },
  { num: '05', name: 'Domain Expertise', desc: "The credibility and quality bar that earns your team's trust." },
]

export function FivePillars() {
  return (
    <section style={{ maxWidth: 'var(--container-width)', margin: '0 auto', padding: '48px 28px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--color-accent)', marginBottom: 10 }}>The framework</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 750,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Five pillars of brilliant management
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {PILLARS.map(p => (
          <div key={p.name} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, padding: 18, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)',
              fontFamily: 'var(--font-display)', marginBottom: 8 }}>{p.num}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)', marginBottom: 6 }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
