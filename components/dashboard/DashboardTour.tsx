'use client'

import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { MANAGER_TOUR_EVENT } from '@/components/dashboard/DashboardManagerTour'

const TOUR_SEEN_KEY = 'bm_tour_seen'

function readLocalStorage(key: string) {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function el(id: string) {
  return document.getElementById(id)
}

function buildSteps() {
  const steps: { element: string; popover: { title: string; description: string } }[] = []

  if (el('nav-dashboard')) {
    steps.push({
      element: '#nav-dashboard',
      popover: {
        title: 'Your command centre',
        description:
          "This is your dashboard — a live picture of where you stand as a manager. Once you've completed a scorecard, your radar, pillar scores, and growth goals all live here.",
      },
    })
  }

  if (el('nav-growth')) {
    steps.push({
      element: '#nav-growth',
      popover: {
        title: "Track what you're working on",
        description:
          'The Growth section shows your active development goals and how your scores have shifted between rounds. Set a goal on any skill and revisit it at your next 1:1.',
      },
    })
  }

  if (el('nav-people')) {
    steps.push({
      element: '#nav-people',
      popover: {
        title: 'Your team',
        description:
          'Team & Org is where you manage connections — invite direct reports, accept manager invites, and see everyone in your management network.',
      },
    })
  }

  if (el('nav-avatar')) {
    steps.push({
      element: '#nav-avatar',
      popover: {
        title: 'Your profile',
        description:
          'Your account settings and notification preferences live here. You can also control whether you score your direct reports blind or after seeing their self-assessment.',
      },
    })
  }

  if (el('dashboard-cta-btn')) {
    steps.push({
      element: '#dashboard-cta-btn',
      popover: {
        title: 'Ready to get started?',
        description:
          'Your first scorecard takes about ten minutes. Score yourself honestly across five pillars — there are no right answers, only useful ones.',
      },
    })
  }

  return steps
}

export function DashboardTour() {
  const [promptHidden, setPromptHidden] = useState(() => readLocalStorage(TOUR_SEEN_KEY))

  function startTour() {
    const steps = buildSteps()
    if (steps.length === 0) return
    const driverObj = driver({
      animate: true,
      smoothScroll: true,
      allowClose: true,
      showProgress: true,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: 'bm-tour-popover',
      steps,
      onDestroyed: () => {
        try {
          localStorage.setItem(TOUR_SEEN_KEY, '1')
        } catch { /* ignore */ }
        setPromptHidden(true)
      },
    })
    driverObj.drive()
  }

  useEffect(() => {
    if (readLocalStorage(TOUR_SEEN_KEY)) return
    const timer = setTimeout(startTour, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.addEventListener(MANAGER_TOUR_EVENT, startTour)
    return () => window.removeEventListener(MANAGER_TOUR_EVENT, startTour)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismissPrompt() {
    try {
      localStorage.setItem(TOUR_SEEN_KEY, '1')
    } catch { /* ignore */ }
    setPromptHidden(true)
  }

  if (promptHidden) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-accent-wash)',
        border: '1px solid var(--color-accent-border)',
        borderRadius: 12,
        marginBottom: 32,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={startTour}
        style={{
          flex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 20px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-accent)',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="5,3 19,12 5,21" />
        </svg>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left' }}>
          <span>Take a 30-second tour of Brilliant Managers</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-faint)' }}>
            Let us show you around the tool
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={dismissPrompt}
        aria-label="Dismiss tour prompt"
        style={{
          padding: '11px 16px',
          color: 'var(--color-text-faint)',
          background: 'transparent',
          border: 'none',
          borderLeft: '1px solid var(--color-border)',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        ×
      </button>
    </div>
  )
}
