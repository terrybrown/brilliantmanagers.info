'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { SkillCard } from '@/components/app/SkillCard'
import type { Skill, Level } from '@/lib/skills'
import { saveManagerScore } from '@/app/(app)/manager/[userId]/actions'

interface Props {
  roundId: string
  pillar: string
  pillarLabel: string
  skills: Skill[]
  initialScores: Record<string, Level>
  directReportName: string
  userId: string
}

export function ManagerScoringView({
  roundId,
  pillar,
  pillarLabel,
  skills,
  initialScores,
  directReportName,
  userId,
}: Props) {
  const [scores, setScores] = useState<Record<string, Level>>(initialScores)
  const [, startTransition] = useTransition()

  function handleSelect(skillKey: string, level: Level) {
    setScores(prev => ({ ...prev, [skillKey]: level }))
    startTransition(() => {
      saveManagerScore(roundId, pillar, skillKey, level)
    })
  }

  const scored = skills.filter(s => scores[s.key]).length

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/manager/${userId}`} className="text-sm text-slate-400 hover:text-white">
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Scoring {directReportName}</h1>
          <p className="text-sm text-slate-400">{pillarLabel}</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${(scored / skills.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">
          {scored} / {skills.length}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {skills.map(skill => (
          <SkillCard
            key={skill.key}
            skill={skill}
            currentLevel={scores[skill.key] ?? null}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  )
}
