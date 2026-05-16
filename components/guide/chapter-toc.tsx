interface TocItem {
  id: string
  text: string
  level: number
}

interface ChapterTocProps {
  items: TocItem[]
}

export function ChapterToc({ items }: ChapterTocProps) {
  if (items.length === 0) return null

  return (
    <nav className="sticky top-20 w-40 shrink-0 self-start">
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}
      >
        On this page
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.level === 3 ? '8px' : '0' }}>
            <a
              href={`#${item.id}`}
              className="block text-xs leading-relaxed transition-colors hover:opacity-100"
              style={{ color: 'var(--color-text-muted)', opacity: 0.65 }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
