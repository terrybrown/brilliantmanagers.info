import Image from 'next/image'
import { JoinNowForm } from './JoinNowForm'

export const metadata = { title: 'The Tool' }

const GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1CDalSItIni0PWWcrwXzMG-CAOWzjP-1FYPdRCbswcoo/edit?usp=sharing'

interface Feature {
  tag: string
  heading: string
  body: string
  bullets: string[]
  screenshot: { src: string; alt: string }
  imageRight: boolean
}

const FEATURES: Feature[] = [
  {
    tag: '📊 Dashboard',
    heading: 'See all five pillars at a glance',
    body: 'Your dashboard gives you the full picture — a radar across every pillar, individual scores, and a score history so you can see how far you\'ve come.',
    bullets: [
      'Five pillars: Self, Team, Strategy, Communications, Domain Expertise',
      'Radar chart shows strengths and gaps instantly',
      'Score history tracks your progress round by round',
    ],
    screenshot: { src: '/screenshots/dashboard.png', alt: 'Dashboard showing pillar scores, radar chart and score history' },
    imageRight: true,
  },
  {
    tag: '🌱 Growth Goals',
    heading: 'Set goals and leave every session with a clear next step',
    body: 'Turn your lowest-scoring skills into focused goals. Each goal comes with a suggested action so you always know what to do next — no vague intentions.',
    bullets: [
      'Set goals against specific skills, not just pillars',
      'Top Opportunities surfaces your lowest-rated skills automatically',
      'Check in on goals to track progress over time',
    ],
    screenshot: { src: '/screenshots/growth.png', alt: 'Growth page showing active goals and top opportunities' },
    imageRight: false,
  },
  {
    tag: '🤝 Team & Org',
    heading: 'Connect with your manager and map your team',
    body: 'Invite your manager to connect — they score you independently, then you compare. Add your direct reports and build out your org structure so everyone has the full picture.',
    bullets: [
      'Manager scores you independently, then you compare side by side',
      'Invite direct reports to start their own scorecard',
      'Org chart gives your whole team a shared structure',
    ],
    screenshot: { src: '/screenshots/team-org.png', alt: 'Team & Org page showing connections and organisation chart' },
    imageRight: true,
  },
]

export default function ToolPage() {
  return (
    <div style={{ background: '#1a3a5c', minHeight: '100vh' }}>

      {/* Hero */}
      <div
        className="mx-auto grid gap-12 px-6 pb-16 pt-16 md:grid-cols-2 md:items-center"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        {/* Left — copy */}
        <div>
          <p
            className="mb-3 text-xs font-semibold uppercase"
            style={{ color: 'rgba(254,252,247,0.38)', letterSpacing: '0.2em' }}
          >
            The Manager Scorecard
          </p>
          <span className="amber-rule" />
          <h1
            className="mb-4 leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 2.75rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#fefcf7',
            }}
          >
            Score yourself.{' '}
            <em style={{ color: '#f59e0b' }}>Know where to grow.</em>
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: 'rgba(254,252,247,0.58)', maxWidth: '420px' }}
          >
            Most managers are flying blind on their own development. This scorecard
            makes the invisible visible — and gives you and your manager a shared
            language for what to work on next.
          </p>
        </div>

        {/* Right — Join now card */}
        <div
          className="rounded-xl p-6"
          style={{
            background: 'rgba(254,252,247,0.04)',
            border: '1px solid rgba(245,158,11,0.30)',
            borderTop: '3px solid #f59e0b',
          }}
        >
          <p
            className="mb-1 text-base font-semibold"
            style={{ color: '#fefcf7' }}
          >
            Start for free — takes 10 minutes
          </p>
          <p
            className="mb-5 text-sm"
            style={{ color: 'rgba(254,252,247,0.45)' }}
          >
            No password needed. We&apos;ll send you a magic link.
          </p>
          <JoinNowForm />
        </div>
      </div>

      {/* Offline fallback strip */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-6 py-3.5 text-sm"
        style={{
          background: '#19375a',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span style={{ color: 'rgba(254,252,247,0.4)' }}>Prefer to reflect offline?</span>
        <a
          href={GOOGLE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#f59e0b' }}
          className="hover:underline"
        >
          Use the self-reflection spreadsheet instead →
        </a>
      </div>

      {/* Features */}
      <div
        className="mx-auto px-6 pb-24 pt-20"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        {/* Section header */}
        <div className="mb-16 text-center">
          <p
            className="mb-3 text-xs font-semibold uppercase"
            style={{ color: 'rgba(254,252,247,0.35)', letterSpacing: '0.18em' }}
          >
            What you get
          </p>
          <h2
            className="mb-3 leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#fefcf7',
            }}
          >
            Stop waiting for your annual review<br className="hidden sm:block" />
            {' '}to find out where you stand.
          </h2>
          <p
            className="mx-auto text-base leading-relaxed"
            style={{ color: 'rgba(254,252,247,0.5)', maxWidth: '500px' }}
          >
            Score yourself, set goals, and share it with your manager — all in one place.
          </p>
        </div>

        {/* Alternating feature rows */}
        <div className="flex flex-col gap-20">
          {FEATURES.map((feature) => {
            const textPanel = (
              <div>
                <span
                  className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    color: '#fbbf24',
                    letterSpacing: '0.12em',
                  }}
                >
                  {feature.tag}
                </span>
                <h3
                  className="mb-3 leading-snug"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: '#fefcf7',
                  }}
                >
                  {feature.heading}
                </h3>
                <p
                  className="mb-5 text-sm leading-relaxed"
                  style={{ color: 'rgba(254,252,247,0.5)' }}
                >
                  {feature.body}
                </p>
                <ul className="flex flex-col gap-2">
                  {feature.bullets.map(bullet => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: 'rgba(254,252,247,0.5)' }}
                    >
                      <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }}>→</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )

            const imagePanel = (
              <div
                className="overflow-hidden rounded-xl shadow-2xl"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Image
                  src={feature.screenshot.src}
                  alt={feature.screenshot.alt}
                  width={1200}
                  height={750}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            )

            return (
              <div key={feature.tag} className="grid items-center gap-12 md:grid-cols-2">
                {feature.imageRight ? textPanel : imagePanel}
                {feature.imageRight ? imagePanel : textPanel}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
