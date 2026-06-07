# Blog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `app/blog/page.tsx` and `app/blog/[slug]/page.tsx` to match the Sage design system — white cards, display font headings, consistent layout matching the new FAQ and Resources pages.

**Architecture:** Single-file changes only. The MDX data pipeline (`lib/mdx.ts`, `getAllBlogPosts`) is unchanged. Only JSX and styles change. `Separator` component is removed. Card layout matches the new Resources card aesthetic.

**Tech Stack:** Next.js App Router, Sage CSS tokens, `--font-display`, `--color-surface`, existing MDX data.

---

## File map

| File | Action |
|---|---|
| `app/blog/page.tsx` | Modify — new card design, remove Separator, update heading |
| `app/blog/[slug]/page.tsx` | Modify — update header styling, check for amber refs |

---

### Task 1: Restyle `app/blog/page.tsx`

**Files:**
- Modify: `app/blog/page.tsx`

- [ ] **Read the current file**

```bash
cat app/blog/page.tsx
```

- [ ] **Replace `app/blog/page.tsx` with the restyled version**

```tsx
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
```

- [ ] **Run tests**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info && npm test 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/blog/page.tsx
git commit -m "feat: restyle blog index page — white cards, display font, Sage tokens"
```

---

### Task 2: Audit and update `app/blog/[slug]/page.tsx`

**Files:**
- Modify: `app/blog/[slug]/page.tsx`

- [ ] **Read the current file**

```bash
cat app/blog/\[slug\]/page.tsx
```

- [ ] **Check for amber or old-design references**

```bash
grep -n "amber\|#f59e0b\|slate-[0-9]\|bg-slate\|text-slate" app/blog/\[slug\]/page.tsx
```

- [ ] **Update the page header to use Sage tokens**

Find the post title/heading element and ensure it uses `--font-display`. Find any `text-slate-*` colour classes and replace with Sage tokens:

- `text-slate-500` / `text-slate-400` → `style={{ color: 'var(--color-text-muted)' }}`
- `text-slate-600` → `style={{ color: 'var(--color-text-primary)' }}`
- Any `text-amber-*` → `style={{ color: 'var(--color-accent)' }}`

The post body is rendered via MDX components — check `components/guide/mdx-components.tsx` or equivalent for any amber references and fix those too.

```bash
grep -n "amber\|#f59e0b" components/guide/mdx-components.tsx 2>/dev/null || echo "No amber in mdx-components"
```

- [ ] **Run full test suite and build**

```bash
npm test 2>&1 | tail -6 && npm run build 2>&1 | grep -E "error TS|Type error|✓ Compiled" | head -5
```

- [ ] **Commit**

```bash
git add app/blog/\[slug\]/page.tsx
git commit -m "feat: update blog post page header to Sage tokens"
```

---

### Final: push and open PR

```bash
git push -u origin design/blog-redesign
gh pr create \
  --title "feat: restyle blog pages to Sage design system" \
  --body "Updates the blog index to use white surface cards with display font headings, matching the new FAQ and Resources pages. Removes the Separator component. Audits and updates the blog post page header for Sage token consistency. Zero logic changes." \
  --base master --assignee "@me"
```
