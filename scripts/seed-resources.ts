// scripts/seed-resources.ts
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { SKILLS } from '../lib/skills'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RawResource {
  title: string
  url: string
  description: string
  resource_type: 'book' | 'article' | 'course' | 'video' | 'person' | 'podcast' | 'tool'
  author: string | null
}

async function generateResources(skillKey: string, skillLabel: string, skillDescription: string): Promise<RawResource[]> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: 'You are a curator of management development resources. Return only valid JSON — no markdown, no code fences, no prose.',
    messages: [{
      role: 'user',
      content: `Generate up to 8 curated resources for a management skill called "${skillLabel}".

Skill description: ${skillDescription}

Return a JSON array where each object has exactly these keys:
- "title": string
- "url": string (a real, publicly accessible URL)
- "description": string (2–3 sentences on why it's valuable for this skill)
- "resource_type": one of "book", "article", "course", "video", "person", "podcast", "tool"
- "author": string or null

Prioritise high-quality, well-known resources. Mix types where possible. Return only the JSON array.`,
    }],
  })

  const textBlock = response.content.filter(b => b.type === 'text').pop()
  if (!textBlock || textBlock.type !== 'text') return []

  try {
    const match = textBlock.text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r: any) =>
      typeof r.title === 'string' &&
      typeof r.url === 'string' &&
      typeof r.description === 'string' &&
      ['book', 'article', 'course', 'video', 'person', 'podcast', 'tool'].includes(r.resource_type)
    ) as RawResource[]
  } catch {
    console.error(`  ✗ JSON parse failed for ${skillKey}`)
    return []
  }
}

async function upsertResources(skillKey: string, resources: RawResource[]): Promise<void> {
  for (const resource of resources) {
    const { data, error } = await supabase
      .from('resources')
      .upsert(
        { ...resource, updated_at: new Date().toISOString() },
        { onConflict: 'url' }
      )
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ Upsert failed for "${resource.title}":`, error.message)
      continue
    }

    const resourceId = data.id
    const { error: srError } = await supabase
      .from('skill_resources')
      .upsert(
        { resource_id: resourceId, skill_key: skillKey, relevance_score: 3 },
        { onConflict: 'resource_id,skill_key' }
      )

    if (srError) {
      console.error(`  ✗ skill_resources upsert failed:`, srError.message)
    } else {
      console.log(`  ✓ ${resource.resource_type}: ${resource.title}`)
    }
  }
}

async function main() {
  console.log(`Seeding resources for ${SKILLS.length} skills...\n`)

  for (const skill of SKILLS) {
    console.log(`→ ${skill.label} (${skill.key})`)
    const resources = await generateResources(skill.key, skill.label, skill.description)
    console.log(`  Generated ${resources.length} resources`)
    await upsertResources(skill.key, resources)
    // Brief pause to avoid rate limits
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
