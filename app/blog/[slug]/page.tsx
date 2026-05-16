import { notFound } from 'next/navigation'
import { getBlogPost, getAllBlogPosts } from '@/lib/mdx'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  try {
    const { frontmatter } = await getBlogPost(slug)
    return { title: frontmatter.title }
  } catch {
    return { title: 'Post not found' }
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params

  let post
  try {
    post = await getBlogPost(slug)
  } catch {
    notFound()
  }

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--prose-width)' }}
      >
        <header className="mb-10">
          <time
            className="mb-3 block text-xs uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
            dateTime={post.frontmatter.date}
          >
            {new Date(post.frontmatter.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
          <h1
            className="leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            {post.frontmatter.title}
          </h1>
        </header>
        <div className="prose">{post.content}</div>
      </div>
    </div>
  )
}
