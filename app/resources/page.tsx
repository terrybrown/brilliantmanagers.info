import { getAllResources } from '@/lib/db/resources'
import { ResourceSearch } from '@/components/resources/ResourceSearch'

export const metadata = { title: 'Resources' }
export const revalidate = 86400

export default async function ResourcesPage() {
  const resources = await getAllResources()
  return <ResourceSearch resources={resources} />
}
