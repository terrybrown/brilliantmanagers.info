'use client'
import { useState } from 'react'
import type { OrgNode } from '@/lib/db/org-nodes'
import {
  createNodeAction,
  renameNodeAction,
  deleteNodeAction,
  addMemberToNodeVoidAction,
  removeMemberFromNodeAction,
} from '@/app/(app)/organisation/actions'

interface OrgNodeWithChildren extends OrgNode {
  children: OrgNodeWithChildren[]
}

function buildTree(nodes: OrgNode[], parentId: string | null = null): OrgNodeWithChildren[] {
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
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(new Set())

  const isAdmin = orgRole === 'org_admin'
  const tree = buildTree(nodes)

  function toggleCollapse(id: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleMembers(id: string) {
    setExpandedMemberIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function renderNode(node: OrgNodeWithChildren, depth: number) {
    const isCollapsed = collapsedIds.has(node.id)
    const membersExpanded = expandedMemberIds.has(node.id)

    return (
      <div key={node.id}>
        {/* Node row */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: `8px 14px 8px ${14 + depth * 18}px`,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {node.children.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleCollapse(node.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, fontSize: 12 }}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span style={{ width: 16, flexShrink: 0 }} />
          )}

          <span style={{ flex: 1, fontSize: 13, color: '#f1f5f9', fontWeight: depth === 0 ? 600 : 400 }}>
            {node.name}
            {node.node_type && (
              <span style={{ marginLeft: 6, fontSize: 10, color: '#4b5563' }}>{node.node_type}</span>
            )}
          </span>

          <span style={{ fontSize: 11, color: '#6b7280' }}>{node.members.length} {node.members.length === 1 ? 'person' : 'people'}</span>

          {isAdmin && (
            <button
              type="button"
              onClick={() => toggleMembers(node.id)}
              style={{
                fontSize: 10, color: '#6366f1', cursor: 'pointer',
                border: '1px solid rgba(99,102,241,0.3)', padding: '2px 8px',
                borderRadius: 4, background: 'transparent',
              }}
            >
              {membersExpanded ? 'Hide members' : 'See members'}
            </button>
          )}
        </div>

        {/* Expanded member list (admin only) */}
        {isAdmin && membersExpanded && (
          <div
            style={{
              paddingLeft: 14 + depth * 18 + 22,
              paddingRight: 14, paddingTop: 6, paddingBottom: 10,
              background: 'rgba(99,102,241,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {node.members.map(m => (
                <div
                  key={m.user_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#cbd5e1',
                    background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '3px 8px',
                  }}
                >
                  <div
                    style={{
                      width: 20, height: 20, borderRadius: '50%', background: '#374151',
                      border: '1px solid rgba(99,102,241,0.4)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {(m.display_name || m.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  {m.display_name || m.email}
                  <form action={removeMemberFromNodeAction} style={{ display: 'inline' }}>
                    <input type="hidden" name="nodeId" value={node.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <input type="hidden" name="orgId" value={orgId} />
                    <button type="submit" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>&#x2715;</button>
                  </form>
                </div>
              ))}
            </div>
            {/* Add member to node form */}
            <form action={addMemberToNodeVoidAction} style={{ display: 'flex', gap: 6 }}>
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="nodeId" value={node.id} />
              <input
                name="email"
                type="email"
                placeholder="Add member by email"
                style={{
                  flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 5,
                  padding: '5px 8px', color: '#f1f5f9', fontSize: 12,
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '5px 10px', background: 'rgba(99,102,241,0.2)',
                  color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 5, fontSize: 11, cursor: 'pointer',
                }}
              >
                Add
              </button>
            </form>
          </div>
        )}

        {/* Children */}
        {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
      {tree.length === 0 ? (
        <p style={{ padding: '16px 14px', fontSize: 13, color: '#4b5563' }}>No structure defined yet.</p>
      ) : (
        tree.map(node => renderNode(node, 0))
      )}
      {isAdmin && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <form action={createNodeAction} style={{ display: 'flex', gap: 6 }}>
            <input type="hidden" name="orgId" value={orgId} />
            <input
              name="name"
              placeholder="New top-level group"
              style={{
                flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 5,
                padding: '6px 10px', color: '#f1f5f9', fontSize: 12,
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
