import Link from 'next/link'
import { ExternalLink, Check } from 'lucide-react'
import { ScorecardPreview } from '@/components/tool/scorecard-preview'

export const metadata = { title: 'The Tool' }

const GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1CDalSItIni0PWWcrwXzMG-CAOWzjP-1FYPdRCbswcoo/edit?usp=sharing'

const V2_FEATURES = [
  'Score all six pillars in a guided flow — no spreadsheet skills needed',
  'Track your progress over time and see where you\'ve grown',
  'Share a structured snapshot with your manager — a proper conversation starter',
  'Set specific development goals and revisit them at your next 1:1',
  'Compare pillars to find where to invest next',
]

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

        {/* v2 coming section */}
        <div
          className="mt-16 rounded-xl px-8 py-7"
          style={{ background: 'rgba(254,252,247,0.04)', border: '1px solid rgba(254,252,247,0.10)' }}
        >
          <div className="mb-5 flex items-center gap-3">
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: 'rgba(245,158,11,0.40)', color: '#fbbf24', background: 'rgba(245,158,11,0.10)' }}
            >
              Coming in v2
            </span>
            <p
              className="text-sm font-semibold"
              style={{ color: 'rgba(254,252,247,0.75)', fontFamily: 'var(--font-display)' }}
            >
              A proper app. Not a spreadsheet.
            </p>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {V2_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check
                  size={14}
                  strokeWidth={2.5}
                  style={{ color: '#f59e0b', marginTop: '3px', flexShrink: 0 }}
                />
                <span className="text-sm leading-snug" style={{ color: 'rgba(254,252,247,0.55)' }}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
