import Link from 'next/link'
import { getAllBlogPosts } from '@/lib/mdx'

export const metadata = { title: 'Blog' }

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts()

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            The Blog
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
            Notes from the field — the messy parts, the surprising parts, and the stuff no one tells you upfront.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.slug}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 1px 2px rgba(40,60,45,.04), 0 2px 5px rgba(40,60,45,.03)',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <time
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-faint)',
                  marginBottom: 8,
                }}
                dateTime={post.frontmatter.date}
              >
                {new Date(post.frontmatter.date).toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1.35,
                  color: 'var(--color-text-primary)',
                  marginBottom: 8,
                }}
              >
                <Link href={`/blog/${post.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {post.frontmatter.title}
                </Link>
              </h2>
              {post.frontmatter.excerpt && (
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: 'var(--color-text-muted)',
                    marginBottom: 16,
                    flex: 1,
                  }}
                >
                  {post.frontmatter.excerpt}
                </p>
              )}
              <Link
                href={`/blog/${post.slug}`}
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none', alignSelf: 'flex-start' }}
              >
                Read →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
