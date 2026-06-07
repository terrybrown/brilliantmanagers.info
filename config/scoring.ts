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
  { color: string; bg: string; border: string }
> = {
  Developing: {
    color: '#C0552F',
    bg: 'rgba(192,85,47,0.12)',
    border: 'rgba(192,85,47,0.30)',
  },
  Basic: {
    color: '#CC8A1A',
    bg: 'rgba(204,138,26,0.12)',
    border: 'rgba(204,138,26,0.30)',
  },
  Proficient: {
    color: '#7A9A3C',
    bg: 'rgba(122,154,60,0.12)',
    border: 'rgba(122,154,60,0.30)',
  },
  Advanced: {
    color: '#0E7C6B',
    bg: 'rgba(14,124,107,0.12)',
    border: 'rgba(14,124,107,0.30)',
  },
  Expert: {
    color: '#0B5448',
    bg: 'rgba(11,84,72,0.12)',
    border: 'rgba(11,84,72,0.30)',
  },
}
