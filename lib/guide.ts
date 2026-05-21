// lib/guide.ts
export const GUIDE_SECTIONS = [
  'self',
  'team',
  'strategy',
  'communications',
  'domain-expertise',
] as const

export type GuideSection = (typeof GUIDE_SECTIONS)[number]

export const GUIDE_SECTION_LABELS: Record<GuideSection, string> = {
  self: 'Self',
  team: 'Team',
  strategy: 'Strategy',
  communications: 'Communications',
  'domain-expertise': 'Domain Expertise',
}

export function getPrevNextChapters(slug: string[]): {
  prev: { label: string; slug: string[] } | null
  next: { label: string; slug: string[] } | null
} {
  const current = slug[0] as GuideSection
  const idx = GUIDE_SECTIONS.indexOf(current)

  const prev =
    idx > 0
      ? {
          label: GUIDE_SECTION_LABELS[GUIDE_SECTIONS[idx - 1]],
          slug: [GUIDE_SECTIONS[idx - 1]],
        }
      : null

  const next =
    idx < GUIDE_SECTIONS.length - 1
      ? {
          label: GUIDE_SECTION_LABELS[GUIDE_SECTIONS[idx + 1]],
          slug: [GUIDE_SECTIONS[idx + 1]],
        }
      : null

  return { prev, next }
}
