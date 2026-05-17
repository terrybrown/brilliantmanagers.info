import Link from 'next/link'
import { getAllResources } from '@/lib/db/resources'
import type { Resource } from '@/lib/db/resources'

export const metadata = { title: 'Resources' }

const TYPE_HEADINGS: Record<Resource['resource_type'], string> = {
  book: 'Books',
  article: 'Articles',
  course: 'Courses',
  video: 'Videos',
  person: 'People worth following',
  podcast: 'Podcasts',
  tool: 'Tools & assessments',
}

export default async function ResourcesPage() {
  const resources = await getAllResources()

  const byType = resources.reduce<Record<string, Resource[]>>((acc, r) => {
    ;(acc[r.resource_type] ??= []).push(r)
    return acc
  }, {})

  const orderedTypes: Resource['resource_type'][] = [
    'book', 'article', 'course', 'video', 'person', 'podcast', 'tool',
  ]

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

        {resources.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Resources are being added — check back soon.
          </p>
        ) : (
          <div className="grid gap-12 sm:grid-cols-2">
            {orderedTypes.filter(t => byType[t]?.length).map(type => (
              <section key={type}>
                <h2
                  className="mb-5 pb-2 text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-text-primary)',
                    borderBottom: '1px solid var(--color-accent)',
                  }}
                >
                  {TYPE_HEADINGS[type]}
                </h2>
                <ul className="space-y-5">
                  {byType[type].map(item => (
                    <li key={item.id}>
                      <Link
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-1 block text-sm font-semibold hover:opacity-80"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.title}
                        {item.author && ` — ${item.author}`}{' '}
                        <span style={{ color: 'var(--color-accent)' }}>↗</span>
                      </Link>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {item.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
