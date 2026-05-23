'use client'
import { useState } from 'react'
import { OrgHierarchy } from '@/components/org/OrgHierarchy'
import { createOrgAction } from '@/app/(app)/organisation/actions'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'
import type { Org } from '@/lib/db/organisations'
import type { OrgNode } from '@/lib/db/org-nodes'

interface Props {
  orgs: Org[]
  nodes: OrgNode[]
  orgRole: 'org_admin' | 'member' | null
}

export function OrgSection({ orgs, nodes, orgRole }: Props) {
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0)
  const { mutate: createOrg, isPending: creatingOrg } = useMutation({ onSuccess: 'Organisation created' })
  const selectedOrg = orgs[selectedOrgIndex] ?? null

  return (
    <section>
      <div
        style={{
          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
          fontWeight: 600, color: '#a78bfa', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>Organisation</span>
        {selectedOrg && (
          <span
            style={{
              fontSize: 10, background: 'rgba(99,102,241,0.15)',
              color: '#a78bfa', padding: '2px 8px', borderRadius: 4, fontWeight: 500,
            }}
          >
            {selectedOrg.name}
          </span>
        )}
      </div>

      {orgs.length === 0 ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 24,
          }}
        >
          <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>
            You&apos;re not part of an organisation yet. Create one to map out your team structure.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              createOrg(() => createOrgAction(fd))
            }}
            style={{ display: 'flex', gap: 8 }}
          >
            <input
              name="name"
              placeholder="Organisation name"
              required
              style={{
                flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                padding: '8px 12px', color: '#f1f5f9', fontSize: 14,
              }}
            />
            <Button type="submit" loading={creatingOrg}>Create</Button>
          </form>
        </div>
      ) : (
        <>
          {orgs.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {orgs.map((org, i) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrgIndex(i)}
                  style={{
                    padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
                    background: i === selectedOrgIndex ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                    border: i === selectedOrgIndex ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    color: i === selectedOrgIndex ? '#a78bfa' : '#6b7280',
                  }}
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}
          {selectedOrg && (
            <OrgHierarchy
              nodes={nodes}
              orgId={selectedOrg.id}
              orgRole={orgRole}
            />
          )}
        </>
      )}
    </section>
  )
}
