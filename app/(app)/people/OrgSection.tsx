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

// TODO: multi-org selection is incomplete — nodes and orgRole are fetched server-side
// for orgs[0] only. Switching to a second org shows stale hierarchy from the first org.
// Fix: pass allOrgNodes: Record<string, OrgNode[]> so each org has its own nodes, or
// push selectedOrgIndex to the page and re-fetch via a router param.
export function OrgSection({ orgs, nodes, orgRole }: Props) {
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0)
  const { mutate: createOrg, isPending: creatingOrg } = useMutation({ onSuccess: 'Organisation created' })
  const selectedOrg = orgs[selectedOrgIndex] ?? null

  return (
    <section>
      <div
        style={{
          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
          fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>Organisation</span>
        {selectedOrg && (
          <span
            style={{
              fontSize: 10, background: 'var(--color-chip-bg)',
              color: 'var(--color-text-muted)', padding: '2px 8px', borderRadius: 4, fontWeight: 500,
            }}
          >
            {selectedOrg.name}
          </span>
        )}
      </div>

      {orgs.length === 0 ? (
        <div
          style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
            borderRadius: 10, padding: 24,
          }}
        >
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
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
                flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 6, padding: '8px 12px', color: 'var(--color-text-primary)', fontSize: 14,
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
                    background: i === selectedOrgIndex ? 'var(--color-accent-wash2)' : 'transparent',
                    border: i === selectedOrgIndex ? '1px solid var(--color-accent-border)' : '1px solid var(--color-border)',
                    color: i === selectedOrgIndex ? 'var(--color-accent)' : 'var(--color-text-faint)',
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
