'use client'
import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_SEEN_KEY = 'bm_manager_tour_seen'
const PROMPT_HIDDEN_KEY = 'bm_manager_tour_prompt_hidden'

export const MANAGER_TOUR_EVENT = 'bm:start-manager-tour'

function readLocalStorage(key: string) {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function DashboardManagerTour({ hasManagerStrip }: { hasManagerStrip: boolean }) {
  const [promptHidden, setPromptHidden] = useState(() => readLocalStorage(PROMPT_HIDDEN_KEY))

  function dismissPrompt() {
    try {
      localStorage.setItem(PROMPT_HIDDEN_KEY, '1')
    } catch { /* ignore */ }
    setPromptHidden(true)
  }

  function buildSteps() {
    const steps: { element: string; popover: { title: string; description: string } }[] = []

    if (hasManagerStrip && document.getElementById('manager-strip')) {
      steps.push({
        element: '#manager-strip',
        popover: {
          title: "You were invited by a direct report",
          description:
            "One of your direct reports has joined Brilliant Managers and added you as their manager. This strip shows who's ready for you to score — you'll appear here each time they complete a self-assessment.",
        },
      })
    }

    if (document.getElementById('nav-dashboard')) {
      steps.push({
        element: '#nav-dashboard',
        popover: {
          title: "You're a user too, not just a manager",
          description:
            "Your dashboard shows your own radar, scores, and growth goals. The best managers reflect on themselves — your direct reports can see how seriously you take your own development.",
        },
      })
    }

    if (document.getElementById('dashboard-cta-btn') || document.getElementById('nav-scorecard')) {
      const el = document.getElementById('dashboard-cta-btn') ?? document.getElementById('nav-scorecard')
      if (el) {
        steps.push({
          element: el.id === 'dashboard-cta-btn' ? '#dashboard-cta-btn' : '#nav-scorecard',
          popover: {
            title: "Start your own scorecard",
            description:
              "Your first scorecard takes about ten minutes. Score yourself honestly across five pillars — there are no right answers, only useful ones. Your direct reports can compare their view with yours.",
          },
        })
      }
    }

    if (document.getElementById('nav-reflections')) {
      steps.push({
        element: '#nav-reflections',
        popover: {
          title: "Team reflections",
          description:
            "See your direct reports' reflection rounds alongside your own. When someone completes a self-assessment, their scoring link appears here — you can also track how their scores change over time.",
        },
      })
    }

    if (document.getElementById('nav-connections')) {
      steps.push({
        element: '#nav-connections',
        popover: {
          title: "Your team",
          description:
            "Manage your connections, invite more direct reports, and see everyone in your management network.",
        },
      })
    }

    if (document.getElementById('nav-avatar')) {
      steps.push({
        element: '#nav-avatar',
        popover: {
          title: "Profile and preferences",
          description:
            "Control your notification settings and choose whether to score your direct reports blind (without seeing their self-assessment first) or informed — your call.",
        },
      })
    }

    return steps
  }

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
      },
    })
    driverObj.drive()
  }

  useEffect(() => {
    if (readLocalStorage(TOUR_SEEN_KEY)) return
    const timer = setTimeout(startTour, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasManagerStrip])

  useEffect(() => {
    window.addEventListener(MANAGER_TOUR_EVENT, startTour)
    return () => window.removeEventListener(MANAGER_TOUR_EVENT, startTour)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasManagerStrip])

  if (promptHidden) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(45,212,191,0.08)',
        border: '1px solid rgba(45,212,191,0.35)',
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
          color: '#2dd4bf',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="5,3 19,12 5,21" />
        </svg>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span>Take a 30-second tour of Brilliant Managers</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(45,212,191,0.55)' }}>
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
          color: 'rgba(45,212,191,0.35)',
          background: 'transparent',
          border: 'none',
          borderLeft: '1px solid rgba(45,212,191,0.15)',
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
