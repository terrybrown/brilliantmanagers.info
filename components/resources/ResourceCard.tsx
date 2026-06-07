'use client'

import { BookOpen, FileText, GraduationCap, Play, User, Mic, Wrench, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Resource } from '@/lib/db/resources'

const TYPE_ICONS: Record<Resource['resource_type'], React.ElementType> = {
  book: BookOpen,
  article: FileText,
  course: GraduationCap,
  video: Play,
  person: User,
  podcast: Mic,
  tool: Wrench,
}

interface Props {
  resource: Resource
}

export function ResourceCard({ resource }: Props) {
  const Icon = TYPE_ICONS[resource.resource_type]

  function handleCopyLink() {
    navigator.clipboard.writeText(resource.url).then(() => {
      toast.success('Link copied')
    })
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 2px rgba(40,60,45,.04), 0 2px 5px rgba(40,60,45,.03)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top row: type badge + topic + copy link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--color-chip-bg)',
            color: 'var(--color-text-muted)',
            borderRadius: 4,
            padding: '2px 7px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          <Icon size={11} />
          {resource.resource_type.toUpperCase()}
        </span>
        {resource.topic && (
          <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
            · {resource.topic}
          </span>
        )}
        <button
          onClick={handleCopyLink}
          title="Copy link"
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-faint)',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Link2 size={13} />
        </button>
      </div>

      {/* Title */}
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          textDecoration: 'none',
          marginBottom: 2,
          lineHeight: 1.3,
        }}
      >
        {resource.title}
      </a>

      {/* Subtitle */}
      {resource.subtitle && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 2px', lineHeight: 1.4 }}>
          {resource.subtitle}
        </p>
      )}

      {/* Author */}
      {resource.author && (
        <p style={{ fontSize: 12, color: 'var(--color-accent)', margin: '0 0 10px' }}>
          {resource.author}
        </p>
      )}

      {/* Description */}
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-muted)', margin: 0, flex: 1 }}>
        {resource.description}
      </p>
    </div>
  )
}
