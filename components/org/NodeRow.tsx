'use client'
import type { OrgNode } from '@/lib/db/org-nodes'
import { MemberStack } from './MemberStack'
import { AddNodeForm } from './AddNodeForm'

export interface OrgNodeWithChildren extends OrgNode {
  children: OrgNodeWithChildren[]
}

interface NodeRowProps {
  node: OrgNodeWithChildren
  depth: number
  orgId: string
  isAdmin: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  openMemberPanelId: string | null
  setOpenMemberPanelId: (id: string | null) => void
  openChildFormId: string | null
  setOpenChildFormId: (id: string | null) => void
  addNodeFormAction: (parentId: string) => (formData: FormData) => Promise<void>
  renderNode: (node: OrgNodeWithChildren, depth: number) => React.ReactNode
}

export function NodeRow({
  node,
  depth,
  orgId,
  isAdmin,
  isCollapsed,
  onToggleCollapse,
  openMemberPanelId,
  setOpenMemberPanelId,
  openChildFormId,
  setOpenChildFormId,
  addNodeFormAction,
  renderNode,
}: NodeRowProps) {
  const isChildFormOpen = openChildFormId === node.id
  const isMemberPanelOpen = openMemberPanelId === node.id
  const isProvisional = node.id.startsWith('provisional-')

  const paddingLeft = 14 + depth * 18

  return (
    <div>
      {/* Node row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: `8px 14px 8px ${paddingLeft}px`,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          opacity: isProvisional ? 0.55 : 1,
        }}
      >
        {/* Collapse toggle */}
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? '▸' : '▾'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b7280', padding: 0, fontSize: 12, flexShrink: 0,
            }}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}

        {/* Name */}
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: isProvisional ? '#a78bfa' : '#f1f5f9',
            fontWeight: depth === 0 ? 600 : 400,
            fontStyle: isProvisional ? 'italic' : 'normal',
          }}
        >
          {node.name}
          {node.node_type && (
            <span style={{ marginLeft: 6, fontSize: 10, color: '#4b5563' }}>{node.node_type}</span>
          )}
        </span>

        {/* Saving indicator for provisional nodes */}
        {isProvisional && (
          <span style={{ fontSize: 10, color: '#f59e0b' }}>saving…</span>
        )}

        {/* Member stack */}
        {!isProvisional && (
          <MemberStack
            members={node.members}
            pendingInvites={node.pendingInvites}
            nodeId={node.id}
            orgId={orgId}
            isAdmin={isAdmin}
            isOpen={isMemberPanelOpen}
            onToggle={() =>
              setOpenMemberPanelId(isMemberPanelOpen ? null : node.id)
            }
          />
        )}

        {/* + child button (admin only, disabled for provisional nodes) */}
        {isAdmin && (
          <button
            type="button"
            disabled={isProvisional}
            onClick={() => setOpenChildFormId(isChildFormOpen ? null : node.id)}
            style={{
              fontSize: 10,
              color: isChildFormOpen ? '#a78bfa' : '#6366f1',
              cursor: isProvisional ? 'default' : 'pointer',
              border: `1px solid ${isChildFormOpen ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)'}`,
              padding: '2px 8px',
              borderRadius: 4,
              background: isChildFormOpen ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)',
              opacity: isProvisional ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            + child{isChildFormOpen ? ' ▴' : ''}
          </button>
        )}
      </div>

      {/* Inline add-child form */}
      {isChildFormOpen && !isProvisional && (
        <div style={{ paddingLeft: paddingLeft + 18 }}>
          <AddNodeForm
            orgId={orgId}
            parentId={node.id}
            formAction={addNodeFormAction(node.id)}
            onCancel={() => setOpenChildFormId(null)}
          />
        </div>
      )}

      {/* Children */}
      {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
    </div>
  )
}
