import Link from 'next/link'
import { GUIDE_SECTIONS, GUIDE_SECTION_LABELS } from '@/lib/guide'

interface ChapterNavProps {
  activeSlug: string
}

export function ChapterNav({ activeSlug }: ChapterNavProps) {
  return (
    <nav className="sticky top-20 w-52 shrink-0 self-start">
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}
      >
        The Guide
      </p>
      <ul className="space-y-0.5">
        {GUIDE_SECTIONS.map((section) => {
          const isActive = activeSlug === section
          return (
            <li key={section}>
              <Link
                href={`/the-guide/${section}`}
                className="block rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  background: isActive ? '#1a3a5c' : 'transparent',
                  color: isActive ? '#fefcf7' : 'var(--color-text-muted)',
                }}
              >
                {GUIDE_SECTION_LABELS[section]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
