import {
  PILLARS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'
import type { Round } from '@/lib/db/rounds'
import type { Score } from '@/lib/db/scores'
import type { ManagerScore } from '@/lib/db/manager-scores'

export interface TrendPoint {
  label: string
  overall: number
  self: number
  team: number
  strategy: number
  communications: number
  'domain-expertise': number
  mgr_overall?: number
  mgr_self?: number
  mgr_team?: number
  mgr_strategy?: number
  mgr_communications?: number
  'mgr_domain-expertise'?: number
}

export interface SkillScore {
  skillKey: string
  label: string
  level: Level
}

export interface RadarPillarScore {
  pillar: Pillar
  selfScore: number    // 0 when not scored (kept numeric for radar compatibility)
  selfScored: boolean  // true only when user actually has scores for this pillar
  selfSkills: SkillScore[]
  managerScore?: number
  managerSkills?: SkillScore[]
}

export function computePillarScores(
  scores: Score[],
  managerScores: ManagerScore[]
): RadarPillarScore[] {
  return PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)

    const selfAvg = pillarAvgFromScores(scores, pillar)

    const selfSkills: SkillScore[] = pillarSkills.flatMap(skill => {
      const match = scores.find(s => s.skill_key === skill.key)
      return match ? [{ skillKey: skill.key, label: skill.label, level: match.level }] : []
    })

    const relevantMgrScores = managerScores.filter(ms =>
      pillarSkills.some(s => s.key === ms.skill_key)
    )
    const managerAvg =
      relevantMgrScores.length > 0
        ? relevantMgrScores.reduce(
            (sum, ms) => sum + LEVEL_VALUES[ms.level as Level],
            0
          ) / relevantMgrScores.length
        : undefined

    const managerSkills: SkillScore[] | undefined =
      relevantMgrScores.length > 0
        ? pillarSkills.flatMap(skill => {
            const match = relevantMgrScores.find(ms => ms.skill_key === skill.key)
            return match
              ? [{ skillKey: skill.key, label: skill.label, level: match.level }]
              : []
          })
        : undefined

    return {
      pillar: pillar as Pillar,
      selfScore: selfAvg,
      selfScored: selfAvg > 0,
      selfSkills,
      managerScore: managerAvg,
      managerSkills,
    }
  })
}

export interface ReflectionStats {
  totalRounds: number
  improvement: number
  bestPillar: Pillar | null
  managerAvg: number | null
}

export function nextRoundTitle(date = new Date()): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `Q${quarter} ${date.getFullYear()}`
}

export function roundLabel(round: Round): string {
  if (round.title) return round.title
  const date = new Date(round.created_at)
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `Q${quarter} ${date.getFullYear()}`
}

export function pillarAvgFromScores(scores: Score[], pillar: string): number {
  const ps = scores.filter(s => s.pillar === pillar)
  if (ps.length === 0) return 0
  return ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
}

function pillarAvgFromManagerScores(
  mgrScores: ManagerScore[],
  pillar: Pillar
): number | undefined {
  const skills = getSkillsByPillar(pillar)
  const relevant = mgrScores.filter(ms => skills.some(s => s.key === ms.skill_key))
  if (relevant.length === 0) return undefined
  return relevant.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / relevant.length
}

export function computeTrendData(
  roundsWithScores: { round: Round; scores: Score[] }[],
  managerScoresByRound: Record<string, ManagerScore[]>
): TrendPoint[] {
  return roundsWithScores.map(({ round, scores }) => {
    const mgrScores = managerScoresByRound[round.id] ?? []
    const hasMgr = mgrScores.length > 0

    const pillarSelf: Record<string, number> = {}
    const pillarMgr: Record<string, number | undefined> = {}

    for (const pillar of PILLARS) {
      pillarSelf[pillar] = pillarAvgFromScores(scores, pillar)
      if (hasMgr) pillarMgr[pillar] = pillarAvgFromManagerScores(mgrScores, pillar)
    }

    const overallSelf =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
        : 0

    const overallMgr = hasMgr
      ? mgrScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / mgrScores.length
      : undefined

    const point: TrendPoint = {
      label: roundLabel(round),
      overall: Number(overallSelf.toFixed(2)),
      self: Number((pillarSelf['self'] ?? 0).toFixed(2)),
      team: Number((pillarSelf['team'] ?? 0).toFixed(2)),
      strategy: Number((pillarSelf['strategy'] ?? 0).toFixed(2)),
      communications: Number((pillarSelf['communications'] ?? 0).toFixed(2)),
      'domain-expertise': Number((pillarSelf['domain-expertise'] ?? 0).toFixed(2)),
    }

    if (overallMgr !== undefined) {
      point.mgr_overall = Number(overallMgr.toFixed(2))
      for (const pillar of PILLARS) {
        const avg = pillarMgr[pillar]
        if (avg !== undefined) {
          const key = `mgr_${pillar}` as keyof TrendPoint
          ;(point as unknown as Record<string, number>)[key] = Number(avg.toFixed(2))
        }
      }
    }

    return point
  })
}

export function computeStats(
  roundsWithScores: { round: Round; scores: Score[] }[],
  managerScoresByRound: Record<string, ManagerScore[]>
): ReflectionStats {
  if (roundsWithScores.length === 0) {
    return { totalRounds: 0, improvement: 0, bestPillar: null, managerAvg: null }
  }

  const sorted = [...roundsWithScores].sort((a, b) => {
    const aTime = a.round.completed_at ?? a.round.created_at
    const bTime = b.round.completed_at ?? b.round.created_at
    return aTime.localeCompare(bTime)
  })

  const overallByRound = sorted.map(({ scores }) =>
    scores.length > 0
      ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
      : 0
  )

  const earliest = overallByRound[0]
  const latest = overallByRound[overallByRound.length - 1]
  const improvement = Number((latest - earliest).toFixed(2))

  const pillarTotals: Record<string, number> = {}
  const pillarCounts: Record<string, number> = {}
  for (const { scores } of sorted) {
    for (const pillar of PILLARS) {
      const ps = scores.filter(s => s.pillar === pillar)
      if (ps.length > 0) {
        const avg = ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
        pillarTotals[pillar] = (pillarTotals[pillar] ?? 0) + avg
        pillarCounts[pillar] = (pillarCounts[pillar] ?? 0) + 1
      }
    }
  }

  let bestPillar: Pillar | null = null
  let bestAvg = -Infinity
  for (const pillar of PILLARS) {
    const count = pillarCounts[pillar] ?? 0
    if (count > 0) {
      const avg = pillarTotals[pillar] / count
      if (avg > bestAvg) {
        bestAvg = avg
        bestPillar = pillar as Pillar
      }
    }
  }

  const allMgrScores = Object.values(managerScoresByRound).flat()
  const managerAvg =
    allMgrScores.length > 0
      ? Number(
          (
            allMgrScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) /
            allMgrScores.length
          ).toFixed(2)
        )
      : null

  return { totalRounds: sorted.length, improvement, bestPillar, managerAvg }
}
