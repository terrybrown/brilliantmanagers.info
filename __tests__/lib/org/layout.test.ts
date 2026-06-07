import { describe, it, expect } from 'vitest'
import { buildOrgLayout } from '@/lib/org/layout'
import type { OrgNode } from '@/lib/db/org-nodes'

function makeNode(id: string, parent_id: string | null = null): OrgNode {
  return {
    id, org_id: 'org-1', parent_id, name: id,
    node_type: null, created_at: '', members: [], pendingInvites: [],
  }
}

describe('buildOrgLayout', () => {
  it('returns empty arrays for empty input', () => {
    const { rfNodes, rfEdges } = buildOrgLayout([])
    expect(rfNodes).toHaveLength(0)
    expect(rfEdges).toHaveLength(0)
  })

  it('produces one rfNode per OrgNode', () => {
    const nodes = [makeNode('a'), makeNode('b', 'a'), makeNode('c', 'a')]
    const { rfNodes } = buildOrgLayout(nodes)
    expect(rfNodes).toHaveLength(3)
    expect(rfNodes.map(n => n.id)).toEqual(expect.arrayContaining(['a', 'b', 'c']))
  })

  it('produces one rfEdge per parent-child relationship', () => {
    const nodes = [makeNode('a'), makeNode('b', 'a'), makeNode('c', 'a')]
    const { rfEdges } = buildOrgLayout(nodes)
    expect(rfEdges).toHaveLength(2)
    expect(rfEdges.every(e => e.source === 'a')).toBe(true)
  })

  it('assigns type deptNode to every node', () => {
    const { rfNodes } = buildOrgLayout([makeNode('a')])
    expect(rfNodes[0].type).toBe('deptNode')
  })

  it('includes node name and memberCount in data', () => {
    const node = { ...makeNode('a'), name: 'Engineering', members: [{} as never, {} as never] }
    const { rfNodes } = buildOrgLayout([node])
    expect(rfNodes[0].data.label).toBe('Engineering')
    expect(rfNodes[0].data.memberCount).toBe(2)
  })

  it('assigns numeric positions from dagre', () => {
    const nodes = [makeNode('a'), makeNode('b', 'a')]
    const { rfNodes } = buildOrgLayout(nodes)
    for (const n of rfNodes) {
      expect(typeof n.position.x).toBe('number')
      expect(typeof n.position.y).toBe('number')
    }
  })

  it('produces stable output — same input same positions', () => {
    const nodes = [makeNode('a'), makeNode('b', 'a'), makeNode('c', 'b')]
    const first = buildOrgLayout(nodes)
    const second = buildOrgLayout(nodes)
    expect(first.rfNodes.map(n => n.position)).toEqual(second.rfNodes.map(n => n.position))
  })

  it('silently ignores parent_id pointing to a non-existent node', () => {
    const nodes = [makeNode('b', 'missing-id')]
    const { rfNodes, rfEdges } = buildOrgLayout(nodes)
    expect(rfNodes).toHaveLength(1)
    expect(rfEdges).toHaveLength(0)
  })
})
