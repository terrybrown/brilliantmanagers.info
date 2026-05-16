import Link from 'next/link'
import { ScorecardPreview } from '@/components/tool/scorecard-preview'

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
              A structured self-assessment across the five pillars of the framework.
              Best done with your manager — not in isolation.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-5 py-2.5 text-sm font-semibold"
                style={{ background: '#fefcf7', color: '#1a3a5c' }}
              >
                📊 Open current version (Google Sheets)
              </Link>
              <button
                className="rounded-md border px-5 py-2.5 text-sm font-medium cursor-not-allowed"
                style={{ borderColor: 'rgba(254,252,247,0.14)', color: 'rgba(254,252,247,0.65)', background: 'rgba(254,252,247,0.06)' }}
                disabled
                title="Coming in v2"
              >
                Get notified when the app launches
              </button>
            </div>
          </div>

          {/* Preview card */}
          <ScorecardPreview />
        </div>

        {/* v2 coming strip */}
        <div
          className="mt-16 flex items-center gap-4 rounded-xl px-6 py-4"
          style={{ background: 'rgba(254,252,247,0.04)', border: '1px solid rgba(254,252,247,0.08)' }}
        >
          <span
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: 'rgba(245,158,11,0.35)', color: '#fbbf24', background: 'rgba(245,158,11,0.08)' }}
          >
            Coming in v2
          </span>
          <p className="text-sm" style={{ color: 'rgba(254,252,247,0.40)' }}>
            A native web app — save your scores, track progress over time, and share
            with your manager. No spreadsheet required.
          </p>
        </div>
      </div>
    </div>
  )
}
