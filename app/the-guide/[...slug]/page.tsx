import { notFound } from 'next/navigation'
import { Clock, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { getGuideChapter } from '@/lib/mdx'
import {
  getPrevNextChapters,
  GUIDE_SECTION_LABELS,
  GUIDE_SECTION_ORDINALS,
  GUIDE_SECTIONS,
  type GuideSection,
} from '@/lib/guide'
import { guideComponents } from '@/components/guide/mdx-components'
import { ChapterNav } from '@/components/guide/chapter-nav'
import { ReadingProgressBar } from '@/components/guide/reading-progress'

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
  const activeSlug = slug[0] as GuideSection

  const pillarLabel = GUIDE_SECTION_LABELS[activeSlug]
  const pillarOrdinal = GUIDE_SECTION_ORDINALS[activeSlug]

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <ReadingProgressBar />

      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '40px 40px 80px',
          display: 'grid',
          gridTemplateColumns: '244px minmax(0, 1fr)',
          gap: 56,
        }}
      >
        {/* Left: sticky chapter nav */}
        <aside>
          <ChapterNav activeSlug={activeSlug} skills={chapter.skills} />
        </aside>

        {/* Right: reading column */}
        <article style={{ minWidth: 0, maxWidth: 740 }}>
          {/* Eyebrow */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {pillarLabel}
            </span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--color-text-faint)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-faint)',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
              }}
            >
              Pillar {pillarOrdinal} of {GUIDE_SECTIONS.length}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 46,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.025em',
              margin: '0 0 16px',
              lineHeight: 1.05,
            }}
          >
            {chapter.frontmatter.title}
          </h1>

          {/* Meta strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              flexWrap: 'wrap',
              paddingBottom: 22,
              marginBottom: 26,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13,
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Clock size={15} color="var(--color-text-faint)" />
              {chapter.readingTimeMinutes} min read
            </span>
            {chapter.skills.length > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <BookOpen size={15} color="var(--color-text-faint)" />
                {chapter.skills.length} skill{chapter.skills.length !== 1 ? 's' : ''}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {/* TODO: replace '—' with real pillar score once user data is wired */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 9,
                padding: '6px 12px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              Your {pillarLabel} score&nbsp;
              <strong
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                }}
              >
                —
              </strong>
            </span>
          </div>

          {/* Lede from frontmatter excerpt */}
          {chapter.frontmatter.excerpt && (
            <p
              style={{
                fontSize: 21,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-reading), Georgia, serif',
                lineHeight: 1.55,
                margin: '0 0 28px',
                fontWeight: 500,
              }}
            >
              {chapter.frontmatter.excerpt}
            </p>
          )}

          {/* MDX content */}
          <div className="prose guide-prose">{chapter.content}</div>

          {/* Prev / Next pillar cards */}
          <div style={{ display: 'flex', gap: 14, marginTop: 48 }}>
            {prev ? (
              <Link
                href={`/the-guide/${prev.slug[0]}`}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  textDecoration: 'none',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-faint)',
                    fontFamily: 'var(--font-body)',
                    marginBottom: 4,
                  }}
                >
                  ← Previous pillar
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {prev.label}
                </div>
              </Link>
            ) : (
              <div
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  opacity: 0.45,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-faint)',
                    fontFamily: 'var(--font-body)',
                    marginBottom: 4,
                  }}
                >
                  Previous
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  —
                </div>
              </div>
            )}

            {next ? (
              <Link
                href={`/the-guide/${next.slug[0]}`}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: '1px solid var(--color-accent-border)',
                  background: 'var(--color-accent-wash)',
                  textDecoration: 'none',
                  textAlign: 'right' as const,
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-accent)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Next pillar →
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {next.label}
                </div>
              </Link>
            ) : (
              <div
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  opacity: 0.45,
                  textAlign: 'right' as const,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-faint)',
                    fontFamily: 'var(--font-body)',
                    marginBottom: 4,
                  }}
                >
                  Next →
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  —
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
