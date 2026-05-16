export const SCORING_LEVELS = [
  'Developing',
  'Practising',
  'Proficient',
  'Leading',
] as const

export type ScoringLevel = (typeof SCORING_LEVELS)[number]

export const SCORING_LEVEL_DESCRIPTIONS: Record<ScoringLevel, string> = {
  Developing:
    "You know this matters and you're actively working on it. The gap between knowing and doing is closing.",
  Practising:
    'You apply this with reasonable consistency. Not automatic yet, but deliberate.',
  Proficient:
    'This shows up reliably. The people around you notice and benefit from it.',
  Leading:
    "You're role-modelling this and actively helping others develop it too.",
}

export const SCORING_LEVEL_COLORS: Record<
  ScoringLevel,
  { bg: string; text: string }
> = {
  Developing: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
  },
  Practising: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  Proficient: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
  },
  Leading: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-200',
  },
}
