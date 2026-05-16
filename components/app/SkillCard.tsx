'use client'
import { useState } from 'react'
import type { Skill, Level } from '@/lib/skills'
import { LEVELS, LEVEL_COLORS } from '@/lib/skills'

interface Props {
  skill: Skill
  currentLevel: Level | null
  onSelect: (skillKey: string, level: Level) => void
}

export function SkillCard({ skill, currentLevel, onSelect }: Props) {
  const [expanded, setExpanded] = useState(currentLevel === null)

  function handleSelect(level: Level) {
    onSelect(skill.key, level)
    setExpanded(false)
  }

  if (!expanded && currentLevel !== null) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-lg bg-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-700"
      >
        <span className="flex-1 text-sm font-medium text-white">{skill.label}</span>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            color: LEVEL_COLORS[currentLevel],
            background: `${LEVEL_COLORS[currentLevel]}22`,
          }}
        >
          {currentLevel}
        </span>
        <span className="text-xs text-slate-500">✎</span>
      </button>
    )
  }

  return (
    <div
      className="rounded-lg border px-4 py-4"
      style={{
        background: '#1e3a5f',
        borderColor: 'rgba(245,158,11,0.2)',
      }}
    >
      <p className="mb-1 text-sm font-semibold text-white">{skill.label}</p>
      <p className="mb-4 text-xs leading-relaxed text-slate-400">{skill.description}</p>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map(level => (
          <button
            key={level}
            onClick={() => handleSelect(level)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              color: LEVEL_COLORS[level],
              background: `${LEVEL_COLORS[level]}22`,
            }}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  )
}
