import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlanById, getPlansForUser } from '@/lib/db/development-plans'
import { getGoalResources } from '@/lib/db/goal-resources'
import { getEvidenceForPlan } from '@/lib/db/goal-evidence'
import { getResourcesForSkill } from '@/lib/db/resources'
import { SKILLS, PILLAR_LABELS, type Pillar } from '@/lib/skills'
import { ProgressStrip } from '@/components/app/ProgressStrip'
import { EvidenceLog } from '@/components/app/EvidenceLog'
import { GoalDetailClient } from '@/components/app/GoalDetailClient'

interface GoalDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const plan = await getPlanById(id)
  if (!plan || plan.user_id !== user.id) notFound()

  const skill = SKILLS.find(s => s.key === plan.skill_key)

  const [goalResources, evidence, skillResources, allPlans] = await Promise.all([
    getGoalResources(plan.id),
    getEvidenceForPlan(plan.id),
    skill ? getResourcesForSkill(skill.key) : Promise.resolve([]),
    getPlansForUser(user.id),
  ])

  const completedCount = allPlans.filter(p => p.status === 'completed').length

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{skill?.label ?? plan.skill_key}</h1>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
              {PILLAR_LABELS[plan.pillar as Pillar] ?? plan.pillar}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={
                plan.status === 'completed'
                  ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
                  : { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
              }
            >
              {plan.status === 'completed' ? '✓ Complete' : '🎯 Active'}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{plan.goal}</p>
        </div>

        {plan.status !== 'completed' && (
          <GoalDetailClient
            plan={plan}
            skillLabel={skill?.label ?? plan.skill_key}
            pillar={(skill?.pillar ?? 'self') as Pillar}
            completedCount={completedCount}
            evidenceCount={evidence.length}
            skillResources={skillResources}
            goalResources={goalResources}
          />
        )}
      </div>

      {/* Progress strip */}
      <ProgressStrip plan={plan} />

      {/* Saved resources */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">
          Saved resources
          <span className="ml-2 text-xs font-normal text-slate-500">
            {goalResources.length} pinned
          </span>
        </h3>
        {goalResources.length === 0 ? (
          <p className="text-sm text-slate-500">No resources saved yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {goalResources.map(gr => (
              <div
                key={gr.id}
                className="flex items-start gap-3 rounded-lg bg-slate-800 px-4 py-3"
              >
                <span className="mt-0.5 text-xs font-semibold uppercase text-slate-500">
                  {gr.resource.resource_type}
                </span>
                <div className="flex-1">
                  <a
                    href={gr.resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white hover:text-amber-300"
                  >
                    {gr.resource.title} ↗
                  </a>
                  <p className="text-xs text-slate-500">{gr.resource.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence log */}
      <EvidenceLog planId={plan.id} entries={evidence} />
    </div>
  )
}
