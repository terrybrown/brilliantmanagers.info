import Link from 'next/link'

export const metadata = { title: 'Resources' }

interface Resource {
  title: string
  href?: string
  annotation: string
}

interface ResourceSection {
  heading: string
  items: Resource[]
}

const RESOURCES: ResourceSection[] = [
  {
    heading: 'Books worth reading',
    items: [
      {
        title: 'Daring Greatly — Brené Brown',
        href: 'https://www.amazon.com/Daring-Greatly-Courage-Vulnerable-Transforms/dp/1592408419',
        annotation: 'On courage and vulnerability. Helps managers recognise that fallibility is the foundation of authentic leadership, not a liability.',
      },
      {
        title: 'Radical Candor — Kim Scott',
        href: 'https://www.amazon.com/Radical-Candor-Revised-Kick-Ass-Humanity/dp/1250235375',
        annotation: "The framework for giving feedback people can actually receive. Read it before you think you don't need it.",
      },
      {
        title: "The Manager's Path — Camille Fournier",
        href: 'https://www.amazon.com/Managers-Path-Leaders-Navigating-Growth/dp/1491973897',
        annotation: "A practical guide through every stage of engineering management. Rare in that it's honest about the hard parts.",
      },
      {
        title: 'An Elegant Puzzle — Will Larson',
        href: 'https://www.amazon.com/Elegant-Puzzle-Systems-Engineering-Management/dp/1732265186',
        annotation: 'Systems thinking for engineering leaders. The best mental models for scaling teams without losing quality.',
      },
      {
        title: 'The Five Dysfunctions of a Team — Patrick Lencioni',
        href: 'https://www.amazon.com/Five-Dysfunctions-Team-Leadership-Fable/dp/0787960756',
        annotation: 'A leadership fable that addresses trust, conflict, commitment, accountability, and results — in that order.',
      },
      {
        title: 'Turn the Ship Around — David Marquet',
        href: 'https://www.amazon.com/Turn-Ship-Around-Turning-Followers/dp/1591846404',
        annotation: 'How to shift from leader/follower to leader/leader. One of the clearest demonstrations that intent-based leadership actually works.',
      },
      {
        title: 'The Fearless Organisation — Amy C. Edmondson',
        href: 'https://www.amazon.com/Fearless-Organization-Psychological-Workplace-Innovation/dp/1119477247',
        annotation: 'Psychological safety as the foundation for high-performing teams. Research-backed, practical, and increasingly essential.',
      },
      {
        title: 'Emotional Intelligence — Daniel Goleman',
        href: 'https://www.amazon.com/Emotional-Intelligence-Matter-More-Than/dp/055338371X',
        annotation: 'The case for self-awareness and emotional regulation in professional settings. Still the foundational text.',
      },
      {
        title: 'Crucial Conversations — Patterson et al.',
        href: 'https://www.amazon.com/Crucial-Conversations-Talking-Stakes-Second/dp/1469266822',
        annotation: 'How to handle conversations where the stakes are high and emotions run strong. Practical and immediately applicable.',
      },
    ],
  },
  {
    heading: 'Articles worth bookmarking',
    items: [
      {
        title: 'Average manager vs. great manager — Julie Zhuo',
        href: 'https://medium.com/the-year-of-the-looking-glass/average-manager-vs-great-manager-cf8a2e30907d',
        annotation: 'A sharp, visual breakdown of where the real differences lie. Worth returning to every six months.',
      },
      {
        title: 'How to fail as a new engineering manager',
        href: 'https://blog.usejournal.com/how-to-fail-as-a-new-engineering-manager-30b5fb617a',
        annotation: 'Anti-pattern catalogue. Recognising failure modes is often more useful than reading about success.',
      },
      {
        title: 'Things I\'ve learned transitioning from engineer to manager — Gergely Orosz',
        href: 'https://blog.pragmaticengineer.com/things-ive-learned-transitioning-from-engineer-to-engineering-manager/',
        annotation: 'Honest, specific, and grounded in real experience. One of the best transition pieces written.',
      },
      {
        title: 'Developer turned manager — Stack Overflow Blog',
        href: 'https://stackoverflow.blog/2015/08/07/developer-turned-manager/',
        annotation: 'The identity shift that happens when you stop being "the person who builds" and start being "the person who enables."',
      },
      {
        title: 'Engineering managers guide: 30+ resources — TechBeacon',
        href: 'https://techbeacon.com/app-dev-testing/engineering-managers-guide-30-resources-leading-developers',
        annotation: "A solid curated list if you want to go deeper than what's here.",
      },
      {
        title: 'What mistakes does management keep making? — Hacker News thread',
        href: 'https://news.ycombinator.com/item?id=15033156',
        annotation: 'Brutally honest. One of those HN threads where practitioners speak more plainly than any book does.',
      },
    ],
  },
  {
    heading: 'Self-assessment tools',
    items: [
      {
        title: 'Daring Leadership Assessment — Brené Brown',
        href: 'https://daretolead.brenebrown.com/assessment/',
        annotation: 'A useful starting point for understanding your relationship with vulnerability and courage as a leader.',
      },
      {
        title: 'Project Implicit — Harvard',
        href: 'https://implicit.harvard.edu/implicit/takeatest.html',
        annotation: 'Implicit bias testing. Uncomfortable. Worth doing anyway.',
      },
      {
        title: 'Johari Window test',
        href: 'https://kevan.org/johari',
        annotation: 'A quick way to surface the gap between how you see yourself and how others see you. Best done with actual colleagues.',
      },
    ],
  },
  {
    heading: 'People worth following',
    items: [
      {
        title: 'Charity Majors (@mipsytipsy)',
        href: 'https://charity.wtf',
        annotation: 'Honest, opinionated takes on engineering management and observability. One of the few worth following unconditionally.',
      },
      {
        title: 'Lara Hogan',
        href: 'https://larahogan.me',
        annotation: 'Research-backed writing on management, feedback, and leadership. Her resilience questions are worth bookmarking specifically.',
      },
      {
        title: 'Gergely Orosz — The Pragmatic Engineer',
        href: 'https://blog.pragmaticengineer.com',
        annotation: 'Some of the most grounded, data-rich writing on engineering leadership available. His reading list alone is worth the visit.',
      },
      {
        title: 'Will Larson',
        href: 'https://lethain.com',
        annotation: 'Systems thinker. Writes clearly about the unglamorous parts of engineering leadership — the trade-offs, the constraints, the politics.',
      },
    ],
  },
  {
    heading: 'Reading lists',
    items: [
      {
        title: "Gergely Orosz's reading & listening list",
        href: 'https://blog.pragmaticengineer.com/my-reading-list/',
        annotation: "Well-curated and updated regularly. A good place to go when you've read everything on this page.",
      },
      {
        title: 'HBR Reading Lists',
        href: 'https://hbr.org/reading-lists',
        annotation: "Harvard Business Review's topic-based reading lists. Dense but credible.",
      },
      {
        title: '11 must-read books for new managers — Know Your Team',
        href: 'https://knowyourteam.com/blog/2018/10/31/11-must-read-books-for-new-managers/',
        annotation: 'One of the more considered curated lists. Skews practical over theoretical.',
      },
    ],
  },
]

export default function ResourcesPage() {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
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
            Resources
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Things I keep coming back to. No affiliate links. No filler.
          </p>
        </header>

        <div className="grid gap-12 sm:grid-cols-2">
          {RESOURCES.map((section) => (
            <section key={section.heading}>
              <h2
                className="mb-5 pb-2 text-lg font-bold"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-text-primary)',
                  borderBottom: '1px solid var(--color-accent)',
                }}
              >
                {section.heading}
              </h2>
              <ul className="space-y-5">
                {section.items.map((item) => (
                  <li
                    key={item.title}
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-1 block text-sm font-semibold hover:opacity-80"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.title} <span style={{ color: 'var(--color-accent)' }}>↗</span>
                      </Link>
                    ) : (
                      <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {item.title}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                      {item.annotation}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
