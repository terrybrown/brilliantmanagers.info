import Link from 'next/link'
import { siteConfig } from '@/config/site'

export function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        background: 'var(--color-nav-bg)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="mx-auto flex flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
          © {new Date().getFullYear()} Brilliant Managers
        </p>
        <div className="flex gap-5">
          {Object.entries(siteConfig.social).map(([key, url]) => (
            <Link
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs capitalize"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {key}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
