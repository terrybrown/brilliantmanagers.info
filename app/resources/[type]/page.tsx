import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getResourcesByType } from '@/lib/db/resources'
import { TYPE_CONFIG } from '../type-config'
import { ResourceSearch } from '@/components/resources/ResourceSearch'

export const revalidate = 86400

export async function generateStaticParams() {
  return TYPE_CONFIG.map(t => ({ type: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>
}): Promise<Metadata> {
  const { type } = await params
  const config = TYPE_CONFIG.find(t => t.slug === type)
  return { title: config?.label ?? 'Resources' }
}

export default async function ResourceTypePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  const config = TYPE_CONFIG.find(t => t.slug === type)
  if (!config) notFound()

  const resources = await getResourcesByType(config.dbType)
  return <ResourceSearch resources={resources} />
}
