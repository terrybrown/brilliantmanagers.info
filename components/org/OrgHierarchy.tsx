'use client'
import { useState, useOptimistic, useTransition } from 'react'
import type { OrgNode } from '@/lib/db/org-nodes'
import { createNodeAction } from '@/app/(app)/organisation/actions'
import { NodeRow, type OrgNodeWithChildren } from './NodeRow'

type OptimisticNode = OrgNode & { _provisional?: true }

function buildTree(nodes: OptimisticNode[], parentId: string | null = null): OrgNodeWithChildren[] {
  return nodes
    .filter(n => n.parent_id === parentId)
    .map(n => ({ ...n, children: buildTree(nodes, n.id) }))
}

interface Props {
  nodes: OrgNode[]
  orgId: string
  orgRole: 'org_admin' | 'member' | null
}

export function OrgHierarchy({ nodes, orgId, orgRole }: Props) {
  const [optimisticNodes, addOptimisticNode] = useOptimistic<OptimisticNode[], OptimisticNode>(
    nodes,
    (state, newNode) => [...state, newNode]
  )
  const [, startTransition] = useTransition()

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [openChildFormId, setOpenChildFormId] = useState<string | null>(null)
  const [openMemberPanelId, setOpenMemberPanelId] = useState<string | null>(null)

  const isAdmin = orgRole === 'org_admin'
  const tree = buildTree(optimisticNodes)

  function makeAddNodeFormAction(parentId: string | null) {
    return async (formData: FormData) => {
      const name = (formData.get('name') as string | null)?.trim()
      if (!name) return
      if (parentId !== null) formData.set('parentId', parentId)
      startTransition(async () => {
        addOptimisticNode({
          id: `provisional-${Date.now()}`,
          name,
          parent_id: parentId,
          org_id: orgId,
          node_type: null,
          created_at: new Date().toISOString(),
          members: [],
          pendingInvites: [],
          _provisional: true,
        })
        await createNodeAction(formData)
      })
    }
  }

  function renderNode(node: OrgNodeWithChildren, depth: number) {
    return (
      <NodeRow
        key={node.id}
        node={node}
        depth={depth}
        orgId={orgId}
        isAdmin={isAdmin}
        isCollapsed={collapsedIds.has(node.id)}
        onToggleCollapse={() => {
          setCollapsedIds(prev => {
            const next = new Set(prev)
            next.has(node.id) ? next.delete(node.id) : next.add(node.id)
            return next
          })
        }}
        openMemberPanelId={openMemberPanelId}
        setOpenMemberPanelId={id => {
          setOpenMemberPanelId(id)
          if (id !== null) setOpenChildFormId(null)
        }}
        openChildFormId={openChildFormId}
        setOpenChildFormId={id => {
          setOpenChildFormId(id)
          if (id !== null) setOpenMemberPanelId(null)
        }}
        addNodeFormAction={makeAddNodeFormAction}
        renderNode={renderNode}
      />
    )
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {tree.length === 0 && !isAdmin ? (
        <p style={{ padding: '16px 14px', fontSize: 13, color: '#4b5563' }}>
          No structure defined yet.
        </p>
      ) : (
        tree.map(node => renderNode(node, 0))
      )}

      {isAdmin && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <form
            action={makeAddNodeFormAction(null)}
            style={{ display: 'flex', gap: 6 }}
          >
            <input type="hidden" name="orgId" value={orgId} />
            <input
              name="name"
              placeholder="New top-level group"
              style={{
                flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 5,
                padding: '6px 10px', color: '#f1f5f9', fontSize: 12, outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '6px 12px', background: 'rgba(99,102,241,0.15)',
                color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 5, fontSize: 12, cursor: 'pointer',
              }}
            >
              + Add group
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
