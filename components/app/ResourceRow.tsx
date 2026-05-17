'use client'

import { Plus, BookmarkCheck } from 'lucide-react'
import type { Resource } from '@/lib/db/resources'

const TYPE_COLORS: Record<Resource['resource_type'], string> = {
  book: '#6366f1',
  article: '#14b8a6',
  course: '#14b8a6',
  video: '#ef4444',
  person: '#f59e0b',
  podcast: '#a855f7',
  tool: '#64748b',
}

interface ResourceRowProps {
  resource: Resource
  added: boolean
  onToggle: (resourceId: string) => void
}

export function ResourceRow({ resource, added, onToggle }: ResourceRowProps) {
  const color = TYPE_COLORS[resource.resource_type]

  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors"
      style={added ? { border: '1px solid #f59e0b33', background: '#1c1a0f' } : { border: '1px solid transparent' }}
    >
      <span
        className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold uppercase"
        style={{ background: `${color}25`, color }}
      >
        {resource.resource_type}
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-white hover:text-amber-300"
        >
          {resource.title}
          {resource.author && <span className="font-normal text-slate-400"> — {resource.author}</span>}
        </a>
        <p className="mt-0.5 text-xs text-slate-500">{resource.description}</p>
      </div>
      <button
        onClick={() => onToggle(resource.id)}
        className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
        style={
          added
            ? { background: '#f59e0b20', color: '#f59e0b' }
            : { background: '#4f46e520', color: '#818cf8' }
        }
        title={added ? 'Remove' : 'Add'}
      >
        {added ? (
          <>
            <BookmarkCheck size={12} strokeWidth={1.75} />
            Added
          </>
        ) : (
          <>
            <Plus size={12} strokeWidth={1.75} />
            Add
          </>
        )}
      </button>
    </div>
  )
}
