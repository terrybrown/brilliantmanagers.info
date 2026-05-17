import { createClient } from '@/lib/supabase/server'

export async function logAudit(params: {
  actorId: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('audit_log').insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? null,
    })
  } catch {
    console.warn('[audit] Failed to write entry for action:', params.action)
  }
}
