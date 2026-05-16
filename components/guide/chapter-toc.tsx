'use client'

import { useEffect, useState } from 'react'
import { TocItem } from '@/lib/mdx'

interface ChapterTocProps {
  items: TocItem[]
}

export function ChapterToc({ items }: ChapterTocProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0% -60% 0%', threshold: 0 }
    )

    items.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    // Open accordion if target is a <details> element
    if (el.tagName === 'DETAILS') {
      (el as HTMLDetailsElement).open = true
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(id)
  }

  return (
    <nav className="sticky top-20 w-44 shrink-0 self-start">
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}
      >
        On this page
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const isActive = activeId === item.id
          return (
            <li key={item.id} style={{ paddingLeft: item.level === 3 ? '10px' : '0' }}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className="block text-xs leading-relaxed transition-colors"
                style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  opacity: isActive ? 1 : 0.65,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
