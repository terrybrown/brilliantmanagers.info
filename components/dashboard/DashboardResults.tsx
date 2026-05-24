'use client'
import { useState, useCallback } from 'react'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import type { RadarPillarScore } from '@/lib/reflections'
import { PillarAccordion } from '@/components/app/PillarAccordion'
import { ActiveRoundCard } from '@/components/reflections/ActiveRoundCard'
import { GrowthSummaryCard } from '@/components/app/GrowthSummaryCard'
import { CheckInNudgeCard } from '@/components/app/CheckInNudgeCard'
import { InviteManagerModal } from '@/components/people/InviteManagerModal'
import { PillarHistoryChart } from '@/components/app/PillarHistoryChart'
import type { PillarData } from '@/components/app/PillarAccordion'
import type { Pillar } from '@/lib/skills'
import type { Round } from '@/lib/db/rounds'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

interface DashboardResultsProps {
  pillarScoresForRadar: RadarPillarScore[]
  hasManagerScores: boolean
  pillarsForAccordion: PillarData[]
  historyData: HistoryPoint[]
  overallAvg: number
  overallManagerAvg?: number
  roundDate: string
  inProgressRound: Round | null
  scoredPillarCount: number
  nextRoundTitle: string
  plans: DevelopmentPlan[]
  overdueCount: number
  isReadOnly?: boolean
}

export function DashboardResults({
  pillarScoresForRadar,
  hasManagerScores,
  pillarsForAccordion,
  historyData,
  overallAvg,
  overallManagerAvg,
  roundDate,
  inProgressRound,
  scoredPillarCount,
  nextRoundTitle,
  plans,
  overdueCount,
  isReadOnly,
}: DashboardResultsProps) {
  const [openPillar, setOpenPillar] = useState<string | null>(null)

  const handlePillarClick = useCallback((pillar: Pillar) => {
    setOpenPillar(pillar)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Three-column grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr_260px] lg:grid-cols-[320px_1fr_260px]">

        {/* Left: Radar + score + sparkline */}
        <aside className="flex flex-col gap-4">
          <ScorecardRadarChart
            pillarScores={pillarScoresForRadar}
            onPillarClick={handlePillarClick}
          />

          {/* Overall score chip */}
          <div className="rounded-xl bg-slate-800 px-4 py-3 text-center">
            <p className="text-3xl font-bold text-amber-400">{overallAvg.toFixed(1)}</p>
            <p className="text-xs text-slate-400">Overall score</p>
            <p className="mt-0.5 text-xs text-slate-500">{roundDate}</p>
          </div>

          {overallManagerAvg !== undefined && (
            <div className="rounded-xl bg-slate-800 px-4 py-3 text-center">
              <p className="text-3xl font-bold text-purple-400">{overallManagerAvg.toFixed(1)}</p>
              <p className="text-xs text-slate-400">Manager score</p>
              <p className="mt-0.5 text-xs text-slate-500">{roundDate}</p>
            </div>
          )}
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

        {/* Right: Action cards (hidden in read-only mode) */}
        {!isReadOnly && (
          <aside className="flex flex-col gap-4">
            <ActiveRoundCard
              inProgressRound={inProgressRound}
              scoredPillarCount={scoredPillarCount}
              nextRoundTitle={nextRoundTitle}
            />
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
                <InviteManagerModal />
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
