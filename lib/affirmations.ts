import type { Pillar } from '@/lib/skills'

const AFFIRMATIONS: Record<Pillar, string[]> = {
  self: [
    "Every goal completed is proof that you're growing — not just managing.",
    'Self-awareness is a practice. You just practiced it.',
    'The best leaders know themselves first.',
    "Resilience isn't built in easy moments. You chose the harder path.",
    'Knowing your edges is the first step to expanding them.',
    "Great managers are made, not born. You're proof.",
  ],
  team: [
    'A team that grows around you is the best evidence of great management.',
    'Every coaching conversation you had moved someone forward.',
    'The best thing a manager can do is make themselves less necessary.',
    'You invested in your team. That compounds.',
    'Psychological safety starts with one person deciding it matters — that was you.',
    'Leadership at its best is invisible. Yours is showing.',
  ],
  strategy: [
    "Vision without execution is a dream. You're building both.",
    'Clarity is a gift you give your team. You just gave it.',
    "Strategy is choosing what not to do. You're getting better at that.",
    'The leaders who last are the ones who think before they act.',
    'You just made the future a little more concrete for your team.',
    'Change is hard to lead. You led it anyway.',
  ],
  communications: [
    "The best communicators make others feel heard. You're practising that.",
    'Difficult conversations are how trust gets built. You showed up for one.',
    "Listening is a skill most people think they have. You're earning it.",
    "Stories move people. Facts inform them. You're learning the difference.",
    'Feedback given well is a gift. You gave one.',
    'Honest communication is rare. Keep making it your default.',
  ],
  'domain-expertise': [
    'Deep expertise wielded with humility is a rare and powerful combination.',
    "The best experts know what they don't know — and keep going anyway.",
    'Mastery is a direction, not a destination.',
    'You just raised the bar — for yourself and everyone watching.',
    'Technical excellence in service of others is leadership in disguise.',
    "Your domain knowledge makes your team better. That's not a small thing.",
  ],
}

export function getAffirmation(pillar: Pillar, completedCount: number): string {
  const list = AFFIRMATIONS[pillar]
  return list[completedCount % list.length]
}
