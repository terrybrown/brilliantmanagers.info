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
import { ok, err, type ActionResult } from '@/lib/action-result'

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

// Returns ActionResult — use this in client components with useMutation.
export async function createOrgActionResult(formData: FormData): Promise<ActionResult> {
  const user = await getUser()
  const name = (formData.get('name') as string).trim()
  if (!name) return err('Organisation name is required.')
  try {
    const org = await createOrg(name)
    await logAudit({ actorId: user.id, action: 'org.create', entityType: 'organisation', entityId: org.id, metadata: { name } })
  } catch {
    return err('Failed to create organisation. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}

// Void wrapper for native form action use in OrgSection.tsx (server-component-compatible form).
// Migrate OrgSection to useMutation + createOrgActionResult when converting to full client pattern.
export async function createOrgAction(formData: FormData): Promise<void> {
  const result = await createOrgActionResult(formData)
  if (!result.ok) throw new Error(result.error)
}

// ── Org settings ─────────────────────────────────────────────────────────────

export async function updateOrgNameAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const name = (formData.get('name') as string).trim()
  if (!orgId || !name) return err('Organisation name is required.')

  const user = await requireOrgAdmin(orgId)
  try {
    await updateOrgName(orgId, name)
    await logAudit({ actorId: user.id, action: 'org.update', entityType: 'organisation', entityId: orgId, metadata: { name } })
  } catch {
    return err('Failed to update organisation name. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}

// ── Node management ───────────────────────────────────────────────────────────

export async function createNodeAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const parentId = (formData.get('parentId') as string | null) || null
  const name = (formData.get('name') as string).trim()
  const nodeType = (formData.get('nodeType') as string | null)?.trim() || null

  if (!orgId || !name) return err('Node name is required.')
  const user = await requireOrgAdmin(orgId)

  try {
    const node = await createNode({ orgId, parentId, name, nodeType })
    await logAudit({ actorId: user.id, action: 'org_node.create', entityType: 'org_node', entityId: node.id, metadata: { name, nodeType, parentId } })
  } catch {
    return err('Failed to create node. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}

export async function renameNodeAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const name = (formData.get('name') as string).trim()
  const nodeType = (formData.get('nodeType') as string | null)?.trim() || null

  if (!orgId || !nodeId || !name) return err('Node name is required.')
  const user = await requireOrgAdmin(orgId)

  try {
    await renameNode(nodeId, orgId, name, nodeType)
    await logAudit({ actorId: user.id, action: 'org_node.update', entityType: 'org_node', entityId: nodeId, metadata: { name, nodeType } })
  } catch {
    return err('Failed to rename node. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}

export async function deleteNodeAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  if (!orgId || !nodeId) return err('Missing fields.')

  const user = await requireOrgAdmin(orgId)
  try {
    await deleteNode(nodeId, orgId)
    await logAudit({ actorId: user.id, action: 'org_node.delete', entityType: 'org_node', entityId: nodeId })
  } catch {
    return err('Failed to delete node. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}

// ── Member management ─────────────────────────────────────────────────────────

export async function addMemberToNodeAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!orgId || !nodeId || !email) return err('Missing fields')

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
    return ok()
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
  } catch (emailErr) {
    console.error('Failed to send org node invite email:', emailErr)
  }

  revalidatePath('/people')
  return ok()
}

export async function cancelPendingOrgNodeInvitationAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const invitationId = formData.get('invitationId') as string
  if (!orgId || !invitationId) return err('Missing fields.')

  const actor = await requireOrgAdmin(orgId)
  try {
    await deletePendingOrgNodeInvitationById(invitationId, orgId)
    await logAudit({ actorId: actor.id, action: 'org_node_invite.cancel', entityType: 'org_node', entityId: invitationId })
  } catch {
    return err('Failed to cancel invitation. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}

export async function removeMemberFromNodeAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !nodeId || !userId) return err('Missing fields.')

  const actor = await requireOrgAdmin(orgId)
  try {
    await removeUserFromNode(nodeId, userId)
    await logAudit({ actorId: actor.id, action: 'org_node_member.remove', entityType: 'org_node_member', entityId: nodeId, metadata: { userId } })
  } catch {
    return err('Failed to remove member. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}

export async function promoteMemberAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !userId) return err('Missing fields.')

  const actor = await requireOrgAdmin(orgId)
  try {
    await setOrgRole(orgId, userId, 'org_admin')
    await logAudit({ actorId: actor.id, action: 'org_member.promote', entityType: 'org_member', entityId: userId, metadata: { orgId } })
  } catch {
    return err('Failed to promote member. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}

export async function demoteMemberAction(formData: FormData): Promise<ActionResult> {
  const orgId = formData.get('orgId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !userId) return err('Missing fields.')

  const actor = await requireOrgAdmin(orgId)
  if (actor.id === userId) return err('Cannot demote yourself.')
  try {
    await setOrgRole(orgId, userId, 'member')
    await logAudit({ actorId: actor.id, action: 'org_member.demote', entityType: 'org_member', entityId: userId, metadata: { orgId } })
  } catch {
    return err('Failed to demote member. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}
