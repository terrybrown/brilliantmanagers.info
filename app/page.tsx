import { Hero } from '@/components/sections/hero'
import { FeatureGrid } from '@/components/sections/feature-grid'
import { RotatingQuote } from '@/components/sections/rotating-quote'
import { GuideBookIcon, GaugeIcon } from '@/components/icons/guide-icons'

export const metadata = {
  title: 'Brilliant Managers — A field guide to management',
}

export default function HomePage() {
  return (
    <div style={{ background: '#1a3a5c' }}>
      <Hero
        eyebrow="A field guide to management"
        headline={
          <>
            Most of us became managers{' '}
            <em style={{ color: '#f59e0b' }}>by accident.</em>
          </>
        }
        body="A framework — not a manual. It won't tell you what to do. It'll help you see where you are."
      />
      <FeatureGrid
        cards={[
          {
            icon: <GaugeIcon size={22} />,
            title: 'The Tool',
            body: 'Know where you actually are — not where you hope you are. Then do something about it.',
            href: '/the-tool',
            linkLabel: 'Open the scorecard',
            primary: true,
          },
          {
            icon: <GuideBookIcon size={22} />,
            title: 'The Guide',
            body: 'Five pillars. Dozens of dimensions. All the things nobody told you when you got the job.',
            href: '/the-guide',
            linkLabel: 'Start reading',
          },
        ]}
      />
      <RotatingQuote />
    </div>
  )
}
