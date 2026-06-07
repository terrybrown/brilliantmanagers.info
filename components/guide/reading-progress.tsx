'use client'

import { useEffect, useState } from 'react'

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function update() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'var(--color-border)',
        zIndex: 60,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'var(--color-accent)',
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  )
}
