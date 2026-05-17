import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { ScorecardPreview } from '@/components/tool/scorecard-preview'
import { BetaSignupForm } from '@/components/tool/BetaSignupForm'

export const metadata = { title: 'The Tool' }

const GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1CDalSItIni0PWWcrwXzMG-CAOWzjP-1FYPdRCbswcoo/edit?usp=sharing'

export default function ToolPage() {
  return (
    <div className="dark" style={{ background: '#1a3a5c', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-20"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          {/* Copy */}
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
              className="mb-8 text-base leading-relaxed"
              style={{ color: 'rgba(254,252,247,0.58)', maxWidth: '420px' }}
            >
              Most managers are flying blind on their own development. This scorecard
              makes the invisible visible — and gives you and your manager a shared
              language for what to work on next.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#fefcf7', color: '#1a3a5c' }}
              >
                Try it now
                <ExternalLink size={14} strokeWidth={2} />
              </Link>
              <span
                className="inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium"
                style={{ borderColor: 'rgba(254,252,247,0.14)', color: 'rgba(254,252,247,0.40)', background: 'rgba(254,252,247,0.04)' }}
              >
                Uses Google Sheets — v2 coming soon
              </span>
            </div>
          </div>

          {/* Preview card */}
          <ScorecardPreview />
        </div>

        {/* Beta sign-up section */}
        <div
          id="beta-signup"
          className="mt-16 rounded-xl px-8 py-11 text-center"
          style={{
            background: 'rgba(254,252,247,0.04)',
            border: '1px solid rgba(245,158,11,0.30)',
            borderTop: '3px solid #f59e0b',
          }}
        >
          <span
            className="mb-5 inline-block rounded-full border px-3.5 py-1 text-xs font-bold uppercase tracking-widest"
            style={{
              borderColor: 'rgba(245,158,11,0.35)',
              color: '#fbbf24',
              background: 'rgba(245,158,11,0.12)',
              letterSpacing: '0.14em',
            }}
          >
            Beta — Free to join
          </span>
          <h2
            className="mb-3 text-3xl font-extrabold leading-tight"
            style={{ color: '#fefcf7', letterSpacing: '-0.025em' }}
          >
            Stop flying blind on your own development.
          </h2>
          <p
            className="mx-auto mb-8 text-base leading-relaxed"
            style={{ color: 'rgba(254,252,247,0.58)', maxWidth: '520px' }}
          >
            Most managers wait until their performance review to find out where they
            stand. Brilliant Managers changes that — score yourself across six pillars,
            get clear insights into where you&apos;re strong and where to improve, and
            leave every session with practical steps you can act on straight away.
          </p>
          <BetaSignupForm />
          <p className="mt-3 text-xs" style={{ color: 'rgba(254,252,247,0.25)' }}>
            No password. Click the link in your email and you&apos;re in.
          </p>
        </div>
      </div>
    </div>
  )
}
