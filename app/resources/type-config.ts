import type { Resource } from '@/lib/db/resources'

export interface TypeConfig {
  slug: string
  dbType: Resource['resource_type']
  label: string
}

export const TYPE_CONFIG: TypeConfig[] = [
  { slug: 'books',    dbType: 'book',    label: 'Books' },
  { slug: 'articles', dbType: 'article', label: 'Articles' },
  { slug: 'courses',  dbType: 'course',  label: 'Courses' },
  { slug: 'videos',   dbType: 'video',   label: 'Videos' },
  { slug: 'people',   dbType: 'person',  label: 'People worth following' },
  { slug: 'podcasts', dbType: 'podcast', label: 'Podcasts' },
  { slug: 'tools',    dbType: 'tool',    label: 'Tools & assessments' },
]
