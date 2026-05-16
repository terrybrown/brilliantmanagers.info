import { compileMDX } from 'next-mdx-remote/rsc'
import { readFile, readdir } from 'fs/promises'
import path from 'path'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'

export interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

export function extractHeadings(source: string): TocItem[] {
  const headings: TocItem[] = []
  for (const line of source.split('\n')) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (!match) continue
    const level = match[1].length as 2 | 3
    const text = match[2].trim()
    // github-slugger style: lowercase, strip non-alphanumeric except spaces/hyphens, collapse spaces to hyphens
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
    headings.push({ id, text, level })
  }
  return headings
}

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
): Promise<{ content: React.ReactElement; frontmatter: GuideFrontmatter; headings: TocItem[] }> {
  const filePath = path.join(contentDir, 'guide', `${slug.join('/')}.mdx`)
  const source = await readMdx(filePath)

  const headings = extractHeadings(source)

  const { content, frontmatter } = await compileMDX<GuideFrontmatter>({
    source,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug],
      },
    },
  })

  return { content, frontmatter, headings }
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
    options: { parseFrontmatter: true, mdxOptions: { remarkPlugins: [remarkGfm] } },
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
