export const metadata = { title: 'Resources' }

const RESOURCES = {
  Books: [
    {
      title: 'An Elegant Puzzle — Will Larson',
      annotation:
        "Systems thinking for engineering leaders. The best mental models I've found for scaling teams without losing quality.",
    },
    {
      title: "The Manager's Path — Camille Fournier",
      annotation:
        "A practical guide through every stage of the engineering management career. Rare in that it's honest about the hard parts.",
    },
    {
      title: 'Radical Candor — Kim Scott',
      annotation:
        "The framework for giving feedback that people can actually receive. Read it before you think you don't need it.",
    },
  ],
  Articles: [
    {
      title: 'Give Away Your Legos — Molly Graham',
      annotation:
        'The definitive piece on letting go of work as your team grows. Required reading for anyone moving into leadership.',
    },
    {
      title: 'Staff Engineer Archetypes — Will Larson',
      annotation:
        'Useful not just for staff engineers but for managers thinking about how to develop senior ICs.',
    },
  ],
  People: [
    {
      title: 'Charity Majors (@mipsytipsy)',
      annotation:
        'Honest, opinionated takes on engineering management and observability. One of the few people worth following unconditionally.',
    },
    {
      title: 'Lara Hogan',
      annotation:
        'Research-backed writing on management, feedback, and leadership. Her resilience questions are worth bookmarking.',
    },
  ],
}

export default function ResourcesPage() {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--prose-width)' }}
      >
        <header className="mb-12">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}
          >
            Curated
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
            Resources
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Things I keep coming back to. No affiliate links. No filler.
          </p>
        </header>

        {Object.entries(RESOURCES).map(([category, items]) => (
          <section key={category} className="mb-12">
            <h2
              className="mb-5 text-sm font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
            >
              {category}
            </h2>
            <ul className="space-y-5">
              {items.map((item) => (
                <li
                  key={item.title}
                  className="border-l-2 pl-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p
                    className="mb-1 text-sm font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {item.annotation}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
