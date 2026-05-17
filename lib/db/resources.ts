import { createClient } from '@/lib/supabase/server'

export interface Resource {
  id: string
  title: string
  url: string
  description: string
  resource_type: 'book' | 'article' | 'course' | 'video' | 'person' | 'podcast' | 'tool'
  author: string | null
  created_at: string
  updated_at: string
}

export async function getResourcesForSkill(skillKey: string): Promise<Resource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('skill_resources')
    .select('resource_id, relevance_score, resources(*)')
    .eq('skill_key', skillKey)
    .order('relevance_score', { ascending: false })
    .limit(8)
  if (error) throw error
  return (data ?? []).map((row: any) => row.resources as Resource)
}

export async function getAllResources(): Promise<Resource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('resource_type')
    .order('title')
  if (error) throw error
  return (data ?? []) as Resource[]
}

export async function getResourcesByType(type: Resource['resource_type']): Promise<Resource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('resource_type', type)
    .order('title')
  if (error) throw error
  return (data ?? []) as Resource[]
}
