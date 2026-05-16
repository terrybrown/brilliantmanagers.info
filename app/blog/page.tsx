import Link from 'next/link'
import { getAllBlogPosts } from '@/lib/mdx'
import { Separator } from '@/components/ui/separator'

export const metadata = { title: 'Blog' }

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts()

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-20"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header className="mb-8">
          <h1
            className="mb-2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            The Blog
          </h1>
          <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
            Notes from the field — the messy parts, the surprising parts, and the stuff no one tells you upfront.
          </p>
        </header>

        <Separator className="mb-8" style={{ background: 'var(--color-border)' }} />

        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-xl border p-5"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-reading)' }}
            >
              <time
                className="mb-2 block text-xs uppercase tracking-widest"
                style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
                dateTime={post.frontmatter.date}
              >
                {new Date(post.frontmatter.date).toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
              <h2
                className="mb-2 text-lg font-semibold leading-snug"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                <Link href={`/blog/${post.slug}`} className="hover:opacity-80">
                  {post.frontmatter.title}
                </Link>
              </h2>
              {post.frontmatter.excerpt && (
                <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {post.frontmatter.excerpt}
                </p>
              )}
              <Link
                href={`/blog/${post.slug}`}
                className="text-xs font-semibold"
                style={{ color: 'var(--color-accent)' }}
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
