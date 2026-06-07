'use client'

import type { FaqSection } from '@/lib/faq'

interface Props {
  sections: FaqSection[]
}

export function FaqSidebarNav({ sections }: Props) {
  return (
    <>
      <style>{`
        .faq-sidebar-link {
          display: block;
          padding: 5px 10px;
          font-size: 13.5px;
          color: var(--color-text-muted);
          text-decoration: none;
          border-left: 3px solid transparent;
          border-radius: 0 4px 4px 0;
          transition: border-color 0.1s, color 0.1s;
        }
        .faq-sidebar-link:hover {
          border-left-color: var(--color-accent);
          color: var(--color-text-primary);
        }
      `}</style>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sections.map(section => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="faq-sidebar-link"
          >
            {section.label}
          </a>
        ))}
      </nav>
    </>
  )
}
