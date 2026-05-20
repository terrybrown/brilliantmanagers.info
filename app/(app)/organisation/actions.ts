'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOrgRole } from '@/lib/auth/roles'
import { createOrg, updateOrgName } from '@/lib/db/organisations'
import { setOrgRole } from '@/lib/db/org-members'
import { createNode, renameNode, deleteNode } from '@/lib/db/org-nodes'
import { addUserToNode, removeUserFromNode } from '@/lib/db/org-node-members'
import { logAudit } from '@/lib/audit'
import { createPendingOrgNodeInvitation, deletePendingOrgNodeInvitationById } from '@/lib/db/pending-org-node-invitations'
import { buildOrgNodeInviteEmail } from '@/lib/email/templates/org-node-invite'
import { sendEmail } from '@/lib/email/mailgun'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

async function requireOrgAdmin(orgId: string) {
  const user = await getUser()
  const role = await getOrgRole(user.id, orgId)
  if (role !== 'org_admin') redirect('/people')
  return user
}

// ── Org creation ──────────────────────────────────────────────────────────────

export async function createOrgAction(formData: FormData): Promise<void> {
  const user = await getUser()
  const name = (formData.get('name') as string).trim()
  if (!name) return

  const org = await createOrg(name)
  await logAudit({ actorId: user.id, action: 'org.create', entityType: 'organisation', entityId: org.id, metadata: { name } })
  revalidatePath('/people')
}

// ── Org settings ─────────────────────────────────────────────────────────────

export async function updateOrgNameAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const name = (formData.get('name') as string).trim()
  if (!orgId || !name) return

  const user = await requireOrgAdmin(orgId)
  await updateOrgName(orgId, name)
  await logAudit({ actorId: user.id, action: 'org.update', entityType: 'organisation', entityId: orgId, metadata: { name } })
  revalidatePath('/people')
}

// ── Node management ───────────────────────────────────────────────────────────

export async function createNodeAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const parentId = (formData.get('parentId') as string | null) || null
  const name = (formData.get('name') as string).trim()
  const nodeType = (formData.get('nodeType') as string | null)?.trim() || null

  if (!orgId || !name) return
  const user = await requireOrgAdmin(orgId)

  const node = await createNode({ orgId, parentId, name, nodeType })
  await logAudit({ actorId: user.id, action: 'org_node.create', entityType: 'org_node', entityId: node.id, metadata: { name, nodeType, parentId } })
  revalidatePath('/people')
}

export async function renameNodeAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const name = (formData.get('name') as string).trim()
  const nodeType = (formData.get('nodeType') as string | null)?.trim() || null

  if (!orgId || !nodeId || !name) return
  const user = await requireOrgAdmin(orgId)

  await renameNode(nodeId, orgId, name, nodeType)
  await logAudit({ actorId: user.id, action: 'org_node.update', entityType: 'org_node', entityId: nodeId, metadata: { name, nodeType } })
  revalidatePath('/people')
}

export async function deleteNodeAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  if (!orgId || !nodeId) return

  const user = await requireOrgAdmin(orgId)
  await deleteNode(nodeId, orgId)
  await logAudit({ actorId: user.id, action: 'org_node.delete', entityType: 'org_node', entityId: nodeId })
  revalidatePath('/people')
}

// ── Member management ─────────────────────────────────────────────────────────

export async function addMemberToNodeAction(formData: FormData): Promise<{ error?: string }> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!orgId || !nodeId || !email) return { error: 'Missing fields' }

  const actor = await requireOrgAdmin(orgId)

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (profile) {
    await addUserToNode({ nodeId, userId: profile.id, actorId: actor.id })
    await logAudit({ actorId: actor.id, action: 'org_node_member.add', entityType: 'org_node_member', entityId: nodeId, metadata: { email } })
    revalidatePath('/people')
    return {}
  }

  // Unregistered user — create pending invite and send email
  const [{ data: orgData }, { data: nodeData }, { data: actorProfile }] = await Promise.all([
    supabase.from('organisations').select('name').eq('id', orgId).single(),
    supabase.from('org_nodes').select('name').eq('id', nodeId).single(),
    supabase.from('profiles').select('display_name, email').eq('id', actor.id).single(),
  ])

  await createPendingOrgNodeInvitation({ inviterId: actor.id, invitedEmail: email, orgId, nodeId })
  await logAudit({ actorId: actor.id, action: 'org_node_invite.create', entityType: 'org_node', entityId: nodeId, metadata: { email } })

  try {
    const { subject, html } = buildOrgNodeInviteEmail({
      inviterName: actorProfile?.display_name ?? actorProfile?.email ?? 'A colleague',
      orgName: orgData?.name ?? 'your organisation',
      nodeName: nodeData?.name ?? 'a team',
    })
    await sendEmail({ to: email, subject, html })
  } catch (err) {
    console.error('Failed to send org node invite email:', err)
  }

  revalidatePath('/people')
  return {}
}

export async function cancelPendingOrgNodeInvitationAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const invitationId = formData.get('invitationId') as string
  if (!orgId || !invitationId) return

  const actor = await requireOrgAdmin(orgId)
  await deletePendingOrgNodeInvitationById(invitationId, orgId)
  await logAudit({ actorId: actor.id, action: 'org_node_invite.cancel', entityType: 'org_node', entityId: invitationId })
  revalidatePath('/people')
}

export async function removeMemberFromNodeAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !nodeId || !userId) return

  const actor = await requireOrgAdmin(orgId)
  await removeUserFromNode(nodeId, userId)
  await logAudit({ actorId: actor.id, action: 'org_node_member.remove', entityType: 'org_node_member', entityId: nodeId, metadata: { userId } })
  revalidatePath('/people')
}

export async function promoteMemberAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !userId) return

  const actor = await requireOrgAdmin(orgId)
  await setOrgRole(orgId, userId, 'org_admin')
  await logAudit({ actorId: actor.id, action: 'org_member.promote', entityType: 'org_member', entityId: userId, metadata: { orgId } })
  revalidatePath('/people')
}

// Void wrapper — used as a plain form action in server components where the
// error return value from addMemberToNodeAction cannot be consumed.
// On error, redirects to the org page with an addError query param so the
// user sees feedback rather than a silent no-op.
export async function addMemberToNodeVoidAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const result = await addMemberToNodeAction(formData)
  if (result.error) {
    redirect(`/people?org=${orgId}&addError=${encodeURIComponent(result.error)}`)
  }
}

export async function demoteMemberAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !userId) return

  const actor = await requireOrgAdmin(orgId)
  if (actor.id === userId) return // Cannot demote self
  await setOrgRole(orgId, userId, 'member')
  await logAudit({ actorId: actor.id, action: 'org_member.demote', entityType: 'org_member', entityId: userId, metadata: { orgId } })
  revalidatePath('/people')
}
