import * as dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { OrgNode } from '@/lib/db/org-nodes'

const NODE_WIDTH = 160
const NODE_HEIGHT = 48

export type DeptNodeData = {
  label: string
  memberCount: number
}

export function buildOrgLayout(orgNodes: OrgNode[]): {
  rfNodes: Node<DeptNodeData>[]
  rfEdges: Edge[]
} {
  if (orgNodes.length === 0) return { rfNodes: [], rfEdges: [] }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 })

  for (const node of orgNodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  const validIds = new Set(orgNodes.map(n => n.id))
  for (const node of orgNodes) {
    if (node.parent_id && validIds.has(node.parent_id)) {
      g.setEdge(node.parent_id, node.id)
    }
  }

  dagre.layout(g)

  const rfNodes: Node<DeptNodeData>[] = orgNodes.map(node => {
    const pos = g.node(node.id)
    if (!pos) {
      console.warn(`dagre did not lay out node ${node.id} — using origin`)
      return { id: node.id, type: 'deptNode', position: { x: 0, y: 0 }, data: { label: node.name, memberCount: node.members.length } }
    }
    const { x, y } = pos
    return {
      id: node.id,
      type: 'deptNode',
      // dagre gives centre coords; React Flow expects top-left corner
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { label: node.name, memberCount: node.members.length },
    }
  })

  const rfEdges: Edge[] = orgNodes
    .filter(n => n.parent_id && validIds.has(n.parent_id))
    .map(n => ({
      id: `e-${n.parent_id}-${n.id}`,
      source: n.parent_id!,
      target: n.id,
      type: 'smoothstep',
      style: { stroke: 'var(--color-border)', strokeWidth: 1.5 },
    }))

  return { rfNodes, rfEdges }
}
