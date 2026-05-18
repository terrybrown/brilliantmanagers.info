export const SCORING_LEVELS = [
  'Developing',
  'Basic',
  'Proficient',
  'Advanced',
  'Expert',
] as const

export type ScoringLevel = (typeof SCORING_LEVELS)[number]

export const SCORING_LEVEL_DESCRIPTIONS: Record<ScoringLevel, string> = {
  Developing:
    "You're not yet demonstrating this consistently. The skill is underdeveloped or rarely applied. Look for learning opportunities.",
  Basic:
    "You show some understanding and practice, but it's inconsistent or has limited impact. You've started — it's not yet a strength.",
  Proficient:
    'You meet expectations and demonstrate this reliably. Others can count on you here. A solid place for most skills.',
  Advanced:
    'You go beyond expectations with strong impact. Others often rely on your strength in this area; you informally coach others.',
  Expert:
    'You set the standard. You influence others through mastery and actively develop this skill in those around you. Should be rare.',
}

export const SCORING_LEVEL_COLORS: Record<
  ScoringLevel,
  { bg: string; text: string }
> = {
  Developing: {
    bg: 'bg-rose-950/40',
    text: 'text-rose-400',
  },
  Basic: {
    bg: 'bg-orange-950/40',
    text: 'text-orange-400',
  },
  Proficient: {
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
  },
  Advanced: {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
  },
  Expert: {
    bg: 'bg-violet-950/40',
    text: 'text-violet-400',
  },
}
