'use client'
import { useState, useEffect, useTransition } from 'react'
import { getGuideContent } from '@/app/(app)/scorecard/actions'
import { SKILLS } from '@/lib/skills'
import type { SkillGuideContent } from '@/lib/guide-content'

interface GuidePanelProps {
  activeSkillKey: string | null
}

function renderBody(text: string) {
  const lines = text.split('\n')
  const bulletLines = lines.filter(l => l.trimStart().startsWith('* ') || l.trimStart().startsWith('- '))
  if (bulletLines.length > 0) {
    return (
      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {bulletLines.map((l, i) => (
          <li key={i} style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
            {l.replace(/^[\s*-]+/, '').trim()}
          </li>
        ))}
      </ul>
    )
  }
  return <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{text}</p>
}

const SECTIONS: { label: string; key: keyof SkillGuideContent }[] = [
  { label: 'Definition', key: 'definition' },
  { label: 'Why It Matters', key: 'whyItMatters' },
  { label: 'This Is Strong When', key: 'strongWhen' },
  { label: 'Warning Signs', key: 'warningSigns' },
  { label: 'Pathways to Improvement', key: 'pathways' },
]

export function GuidePanel({ activeSkillKey }: GuidePanelProps) {
  const [content, setContent] = useState<SkillGuideContent | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!activeSkillKey) {
      setContent(null)
      return
    }
    setContent(null)
    let cancelled = false
    startTransition(async () => {
      const result = await getGuideContent(activeSkillKey)
      if (!cancelled) setContent(result)
    })
    return () => { cancelled = true }
  }, [activeSkillKey])

  const activeSkill = SKILLS.find(s => s.key === activeSkillKey)

  if (!activeSkillKey) {
    return (
      <div
        style={{
          width: 320,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: 14,
          textAlign: 'center',
          padding: 24,
          borderLeft: '1px solid #1e293b',
        }}
      >
        Select a skill to read the guide
      </div>
    )
  }

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        overflowY: 'auto',
        paddingLeft: 20,
        borderLeft: '1px solid #1e293b',
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#f59e0b',
          marginBottom: 20,
          marginTop: 4,
        }}
      >
        {activeSkill?.label}
      </h3>

      {isPending && !content && (
        <p style={{ color: '#64748b', fontSize: 13 }}>Loading…</p>
      )}

      {content && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SECTIONS.map(({ label, key }) => {
            const body = content[key]
            if (!body) return null
            return (
              <div key={key}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    marginBottom: 8,
                    marginTop: 0,
                  }}
                >
                  {label}
                </p>
                {renderBody(body)}
              </div>
            )
          })}
        </div>
      )}

      {!isPending && !content && activeSkill && (
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
          {activeSkill.description}
        </p>
      )}
    </div>
  )
}
