import { Hero } from '@/components/sections/hero'
import { FeatureGrid } from '@/components/sections/feature-grid'
import { FivePillars } from '@/components/sections/five-pillars'
import { RotatingQuote } from '@/components/sections/rotating-quote'
import { Target, BookOpen } from 'lucide-react'

export const metadata = {
  title: 'Brilliant Managers — A field guide to management',
}

export default function HomePage() {
  return (
    <>
      <Hero
        eyebrow="A field guide to management"
        headline={
          <>
            Most of us became managers{' '}
            <em style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>by accident.</em>
          </>
        }
        body="A framework — not a manual. It won't tell you what to do. It'll help you see where you are."
        primaryCta={{ label: 'Open the scorecard', href: '/scorecard' }}
        secondaryCta={{ label: 'Read the guide', href: '/the-guide' }}
      />
      {/* Card titles use short descriptive names; nav uses action-oriented CTAs */}
      <FeatureGrid
        cards={[
          {
            icon: <Target size={22} strokeWidth={2} style={{ color: 'var(--color-accent-fg)' }} />,
            title: 'The Tool',
            body: 'Know where you actually are — not where you hope you are. Then do something about it.',
            href: '/the-tool',
            linkLabel: 'Open the scorecard',
            primary: true,
          },
          {
            icon: <BookOpen size={22} strokeWidth={2} style={{ color: 'var(--color-accent-fg)' }} />,
            title: 'The Guide',
            body: 'Five pillars. Dozens of dimensions. All the things nobody told you when you got the job.',
            href: '/the-guide',
            linkLabel: 'Start reading',
          },
        ]}
      />
      <FivePillars />
      <RotatingQuote />
    </>
  )
}
