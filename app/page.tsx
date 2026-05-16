import { Hero } from '@/components/sections/hero'
import { FeatureGrid } from '@/components/sections/feature-grid'
import { PullQuote } from '@/components/sections/pull-quote'

export const metadata = {
  title: 'Brilliant Managers — A field guide to management',
}

export default function HomePage() {
  return (
    // div.dark forces dark-mode token values on this page regardless of user's theme
    <div className="dark" style={{ background: '#1a3a5c' }}>
      <Hero
        eyebrow="A field guide to management"
        headline={
          <>
            Most of us became managers{' '}
            <em style={{ color: '#f59e0b' }}>by accident.</em>
          </>
        }
        body="A framework for doing it on purpose — whether you're stepping into the role, a few years in, or two decades deep and still figuring it out."
        primaryCta={{ label: 'Read The Guide →', href: '/the-guide' }}
        secondaryCta={{ label: 'Try The Tool', href: '/the-tool' }}
      />
      <FeatureGrid
        cards={[
          {
            icon: '📖',
            title: 'The Guide',
            body: 'A structured framework across Self, Team, Strategy, Communications, and Domain Expertise.',
            href: '/the-guide',
            linkLabel: 'Start reading',
          },
          {
            icon: '🎯',
            title: 'The Tool',
            body: 'Score yourself against the framework. Understand your strengths and your growth edges.',
            href: '/the-tool',
            linkLabel: 'Open the scorecard',
          },
          {
            icon: '✍️',
            title: 'The Blog',
            body: 'Posts on management — the messy parts, the surprising parts, and the stuff no one tells you upfront.',
            href: '/blog',
            linkLabel: 'View posts',
          },
        ]}
      />
      <PullQuote
        quote="Management is the job of creating conditions where other people can do their best work. Everything else is administration."
        attribution="Brilliant Managers"
      />
    </div>
  )
}
