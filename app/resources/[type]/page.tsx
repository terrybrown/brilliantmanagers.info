import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getResourcesByType } from '@/lib/db/resources'
import { TYPE_CONFIG } from '../type-config'

export const revalidate = 86400

export async function generateStaticParams() {
  return TYPE_CONFIG.map(t => ({ type: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>
}): Promise<Metadata> {
  const { type } = await params
  const config = TYPE_CONFIG.find(t => t.slug === type)
  return { title: config?.label ?? 'Resources' }
}

export default async function ResourceTypePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  const config = TYPE_CONFIG.find(t => t.slug === type)
  if (!config) notFound()

  const resources = await getResourcesByType(config.dbType)

  return (
    <div>
      <h2
        className="mb-6 pb-2 text-lg font-bold"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
          borderBottom: '1px solid var(--color-accent)',
        }}
      >
        {config.label}
      </h2>

      {resources.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          No resources of this type yet.
        </p>
      ) : (
        <ul className="space-y-6">
          {resources.map(item => (
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
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
