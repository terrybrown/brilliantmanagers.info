'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toast } from 'sonner'
import { buildOrgLayout } from '@/lib/org/layout'
import { DeptNode } from './DeptNode'
import { OrgNodePanel } from './OrgNodePanel'
import { createNodeAction } from '@/app/(app)/organisation/actions'
import type { OrgNode } from '@/lib/db/org-nodes'

const nodeTypes = { deptNode: DeptNode }

interface Props {
  nodes: OrgNode[]
  orgId: string
  orgRole: 'org_admin' | 'member' | null
  currentUserId: string
  userManagerId: string | null
  userDirectReportIds: string[]
}

export function OrgFlowChart({
  nodes, orgId, orgRole, currentUserId, userManagerId, userDirectReportIds,
}: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showAddTopLevel, setShowAddTopLevel] = useState(false)
  const [isCreatingGroup, startTransition] = useTransition()
  const isAdmin = orgRole === 'org_admin'

  const { rfNodes, rfEdges } = useMemo(() => buildOrgLayout(nodes), [nodes])

  const flowNodes = rfNodes.map(n => ({ ...n, selected: n.id === selectedNodeId }))

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id)
  }, [])

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

  function handleAddTopLevel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('orgId', orgId)
    startTransition(async () => {
      const result = await createNodeAction(fd)
      if (!result.ok) toast.error(result.error)
      else { setShowAddTopLevel(false) }
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 360px)',
        minHeight: 400,
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}
    >
      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {isAdmin && (
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
            {showAddTopLevel ? (
              <form onSubmit={handleAddTopLevel} style={{ display: 'flex', gap: 6 }}>
                <input
                  name="name"
                  placeholder="Group name…"
                  required
                  autoFocus
                  style={{
                    border: '1px solid var(--color-border)', borderRadius: 6,
                    padding: '5px 10px', fontSize: 12,
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  }}
                />
                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: isCreatingGroup ? 'default' : 'pointer', opacity: isCreatingGroup ? 0.6 : 1 }}
                >
                  {isCreatingGroup ? '…' : 'Create'}
                </button>
                <button
                  type="button"
                  disabled={isCreatingGroup}
                  onClick={() => setShowAddTopLevel(false)}
                  style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: isCreatingGroup ? 'default' : 'pointer', color: 'var(--color-text-faint)' }}
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddTopLevel(true)}
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                  color: 'var(--color-text-muted)', boxShadow: '0 1px 3px rgba(40,60,45,0.06)',
                }}
              >
                + Add top-level group
              </button>
            )}
          </div>
        )}

        <ReactFlow
          nodes={flowNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: 'var(--color-bg-base)' }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--color-track)" />
        </ReactFlow>
      </div>

      {/* Side panel */}
      {selectedNode && (
        <OrgNodePanel
          node={selectedNode}
          orgId={orgId}
          orgRole={orgRole}
          currentUserId={currentUserId}
          userManagerId={userManagerId}
          userDirectReportIds={userDirectReportIds}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  )
}
