export interface Skill {
  key: string
  pillar: 'self' | 'team' | 'strategy' | 'communications' | 'domain-expertise'
  label: string
  description: string
}

export const PILLARS = ['self', 'team', 'strategy', 'communications', 'domain-expertise'] as const
export type Pillar = (typeof PILLARS)[number]

export const PILLAR_LABELS: Record<Pillar, string> = {
  self: 'Self',
  team: 'Team',
  strategy: 'Strategy',
  communications: 'Communications',
  'domain-expertise': 'Domain Expertise',
}

export const LEVELS = ['Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'] as const
export type Level = (typeof LEVELS)[number]

export const LEVEL_VALUES: Record<Level, number> = {
  Developing: 1,
  Basic: 2,
  Proficient: 3,
  Advanced: 4,
  Expert: 5,
}

export const LEVEL_COLORS: Record<Level, string> = {
  Developing: '#f87171',
  Basic: '#fb923c',
  Proficient: '#fbbf24',
  Advanced: '#4ade80',
  Expert: '#a78bfa',
}

export const SKILLS: Skill[] = [
  // Self — 9 skills
  { key: 'self-time-task-management', pillar: 'self', label: 'Time & Task Management', description: 'How well you prioritise, plan, and protect your own time to stay effective without burning out.' },
  { key: 'self-empathy-compassion', pillar: 'self', label: 'Empathy & Compassion', description: 'Your ability to understand and genuinely care about the people around you, making them feel seen and supported.' },
  { key: 'self-growth-mindset', pillar: 'self', label: 'Growth Mindset', description: 'Whether you actively seek challenge, feedback, and learning rather than protecting your existing reputation.' },
  { key: 'self-emotional-intelligence', pillar: 'self', label: 'Emotional Intelligence', description: 'How well you read your own emotions and those of others, and use that awareness to respond rather than react.' },
  { key: 'self-leadership-styles', pillar: 'self', label: 'Leadership Styles', description: 'How flexibly you shift your approach between directing, coaching, supporting, and delegating based on what each person needs.' },
  { key: 'self-self-awareness', pillar: 'self', label: 'Self Awareness', description: 'How clearly you see your own strengths, blind spots, and impact on others — not just your intentions.' },
  { key: 'self-cross-functional-skillset', pillar: 'self', label: 'Cross-functional Skillset', description: 'The breadth of skills you bring beyond your core domain that help you lead across functions and contexts.' },
  { key: 'self-resilience', pillar: 'self', label: 'Resilience', description: 'How consistently you maintain your effectiveness under pressure, ambiguity, or sustained difficulty.' },
  { key: 'self-vulnerability-courage', pillar: 'self', label: 'Vulnerability & Courage', description: 'Your willingness to admit uncertainty, share honest feedback, and take stands that might not be popular.' },
  // Team — 11 skills
  { key: 'team-dei', pillar: 'team', label: 'Diversity, Equity & Inclusion', description: 'How actively you build an environment where people from all backgrounds can contribute fully and feel they belong.' },
  { key: 'team-coaching-mentoring', pillar: 'team', label: 'Coaching & Mentoring', description: "Your ability to develop others through questions, frameworks, and space rather than just providing answers." },
  { key: 'team-one-to-ones', pillar: 'team', label: 'One-to-Ones', description: "How well you use regular one-to-one meetings to build trust, address blockers, and support each person's growth." },
  { key: 'team-growth-progression', pillar: 'team', label: 'Growth & Progression', description: "How effectively you identify development opportunities and actively support each person's career progression." },
  { key: 'team-performance-discipline', pillar: 'team', label: 'Performance & Discipline', description: 'How consistently you set clear expectations and address underperformance early and fairly.' },
  { key: 'team-accountability', pillar: 'team', label: 'Accountability', description: 'How well you create a culture where people take ownership of outcomes, not just tasks.' },
  { key: 'team-unblocking', pillar: 'team', label: 'Unblocking', description: 'How quickly and effectively you remove obstacles that stop your team from doing their best work.' },
  { key: 'team-recruitment', pillar: 'team', label: 'Recruitment', description: 'How well you attract, assess, and hire people who will both perform and strengthen the team culture.' },
  { key: 'team-onboarding', pillar: 'team', label: 'Onboarding', description: 'How effectively you help new joiners become productive, connected, and confident contributors.' },
  { key: 'team-psychological-safety', pillar: 'team', label: 'Psychological Safety & Team Wellbeing', description: 'How consistently you create an environment where people feel safe to speak up, take risks, and be honest.' },
  { key: 'team-cross-team-collaboration', pillar: 'team', label: 'Cross-team Collaboration', description: 'How well you build productive working relationships with other teams and break down silos.' },
  // Strategy — 8 skills
  { key: 'strategy-vision-creation', pillar: 'strategy', label: 'Strategy & Vision Creation', description: 'How clearly you define and communicate where the team is going and why it matters.' },
  { key: 'strategy-culture-driving', pillar: 'strategy', label: 'Culture Driving', description: 'How intentionally you shape the norms, behaviours, and values that define how your team works.' },
  { key: 'strategy-goal-setting', pillar: 'strategy', label: 'Goal Setting', description: 'How effectively you translate vision into clear, measurable goals that the team can act on.' },
  { key: 'strategy-change-management', pillar: 'strategy', label: 'Change Management', description: 'How well you lead your team through organisational change, keeping people informed and aligned.' },
  { key: 'strategy-data-driven-decisions', pillar: 'strategy', label: 'Data-Driven Decision Making', description: 'How consistently you use data to inform decisions rather than relying solely on intuition.' },
  { key: 'strategy-stakeholder-management', pillar: 'strategy', label: 'Stakeholder Management', description: "How well you identify, influence, and communicate with the people who have a stake in your team's work." },
  { key: 'strategy-resource-planning', pillar: 'strategy', label: 'Resource Planning & Allocation', description: 'How effectively you plan and allocate people, budget, and time to match strategic priorities.' },
  { key: 'strategy-innovation-experimentation', pillar: 'strategy', label: 'Innovation & Experimentation', description: 'How actively you create space for new ideas and run structured experiments rather than defaulting to the familiar.' },
  // Communications — 6 skills
  { key: 'comms-relationships-partnerships', pillar: 'communications', label: 'Relationships & Partnerships', description: 'How well you build genuine, trust-based relationships across your organisation and beyond.' },
  { key: 'comms-communication-excellence', pillar: 'communications', label: 'Communication Excellence', description: 'How clearly and consistently you communicate — in writing, in person, and in meetings — across different audiences.' },
  { key: 'comms-listening', pillar: 'communications', label: 'Listening', description: 'How genuinely you listen to understand rather than to respond, and how that shows up in what you do with what you hear.' },
  { key: 'comms-storytelling', pillar: 'communications', label: 'Storytelling', description: 'How effectively you use narrative and context to make ideas compelling and memorable.' },
  { key: 'comms-feedback', pillar: 'communications', label: 'Feedback', description: 'How consistently you give specific, timely, and useful feedback — both positive and developmental.' },
  { key: 'comms-difficult-conversations', pillar: 'communications', label: 'Difficult Conversations & Conflict Resolution', description: 'How well you handle conflict, disagreement, and uncomfortable truths in a way that builds rather than breaks trust.' },
  // Domain Expertise — 2 skills
  { key: 'domain-process-innovation', pillar: 'domain-expertise', label: 'Process Innovation & Optimization', description: 'How actively you identify and improve the processes, systems, and ways of working within your domain.' },
  { key: 'domain-technical-mastery', pillar: 'domain-expertise', label: 'Technical Mastery Within Your Domain', description: "The depth of expertise you bring in your core domain, and how you use it to raise the quality of your team's work." },
]

export function getSkillsByPillar(pillar: Pillar): Skill[] {
  return SKILLS.filter(s => s.pillar === pillar)
}
