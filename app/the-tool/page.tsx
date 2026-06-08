import Image from 'next/image'
import {
  Check,
  LayoutDashboard,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { JoinNowForm } from './JoinNowForm'
import { HeroPreviewCard } from './HeroPreviewCard'

export const metadata = { title: 'The Tool' }

const GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1CDalSItIni0PWWcrwXzMG-CAOWzjP-1FYPdRCbswcoo/edit?usp=sharing'

interface Feature {
  id: string
  icon: LucideIcon
  tag: string
  heading: string
  body: string
  bullets: string[]
  screenshot: { src: string; alt: string }
  imageRight: boolean
}

const FEATURES: Feature[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    tag: 'Dashboard',
    heading: 'See all five pillars at a glance',
    body: "Your dashboard gives you the full picture — a radar across every pillar, individual scores, and a score history so you can see how far you've come.",
    bullets: [
      'Five pillars: Self, Team, Strategy, Communications, Domain Expertise',
      'Radar chart shows strengths and gaps instantly',
      'Score history tracks your progress round by round',
    ],
    screenshot: { src: '/screenshots/dashboard.png', alt: 'Dashboard showing pillar scores, radar chart and score history' },
    imageRight: true,
  },
  {
    id: 'growth',
    icon: Target,
    tag: 'Growth Goals',
    heading: 'Leave every session with a clear next step',
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
    id: 'team-org',
    icon: Users,
    tag: 'Team & Org',
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

const TRUST_ITEMS = ['Free — takes 10 minutes', 'No password needed', 'Magic-link sign-in']

function BrowserShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 24px 50px rgba(40,60,45,0.13), 0 4px 10px rgba(40,60,45,0.05)',
      }}
    >
      {/* Browser chrome bar */}
      <div
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 14px',
          background: 'var(--color-bg-base)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E2685A', display: 'inline-block' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ECB85C', display: 'inline-block' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#5BB97C', display: 'inline-block' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 22,
              padding: '0 12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--color-text-faint)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Check size={10} style={{ color: 'var(--color-positive)' }} />
            app.brilliantmanagers.info
          </div>
        </div>
      </div>
      {/* Screenshot — 7:5 left-anchored crop */}
      <div style={{ aspectRatio: '7 / 5', overflow: 'hidden' }}>
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={750}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'left center',
          }}
        />
      </div>
    </div>
  )
}

export default function ToolPage() {
  return (
    <div style={{ background: 'var(--color-bg-base)' }}>

      {/* ── Hero ── */}
      <div style={{ background: 'var(--color-nav-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <div
          className="mx-auto grid gap-14 px-6 py-16 md:grid-cols-[1fr_460px] md:items-center"
          style={{ maxWidth: 'var(--container-width)' }}
        >
          {/* Left — copy */}
          <div>
            {/* Eyebrow pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                padding: '6px 13px',
                borderRadius: 20,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                marginBottom: 22,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <span
                style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }}
              />
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                The Manager Scorecard
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Score yourself.
              <br />
              <em style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>
                Know where to grow.
              </em>
            </h1>

            {/* Subcopy */}
            <p
              style={{
                fontSize: 18,
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.6,
                marginTop: 22,
                maxWidth: 460,
              }}
            >
              Most managers are flying blind on their own development. This scorecard
              makes the invisible visible — and gives you and your manager a shared
              language for what to work on next.
            </p>

            {/* Inline form + trust row */}
            <div style={{ marginTop: 28 }}>
              <JoinNowForm />
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-2"
                style={{ marginTop: 14 }}
              >
                {TRUST_ITEMS.map(item => (
                  <span
                    key={item}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <Check size={14} style={{ color: 'var(--color-positive)', flexShrink: 0 }} />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — product preview */}
          <HeroPreviewCard />
        </div>
      </div>

      {/* ── Offline fallback strip ── */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-6 py-3.5 text-sm"
        style={{
          background: 'var(--color-nav-bg)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span style={{ color: 'var(--color-text-muted)' }}>Prefer to reflect offline?</span>
        <a
          href={GOOGLE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}
          className="hover:underline"
        >
          Use the self-reflection spreadsheet instead →
        </a>
      </div>

      {/* ── Features ── */}
      <div
        className="mx-auto px-6 pb-24 pt-20"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        {/* Section header */}
        <div className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-bold uppercase"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.16em' }}
          >
            What you get
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--color-text-primary)',
              margin: 0,
              lineHeight: 1.12,
            }}
          >
            Stop waiting for your annual review
            <br className="hidden sm:block" />
            {' '}to find out where you stand.
          </h2>
          <p
            className="mx-auto mt-3.5 text-base leading-relaxed"
            style={{ color: 'var(--color-text-muted)', maxWidth: 520 }}
          >
            Score yourself, set goals, and share it with your manager — all in one place.
          </p>
        </div>

        {/* Alternating feature rows */}
        <div className="flex flex-col gap-16">
          {FEATURES.map(feature => {
            const FeatureIcon = feature.icon

            const textPanel = (
              <div>
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
                  style={{
                    background: 'var(--color-accent-wash2)',
                    border: '1px solid var(--color-accent-border)',
                  }}
                >
                  <FeatureIcon size={14} style={{ color: 'var(--color-accent)' }} />
                  <span
                    className="text-xs font-bold uppercase"
                    style={{ color: 'var(--color-accent)', letterSpacing: '0.06em' }}
                  >
                    {feature.tag}
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    lineHeight: 1.18,
                  }}
                >
                  {feature.heading}
                </h3>
                <p
                  className="mt-3 text-base leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {feature.body}
                </p>
                <ul className="mt-5 flex flex-col gap-3" style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
                  {feature.bullets.map(bullet => (
                    <li key={bullet} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: 'var(--color-accent-wash2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <Check size={13} style={{ color: 'var(--color-accent)' }} />
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          color: 'var(--color-text-muted)',
                          fontFamily: 'var(--font-body)',
                          lineHeight: 1.5,
                        }}
                      >
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )

            const imagePanel = (
              <BrowserShot src={feature.screenshot.src} alt={feature.screenshot.alt} />
            )

            return (
              <div key={feature.id} className="grid items-center gap-12 md:grid-cols-2">
                {feature.imageRight ? textPanel : imagePanel}
                {feature.imageRight ? imagePanel : textPanel}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Closing CTA band ── */}
      <div className="mx-auto px-6 pb-16" style={{ maxWidth: 'var(--container-width)' }}>
        <div
          className="rounded-2xl px-10 py-14"
          style={{ background: 'var(--color-accent)' }}
        >
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            {/* Left — headline + copy */}
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 800,
                  color: 'var(--color-accent-fg)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                Find out where you stand — today.
              </h2>
              <p
                className="mt-2.5 text-base leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 440 }}
              >
                Ten honest minutes is all it takes to turn a vague sense of &ldquo;am I
                doing OK?&rdquo; into a clear plan.
              </p>
            </div>

            {/* Right — inset white card */}
            <div
              className="rounded-2xl p-7"
              style={{
                background: 'var(--color-surface)',
                width: 420,
                boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.01em',
                  marginBottom: 4,
                }}
              >
                Start for free
              </div>
              <div
                className="mb-4 text-sm"
                style={{ color: 'var(--color-text-faint)' }}
              >
                We&apos;ll send you a magic link — no password.
              </div>
              <JoinNowForm showSignIn />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
