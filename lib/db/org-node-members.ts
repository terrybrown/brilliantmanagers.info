import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function addUserToNode(params: {
  nodeId: string
  userId: string
  actorId: string
}): Promise<void> {
  const supabase = await createClient()

  const { data: node, error: nodeError } = await supabase
    .from('org_nodes')
    .select('org_id, parent_id')
    .eq('id', params.nodeId)
    .single()

  if (nodeError) throw nodeError
  if (!node) throw new Error('Node not found')

  const { error: memberError } = await supabase.from('org_members').upsert(
    { org_id: node.org_id, user_id: params.userId, role: 'member' },
    { onConflict: 'org_id,user_id', ignoreDuplicates: true }
  )
  if (memberError) throw memberError

  const { error: insertError } = await supabase
    .from('org_node_members')
    .insert({ node_id: params.nodeId, user_id: params.userId })
  if (insertError) throw insertError

  // Note: if connectToAncestor throws after the insert above, the org_node_members
  // row is already written. Supabase JS has no client-side transactions; use an RPC
  // if atomic behaviour is required.
  if (node.parent_id) {
    await connectToAncestor(supabase, node.parent_id, params.userId, params.actorId, new Set([params.nodeId]))
  }
}

async function connectToAncestor(
  supabase: SupabaseClient,
  ancestorNodeId: string,
  newUserId: string,
  actorId: string,
  visited: Set<string>
): Promise<void> {
  if (visited.has(ancestorNodeId)) throw new Error(`Cycle detected in org_nodes parent_id at node ${ancestorNodeId}`)
  visited.add(ancestorNodeId)

  const { data: ancestorMembers, error: membersError } = await supabase
    .from('org_node_members')
    .select('user_id')
    .eq('node_id', ancestorNodeId)

  if (membersError) throw membersError

  if (ancestorMembers && ancestorMembers.length > 0) {
    for (const member of ancestorMembers as { user_id: string }[]) {
      if (!member.user_id) continue  // skip dirty rows
      const { error: connError } = await supabase.from('connections').upsert(
        {
          manager_id: member.user_id,
          direct_report_id: newUserId,
          status: 'active',
          initiated_by: actorId,
        },
        { onConflict: 'manager_id,direct_report_id', ignoreDuplicates: true }
      )
      if (connError) throw connError
    }
    return
  }

  const { data: ancestorNode, error: ancestorError } = await supabase
    .from('org_nodes')
    .select('parent_id')
    .eq('id', ancestorNodeId)
    .maybeSingle()

  if (ancestorError) throw ancestorError
  if (!ancestorNode) return  // orphaned node — stop recursing

  if (ancestorNode.parent_id) {
    await connectToAncestor(supabase, ancestorNode.parent_id, newUserId, actorId, visited)
  }
}

export async function removeUserFromNode(nodeId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_node_members')
    .delete()
    .eq('node_id', nodeId)
    .eq('user_id', userId)
  if (error) throw error
}
