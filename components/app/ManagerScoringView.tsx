'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
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
  directReportScores: Record<string, Level> | null
  isBlindMode: boolean
}

export function ManagerScoringView({
  roundId,
  pillar,
  pillarLabel,
  skills,
  initialScores,
  directReportName,
  userId,
  directReportScores,
  isBlindMode,
}: Props) {
  const [scores, setScores] = useState<Record<string, Level>>(initialScores)
  const [, startTransition] = useTransition()

  function handleSelect(skillKey: string, level: Level) {
    setScores(prev => ({ ...prev, [skillKey]: level }))
    startTransition(async () => {
      const result = await saveManagerScore(roundId, pillar, skillKey, level)
      if (!result.ok) {
        toast.error(result.error)
        setScores(prev => ({ ...prev, [skillKey]: initialScores[skillKey] }))
      }
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

      {!isBlindMode && directReportScores && (
        <div className="mb-4 rounded-md border border-neutral-700 bg-neutral-800/50 px-4 py-3">
          <p className="text-xs text-neutral-300">
            Informed mode: {directReportName}&apos;s self-assessment scores are shown alongside each skill.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {skills.map(skill => (
          <SkillCard
            key={skill.key}
            skill={skill}
            currentLevel={scores[skill.key] ?? null}
            onSelect={handleSelect}
            drScore={!isBlindMode && directReportScores ? directReportScores[skill.key] : undefined}
          />
        ))}
      </div>
    </div>
  )
}
