import { notFound } from 'next/navigation'
import { getGuideChapter } from '@/lib/mdx'
import { getPrevNextChapters, GUIDE_SECTION_LABELS, GUIDE_SECTIONS } from '@/lib/guide'
import { guideComponents } from '@/components/guide/mdx-components'
import { ChapterNav } from '@/components/guide/chapter-nav'
import { ChapterToc } from '@/components/guide/chapter-toc'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  return GUIDE_SECTIONS.map((section) => ({ slug: [section] }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const section = slug[0] as keyof typeof GUIDE_SECTION_LABELS
  return { title: GUIDE_SECTION_LABELS[section] ?? 'The Guide' }
}

export default async function GuideChapterPage({ params }: Props) {
  const { slug } = await params

  let chapter
  try {
    chapter = await getGuideChapter(slug, guideComponents)
  } catch {
    notFound()
  }

  const { prev, next } = getPrevNextChapters(slug)
  const activeSlug = slug[0]

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto flex gap-8 px-6 pt-16 pb-20"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <ChapterNav activeSlug={activeSlug} />
        </aside>

        {/* Main content */}
        <article className="min-w-0 flex-1">
          <header className="mb-10">
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}
            >
              {GUIDE_SECTION_LABELS[activeSlug as keyof typeof GUIDE_SECTION_LABELS]}
            </p>
            <h1
              className="leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--color-text-primary)',
              }}
            >
              {chapter.frontmatter.title}
            </h1>
          </header>

          <div className="prose">{chapter.content}</div>

          {/* Prev/next navigation */}
          <div
            className="mt-12 flex justify-between border-t pt-6"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {prev ? (
              <Link
                href={`/the-guide/${prev.slug[0]}`}
                className="text-sm font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                ← {prev.label}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/the-guide/${next.slug[0]}`}
                className="text-sm font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                {next.label} →
              </Link>
            )}
          </div>
        </article>

        {/* TOC */}
        <aside className="hidden xl:block">
          <ChapterToc items={chapter.headings} />
        </aside>
      </div>
    </div>
  )
}
