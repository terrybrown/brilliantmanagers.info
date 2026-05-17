import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, GitBranch, Building2 } from 'lucide-react'

export default async function OrganisationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Organisation</h1>
      <p className="mb-8 text-sm text-slate-400">
        Manage your organisation, teams, and reporting hierarchy.
      </p>

      <div className="flex flex-col gap-4">
        <FeatureCard
          icon={<Building2 size={20} strokeWidth={1.75} />}
          title="Organisation profile"
          description="Set your organisation name, industry, and size to personalise your experience."
        />
        <FeatureCard
          icon={<GitBranch size={20} strokeWidth={1.75} />}
          title="Reporting hierarchy"
          description="Visualise your management chain — who you manage, and who you report to."
        />
        <FeatureCard
          icon={<Users size={20} strokeWidth={1.75} />}
          title="Team overview"
          description="See aggregate self-assessment scores across your direct reports."
        />
      </div>

      <div
        className="mt-8 rounded-xl px-5 py-4"
        style={{ background: '#1e293b', border: '1px solid #334155' }}
      >
        <p className="text-sm font-semibold text-slate-300">Coming soon</p>
        <p className="mt-1 text-xs text-slate-500">
          Organisation features are in development. Use{' '}
          <a href="/connections" className="text-amber-400 hover:text-amber-300">
            Connections
          </a>{' '}
          to link with your manager or direct reports in the meantime.
        </p>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4 rounded-xl bg-slate-800 px-5 py-4 opacity-60">
      <div className="mt-0.5 text-amber-400">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  )
}
