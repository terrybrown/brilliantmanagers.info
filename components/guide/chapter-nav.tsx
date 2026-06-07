'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { GUIDE_SECTIONS, GUIDE_SECTION_LABELS, GUIDE_SECTION_ORDINALS } from '@/lib/guide'
import type { SkillItem } from '@/lib/mdx'

interface ChapterNavProps {
  activeSlug: string
  skills: SkillItem[]
}

export function ChapterNav({ activeSlug, skills }: ChapterNavProps) {
  const [activeSkillId, setActiveSkillId] = useState<string>('')

  useEffect(() => {
    if (!skills.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSkillId(entry.target.id)
        }
      },
      { rootMargin: '-80px 0% -60% 0%', threshold: 0 }
    )
    for (const { id } of skills) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [skills])

  return (
    <nav
      className="sticky self-start"
      style={{ top: 80, width: 244 }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-text-faint)',
          fontFamily: 'var(--font-body)',
          marginBottom: 12,
        }}
      >
        The Guide
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {GUIDE_SECTIONS.map((section) => {
          const isActive = activeSlug === section
          const ordinal = String(GUIDE_SECTION_ORDINALS[section]).padStart(2, '0')
          return (
            <div key={section}>
              <Link
                href={`/the-guide/${section}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px 11px',
                  borderRadius: 9,
                  textDecoration: 'none',
                  background: isActive ? 'var(--color-accent-wash2)' : 'transparent',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 7,
                      bottom: 7,
                      width: 3,
                      borderRadius: 3,
                      background: 'var(--color-accent)',
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-faint)',
                    fontFamily: 'var(--font-body)',
                    width: 18,
                    flexShrink: 0,
                  }}
                >
                  {ordinal}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13.5,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {GUIDE_SECTION_LABELS[section]}
                </span>
                {isActive && skills.length > 0 && (
                  <ChevronRight size={14} color="var(--color-accent)" />
                )}
              </Link>

              {isActive && skills.length > 0 && (
                <div
                  style={{
                    margin: '3px 0 6px 27px',
                    paddingLeft: 12,
                    borderLeft: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  {skills.map((skill) => {
                    const isSkillActive = activeSkillId === skill.id
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(skill.id)
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '5px 6px',
                          borderRadius: 7,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        {/* TODO: replace background with SCORING_LEVEL_COLORS[skill.level].color once score data is wired */}
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isSkillActive
                              ? 'var(--color-accent)'
                              : 'var(--color-track)',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isSkillActive ? 600 : 500,
                            color: isSkillActive
                              ? 'var(--color-text-primary)'
                              : 'var(--color-text-muted)',
                            fontFamily: 'var(--font-body)',
                            lineHeight: 1.3,
                          }}
                        >
                          {skill.text}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
