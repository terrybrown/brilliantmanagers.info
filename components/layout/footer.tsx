import Link from 'next/link'
import { siteConfig } from '@/config/site'

export function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        background: '#1a3a5c',
        borderColor: 'rgba(254,252,247,0.08)',
      }}
    >
      <div
        className="mx-auto flex flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <p className="text-xs" style={{ color: 'rgba(254,252,247,0.35)' }}>
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
              style={{ color: 'rgba(254,252,247,0.35)' }}
            >
              {key}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
