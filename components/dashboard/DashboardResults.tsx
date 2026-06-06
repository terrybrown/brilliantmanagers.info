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
  overallDelta?: number
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
  overallDelta,
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_296px]" style={{ alignContent: 'start' }}>
      {/* Main column */}
      <div className="min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat row — 2 columns on phone, 3 on larger screens */}
        <div className={`grid grid-cols-2 gap-3.5${overallManagerAvg !== undefined ? ' sm:grid-cols-3' : ''}`}>
          {/* Overall score */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-card)',
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 32,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {overallAvg.toFixed(1)}
              {overallDelta !== undefined && overallDelta !== 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: overallDelta > 0 ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)',
                    color: overallDelta > 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                  }}
                >
                  {overallDelta > 0 ? '+' : ''}{overallDelta}
                </span>
              )}
            </p>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
              Overall score
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
              Self · {roundDate}
            </p>
          </div>

          {/* Manager score — only when present */}
          {overallManagerAvg !== undefined && (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-card)',
                padding: 16,
              }}
            >
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-manager)',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {overallManagerAvg.toFixed(1)}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                Manager score
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                From your manager
              </p>
            </div>
          )}

          {/* Pillars scored */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-card)',
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 32,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {pillarScoresForRadar.filter(p => p.selfScored).length || pillarScoresForRadar.length}
              <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--color-text-faint)' }}>
                /{pillarScoresForRadar.length || 5}
              </span>
            </p>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
              Pillars scored
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
              This round complete
            </p>
          </div>
        </div>

        {/* Snapshot card */}
        <div
          className="grid grid-cols-1 overflow-hidden lg:grid-cols-[278px_1fr]"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Left: radar + legend */}
          <div
            className="snapshot-left-panel"
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', marginBottom: 2 }}>
                Across five pillars
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                Self vs. manager view
              </p>
            </div>
            <ScorecardRadarChart
              pillarScores={pillarScoresForRadar}
              onPillarClick={handlePillarClick}
            />
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-accent)', flexShrink: 0 }} />
                Self
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-manager)', flexShrink: 0 }} />
                Manager
              </span>
            </div>
          </div>

          {/* Right: pillar accordion */}
          <div style={{ padding: '16px 20px', minWidth: 0 }}>
            <PillarAccordion
              pillars={pillarsForAccordion}
              openPillar={openPillar}
              onOpenChange={setOpenPillar}
            />
          </div>
        </div>

        {/* History card */}
        <PillarHistoryChart data={historyData} />
      </div>

      {/* Right rail — action cards (hidden in read-only mode) */}
      {!isReadOnly && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ActiveRoundCard
            inProgressRound={inProgressRound}
            scoredPillarCount={scoredPillarCount}
            nextRoundTitle={nextRoundTitle}
          />
          <GrowthSummaryCard plans={plans} />
          <CheckInNudgeCard overdueCount={overdueCount} />

          {!hasManagerScores && (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-card)',
                padding: '16px 20px',
              }}
            >
              <p style={{ marginBottom: 4, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Invite your manager
              </p>
              <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                They score you independently, then you compare.
              </p>
              <InviteManagerModal />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
