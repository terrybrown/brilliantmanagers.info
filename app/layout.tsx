import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import Script from 'next/script'
import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { siteConfig } from '@/config/site'
import { createClient } from '@/lib/supabase/server'
import './globals.css'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s — ${siteConfig.title}`,
  },
  description: siteConfig.description,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) console.error('[layout] auth error:', authError.message)

  return (
    <html lang="en" className={`${jakartaSans.variable} ${inter.variable}`}>
      <body>
        <div className="flex min-h-screen flex-col">
          <Nav isAuthenticated={!!user} />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${siteConfig.gaId}',{anonymize_ip:true})`}
        </Script>
      </body>
    </html>
  )
}
