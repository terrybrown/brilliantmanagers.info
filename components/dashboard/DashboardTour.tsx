'use client'

import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_STEPS = [
  {
    element: '#nav-dashboard',
    popover: {
      title: 'Your command centre',
      description:
        "This is your dashboard — a live picture of where you stand as a manager. Once you've completed a scorecard, your radar, pillar scores, and growth goals all live here.",
    },
  },
  {
    element: '#nav-growth',
    popover: {
      title: "Track what you're working on",
      description:
        'The Growth section shows your active development goals and how your scores have shifted between rounds. Set a goal on any skill and revisit it at your next 1:1.',
    },
  },
  {
    element: '#nav-connections',
    popover: {
      title: 'Your management relationships',
      description:
        'Connections tracks the people in your world — direct reports, peers, and stakeholders. Use it to log what matters about your working relationships.',
    },
  },
  {
    element: '#nav-avatar',
    popover: {
      title: 'Your profile',
      description:
        'Your account settings and scorecard history live here. You can also download or share your scorecard from this menu.',
    },
  },
  {
    element: '#dashboard-cta-btn',
    popover: {
      title: 'Ready to get started?',
      description:
        'Your first scorecard takes about ten minutes. Answer honestly — there are no right answers, only useful ones.',
    },
  },
]

export function DashboardTour() {
  function startTour() {
    const driverObj = driver({
      animate: true,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: 'bm-tour-popover',
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        driverObj.destroy()
        try {
          localStorage.setItem('bm_tour_seen', '1')
        } catch {
          // localStorage unavailable in some private browsing contexts
        }
      },
    })

    driverObj.drive()
  }

  return (
    <button
      onClick={startTour}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(45,212,191,0.08)',
        border: '1px solid rgba(45,212,191,0.35)',
        borderRadius: 12,
        padding: '11px 20px',
        fontSize: 13,
        fontWeight: 600,
        color: '#2dd4bf',
        cursor: 'pointer',
        letterSpacing: '0.01em',
        marginBottom: 32,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <polygon points="5,3 19,12 5,21" />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left' }}>
        <span>Take a 30-second tour of Brilliant Managers</span>
        <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(45,212,191,0.55)' }}>
          Let us show you around the tool
        </span>
      </span>
    </button>
  )
}
