import { compileMDX } from 'next-mdx-remote/rsc'
import { readFile, readdir } from 'fs/promises'
import path from 'path'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { visit } from 'unist-util-visit'

export interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
}

export function extractHeadings(source: string): TocItem[] {
  const headings: TocItem[] = []
  for (const line of source.split('\n')) {
    // Markdown headings: ## and ###
    const mdMatch = line.match(/^(#{2,3})\s+(.+)$/)
    if (mdMatch) {
      const level = mdMatch[1].length as 2 | 3
      const text = mdMatch[2].trim()
      headings.push({ id: toSlug(text), text, level })
      continue
    }
    // HTML summary tags (used in <details> accordions) — may be indented
    const summaryMatch = line.match(/^\s*<summary>(.+?)<\/summary>\s*$/)
    if (summaryMatch) {
      const text = summaryMatch[1].trim()
      headings.push({ id: toSlug(text), text, level: 2 })
    }
  }
  return headings
}

// Minimal shape of an MDX JSX flow element node used by the rehype plugin below.
interface MdxJsxAttribute {
  type: string
  name: string
  value: string
}

interface MdxJsxNode {
  type: string
  name?: string
  value?: string
  children?: MdxJsxNode[]
  attributes?: MdxJsxAttribute[]
}

// Rehype plugin: adds id to <details> based on its <summary> text.
// In MDX, <details> are JSX flow elements (mdxJsxFlowElement), not HTML element
// nodes, so we must visit that type and use jsx attribute syntax.
function rehypeDetailsIds() {
  return (tree: MdxJsxNode) => {
    visit(tree, 'mdxJsxFlowElement', (node: MdxJsxNode) => {
      if (node.name !== 'details') return
      const summary = node.children?.find(
        (c) => c.type === 'mdxJsxFlowElement' && c.name === 'summary'
      )
      if (!summary) return
      const text = extractNodeText(summary)
      if (!text) return
      const id = toSlug(text)
      node.attributes = node.attributes ?? []
      const existing = node.attributes.findIndex((a) => a.name === 'id')
      if (existing >= 0) {
        node.attributes[existing].value = id
      } else {
        node.attributes.push({ type: 'mdxJsxAttribute', name: 'id', value: id })
      }
    })
  }
}

function extractNodeText(node: MdxJsxNode): string {
  if (node.type === 'text') return node.value ?? ''
  if (node.value && typeof node.value === 'string') return node.value
  if (node.children) return node.children.map(extractNodeText).join('')
  return ''
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

// MDX component maps accept components with varied prop shapes; using `any` here
// is intentional — the real union type is too complex and changes per-call-site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MdxComponents = Record<string, React.ComponentType<any>>

async function readMdx(filePath: string) {
  return readFile(filePath, 'utf-8')
}

export async function getGuideChapter(
  slug: string[],
  components: MdxComponents = {}
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
        rehypePlugins: [rehypeSlug, rehypeDetailsIds],
      },
    },
  })

  return { content, frontmatter, headings }
}

export async function getGuideIndex(
  components: MdxComponents = {}
) {
  return getGuideChapter(['index'], components)
}

export async function getBlogPost(
  slug: string,
  components: MdxComponents = {}
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
