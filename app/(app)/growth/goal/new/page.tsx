import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getResourcesForSkill } from '@/lib/db/resources'
import { SKILLS, type Pillar } from '@/lib/skills'
import { GoalForm } from '@/components/app/GoalForm'

interface NewGoalPageProps {
  searchParams: Promise<{ skill?: string }>
}

export default async function NewGoalPage({ searchParams }: NewGoalPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { skill: skillKey } = await searchParams
  const resources = skillKey ? await getResourcesForSkill(skillKey) : []

  const allSkillsForSelector = SKILLS.map(s => ({
    key: s.key,
    label: s.label,
    pillar: s.pillar as Pillar,
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">
        {skillKey ? 'Set a goal' : 'Add a goal'}
      </h1>
      <GoalForm
        initialSkillKey={skillKey}
        resources={resources}
        allSkillsForSelector={allSkillsForSelector}
      />
    </div>
  )
}
