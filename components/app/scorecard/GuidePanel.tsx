'use client'
import { SKILLS, PILLAR_LABELS } from '@/lib/skills'
import type { SkillGuideContent } from '@/lib/guide-content'

interface GuidePanelProps {
  activeSkillKey: string | null
  allGuideContent: Record<string, SkillGuideContent | null>
}

function renderBody(text: string) {
  const lines = text.split('\n')
  const bulletLines = lines.filter(l => l.trimStart().startsWith('* ') || l.trimStart().startsWith('- '))
  if (bulletLines.length > 0) {
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bulletLines.map((l, i) => (
          <li key={i} style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--color-positive)', flexShrink: 0, marginTop: 1 }}>✓</span>
            <span>{l.replace(/^[\s*-]+/, '').trim()}</span>
          </li>
        ))}
      </ul>
    )
  }
  return <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>{text}</p>
}

const SECTIONS: { label: string; key: keyof SkillGuideContent }[] = [
  { label: 'Definition', key: 'definition' },
  { label: 'Why It Matters', key: 'whyItMatters' },
  { label: 'This Is Strong When', key: 'strongWhen' },
  { label: 'Warning Signs', key: 'warningSigns' },
  { label: 'Pathways to Improvement', key: 'pathways' },
]

export function GuidePanel({ activeSkillKey, allGuideContent }: GuidePanelProps) {
  const activeSkill = SKILLS.find(s => s.key === activeSkillKey)
  const content = activeSkillKey ? (allGuideContent[activeSkillKey] ?? null) : null

  const cardStyle: React.CSSProperties = {
    width: 340,
    flexShrink: 0,
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    background: 'var(--color-surface)',
    padding: 20,
    boxShadow: '0 1px 2px rgba(40,60,45,.04), 0 2px 5px rgba(40,60,45,.03)',
  }

  if (!activeSkillKey) {
    return (
      <div
        style={{
          ...cardStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 14,
          textAlign: 'center',
        }}
      >
        Select a skill to read the guide
      </div>
    )
  }

  return (
    <div
      style={{
        ...cardStyle,
        overflowY: 'auto',
      }}
    >
      {/* Skill title with dot */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              flexShrink: 0,
            }}
          />
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--color-accent)',
              margin: 0,
            }}
          >
            {activeSkill?.label}
          </h3>
        </div>
        {activeSkill && (
          <p style={{ fontSize: 11.5, color: 'var(--color-text-faint)', margin: 0, paddingLeft: 18 }}>
            {PILLAR_LABELS[activeSkill.pillar]} · select a level to score
          </p>
        )}
      </div>

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
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-faint)',
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

      {!content && activeSkill && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          {activeSkill.description}
        </p>
      )}
    </div>
  )
}
