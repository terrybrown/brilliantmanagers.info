import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Brilliant Managers — A field guide to management'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const interBold = fetch(
    new URL('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2'),
  ).then((res) => res.arrayBuffer())

  const interRegular = fetch(
    new URL('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'),
  ).then((res) => res.arrayBuffer())

  const [boldData, regularData] = await Promise.all([interBold, interRegular])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#0E7C6B',
          fontFamily: 'Inter',
        }}
      >
        {/* Top: logo mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Simplified checkbox icon */}
          <div
            style={{
              width: 52,
              height: 52,
              border: '3px solid rgba(255,255,255,0.7)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 26,
                height: 16,
                borderLeft: '3px solid white',
                borderBottom: '3px solid white',
                transform: 'rotate(-45deg) translateY(-3px)',
              }}
            />
          </div>
          <span
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.3px',
            }}
          >
            brilliantmanagers.info
          </span>
        </div>

        {/* Middle: main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              color: 'white',
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-2px',
            }}
          >
            Brilliant
            <br />
            Managers
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: 640,
            }}
          >
            A field guide to management — for people doing it on purpose.
          </div>
        </div>

        {/* Bottom: subtle tagline strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 18,
            fontWeight: 400,
          }}
        >
          <span>Self-reflection scorecard</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Manager insights</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Growth plans</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: boldData, style: 'normal', weight: 700 },
        { name: 'Inter', data: regularData, style: 'normal', weight: 400 },
      ],
    },
  )
}
