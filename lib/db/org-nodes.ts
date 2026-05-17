import { createClient } from '@/lib/supabase/server'

interface RawNodeRow {
  id: string
  org_id: string
  parent_id: string | null
  name: string
  node_type: string | null
  created_at: string
  org_node_members: { user_id: string; profiles: { email: string | null; display_name: string | null } | null }[]
}

interface RawNodeInsertRow {
  id: string
  org_id: string
  parent_id: string | null
  name: string
  node_type: string | null
  created_at: string
}

export interface OrgNode {
  id: string
  org_id: string
  parent_id: string | null
  name: string
  node_type: string | null
  created_at: string
  members: { user_id: string; email: string | null; display_name: string | null }[]
}

export async function createNode(params: {
  orgId: string
  parentId: string | null
  name: string
  nodeType?: string | null
}): Promise<OrgNode> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_nodes')
    .insert({
      org_id: params.orgId,
      parent_id: params.parentId ?? null,
      name: params.name,
      node_type: params.nodeType ?? null,
    })
    .select('id, org_id, parent_id, name, node_type, created_at')
    .single()
  if (error) throw error
  if (!data) throw new Error('No data returned from org_nodes insert')
  const raw = data as RawNodeInsertRow
  return { ...raw, members: [] }
}

// Caller must verify org_admin role — RLS enforces this for user-scoped clients.
// Silent no-op if nodeId does not exist (Postgres UPDATE on zero rows is not an error).
export async function renameNode(nodeId: string, orgId: string, name: string, nodeType: string | null): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_nodes')
    .update({ name, node_type: nodeType })
    .eq('id', nodeId)
    .eq('org_id', orgId)
  if (error) throw error
}

// Cascade on org_nodes.parent_id handles child nodes automatically.
// Silent no-op if nodeId does not exist (Postgres DELETE on zero rows is not an error).
export async function deleteNode(nodeId: string, orgId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_nodes')
    .delete()
    .eq('id', nodeId)
    .eq('org_id', orgId)
  if (error) throw error
}

export async function getNodesForOrg(orgId: string): Promise<OrgNode[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_nodes')
    .select('id, org_id, parent_id, name, node_type, created_at, org_node_members(user_id, profiles(email, display_name))')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as RawNodeRow[] ?? []).map(node => ({
    id: node.id,
    org_id: node.org_id,
    parent_id: node.parent_id,
    name: node.name,
    node_type: node.node_type,
    created_at: node.created_at,
    members: node.org_node_members.map(m => ({
      user_id: m.user_id,
      email: m.profiles?.email ?? null,
      display_name: m.profiles?.display_name ?? null,
    })),
  }))
}
