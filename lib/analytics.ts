// lib/analytics.ts
type GtagWindow = Window & { gtag?: (...args: unknown[]) => void }

function gtag(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof (window as GtagWindow).gtag !== 'function') return
  ;(window as GtagWindow).gtag!('event', event, params)
}

export function trackRoundStarted(title: string) {
  gtag('reflection_round_started', { title })
}

export function trackReflectionViewed(roundId: string, status: string) {
  gtag('reflection_viewed', { round_id: roundId, status })
}

export function trackRoundCompleted(roundId: string) {
  gtag('reflection_round_completed', { round_id: roundId })
}

export function trackPillarScored(pillar: string, level: string) {
  gtag('pillar_scored', { pillar, level })
}

export function trackScorecardCompleted() {
  gtag('scorecard_completed')
}

export function trackGoalCreated() {
  gtag('goal_created')
}

export function trackGoalCheckin() {
  gtag('goal_checkin')
}

export function trackManagerInvited() {
  gtag('manager_invited')
}

export function trackConnectionAccepted() {
  gtag('connection_accepted')
}
