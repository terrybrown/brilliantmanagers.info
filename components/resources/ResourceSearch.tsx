'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { ResourceCard } from './ResourceCard'
import type { Resource } from '@/lib/db/resources'

interface Props {
  resources: Resource[]
}

export function ResourceSearch({ resources }: Props) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? resources.filter(r => {
        const q = query.toLowerCase()
        return (
          r.title.toLowerCase().includes(q) ||
          (r.subtitle ?? '').toLowerCase().includes(q) ||
          (r.author ?? '').toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        )
      })
    : resources

  return (
    <div>
      {/* Search bar */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 12px',
            width: 220,
          }}
        >
          <Search size={13} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search resources"
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          No resources match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  )
}
