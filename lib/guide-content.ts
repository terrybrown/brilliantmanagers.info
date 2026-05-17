import { unstable_cache } from 'next/cache'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SKILLS } from './skills'

export interface SkillGuideContent {
  definition: string
  whyItMatters: string
  strongWhen: string
  warningSigns: string
  pathways: string
}

const PILLAR_TO_FILE: Record<string, string> = {
  self: 'self.mdx',
  team: 'team.mdx',
  strategy: 'strategy.mdx',
  communications: 'communications.mdx',
  'domain-expertise': 'domain-expertise.mdx',
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim()
}

export function parseGuideContent(mdx: string, skillLabel: string): SkillGuideContent | null {
  const target = normalise(skillLabel)

  const detailsRegex = /<details>([\s\S]*?)<\/details>/g
  let match
  while ((match = detailsRegex.exec(mdx)) !== null) {
    const block = match[1]
    const summaryMatch = block.match(/<summary>([\s\S]*?)<\/summary>/)
    if (!summaryMatch) continue
    if (normalise(summaryMatch[1]) !== target) continue

    // Split on #### headings; index 0 is content before the first heading
    // Allow optional leading whitespace to handle indented MDX (e.g. inside <details>)
    const parts = block.split(/^\s*####\s+/m)

    const findSection = (heading: string): string => {
      const part = parts.find(p =>
        normalise(p.split('\n')[0]).replace(/:$/, '') === normalise(heading)
      )
      if (!part) return ''
      return part.split('\n').slice(1).join('\n').trim()
    }

    return {
      definition: findSection('Definition'),
      whyItMatters: findSection('Why It Matters'),
      strongWhen: findSection('This Is Strong When'),
      warningSigns: findSection('Warning Signs'),
      pathways: findSection('Pathways to Improvement'),
    }
  }

  return null
}

async function _getSkillGuideContent(skillKey: string): Promise<SkillGuideContent | null> {
  const skill = SKILLS.find(s => s.key === skillKey)
  if (!skill) return null

  const fileName = PILLAR_TO_FILE[skill.pillar]
  if (!fileName) return null

  const filePath = join(process.cwd(), 'content', 'guide', fileName)
  let mdx: string
  try {
    mdx = readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }

  return parseGuideContent(mdx, skill.label)
}

export const getSkillGuideContent = unstable_cache(
  _getSkillGuideContent,
  ['skill-guide-content'],
  { revalidate: false }
)
