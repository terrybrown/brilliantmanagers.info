'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { RadarWithToggle } from '@/components/app/RadarWithToggle'
import { PillarAccordion } from '@/components/app/PillarAccordion'
import { ScheduleWidget } from '@/components/app/ScheduleWidget'
import { GrowthSummaryCard } from '@/components/app/GrowthSummaryCard'
import { CheckInNudgeCard } from '@/components/app/CheckInNudgeCard'
import { ScoreSparkline } from '@/components/app/ScoreSparkline'
import { PillarHistoryChart } from '@/components/app/PillarHistoryChart'
import type { PillarData } from '@/components/app/PillarAccordion'
import type { Pillar } from '@/lib/skills'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
}

interface DashboardResultsProps {
  pillarScoresForRadar: PillarScore[]
  hasManagerScores: boolean
  pillarsForAccordion: PillarData[]
  sparklineData: { date: string; score: number }[]
  historyData: HistoryPoint[]
  overallAvg: number
  roundDate: string
  scheduled: ScheduledRound | null
  plans: DevelopmentPlan[]
  overdueCount: number
  showStartNewRound: boolean
}

export function DashboardResults({
  pillarScoresForRadar,
  hasManagerScores,
  pillarsForAccordion,
  sparklineData,
  historyData,
  overallAvg,
  roundDate,
  scheduled,
  plans,
  overdueCount,
  showStartNewRound,
}: DashboardResultsProps) {
  const [openPillar, setOpenPillar] = useState<string | null>(null)

  const handlePillarClick = useCallback((pillar: Pillar) => {
    setOpenPillar(pillar)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Three-column grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr_260px]">

        {/* Left: Radar + score + sparkline */}
        <aside className="flex flex-col gap-4">
          <RadarWithToggle
            pillarScores={pillarScoresForRadar}
            hasManagerScores={hasManagerScores}
            onPillarClick={handlePillarClick}
          />

          {/* Overall score chip */}
          <div className="rounded-xl bg-slate-800 px-4 py-3 text-center">
            <p className="text-3xl font-bold text-amber-400">{overallAvg.toFixed(1)}</p>
            <p className="text-xs text-slate-400">Overall score</p>
            <p className="mt-0.5 text-xs text-slate-500">{roundDate}</p>
          </div>

          <ScoreSparkline data={sparklineData} />
        </aside>

        {/* Centre: Pillar accordion + history chart */}
        <main className="min-w-0 flex flex-col gap-4">
          <PillarAccordion
            pillars={pillarsForAccordion}
            openPillar={openPillar}
            onOpenChange={setOpenPillar}
          />
          <PillarHistoryChart data={historyData} />
        </main>

        {/* Right: Action cards */}
        <aside className="flex flex-col gap-4">
          <ScheduleWidget scheduled={scheduled} />
          <GrowthSummaryCard plans={plans} />
          <CheckInNudgeCard overdueCount={overdueCount} />

          {!hasManagerScores && (
            <div
              className="rounded-xl px-5 py-4"
              style={{ background: '#1e3a5f', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <p className="mb-1 text-sm font-semibold text-white">Invite your manager</p>
              <p className="mb-3 text-xs text-slate-400">
                They score you independently, then you compare.
              </p>
              <Link
                href="/connections"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                Connect →
              </Link>
            </div>
          )}

          {showStartNewRound && (
            <Link
              href="/scorecard"
              className="text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Start new round →
            </Link>
          )}
        </aside>
      </div>

    </div>
  )
}
