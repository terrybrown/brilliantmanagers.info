import { compileMDX } from 'next-mdx-remote/rsc'
import { readFile, readdir } from 'fs/promises'
import path from 'path'

export interface GuideFrontmatter {
  title: string
  excerpt?: string
  weight?: number
}

export interface BlogFrontmatter {
  title: string
  date: string
  excerpt?: string
}

const contentDir = path.join(process.cwd(), 'content')

async function readMdx(filePath: string) {
  return readFile(filePath, 'utf-8')
}

export async function getGuideChapter(
  slug: string[],
  components: Record<string, React.ComponentType<any>> = {}
) {
  const filePath = path.join(contentDir, 'guide', `${slug.join('/')}.mdx`)
  const source = await readMdx(filePath)

  const { content, frontmatter } = await compileMDX<GuideFrontmatter>({
    source,
    components,
    options: { parseFrontmatter: true },
  })

  return { content, frontmatter }
}

export async function getGuideIndex(
  components: Record<string, React.ComponentType<any>> = {}
) {
  return getGuideChapter(['index'], components)
}

export async function getBlogPost(
  slug: string,
  components: Record<string, React.ComponentType<any>> = {}
) {
  const filePath = path.join(contentDir, 'blog', `${slug}.mdx`)
  const source = await readMdx(filePath)

  const { content, frontmatter } = await compileMDX<BlogFrontmatter>({
    source,
    components,
    options: { parseFrontmatter: true },
  })

  return { content, frontmatter }
}

export async function getAllBlogPosts(): Promise<
  Array<{ slug: string; frontmatter: BlogFrontmatter }>
> {
  const blogDir = path.join(contentDir, 'blog')
  const files = await readdir(blogDir)
  const mdxFiles = files.filter((f) => f.endsWith('.mdx'))

  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace('.mdx', '')
      const source = await readMdx(path.join(blogDir, file))
      const { frontmatter } = await compileMDX<BlogFrontmatter>({
        source,
        options: { parseFrontmatter: true },
      })
      return { slug, frontmatter }
    })
  )

  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  )
}
