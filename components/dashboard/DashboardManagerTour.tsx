'use client'
import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const STORAGE_KEY = 'bm_manager_tour_seen'

export function DashboardManagerTour({ hasManagerStrip }: { hasManagerStrip: boolean }) {
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return

    // Defer so the DOM has fully painted before driver.js measures element positions
    const timer = setTimeout(() => {
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
            localStorage.setItem(STORAGE_KEY, '1')
          } catch {
            // localStorage unavailable in some private browsing contexts
          }
        },
      })
      driverObj.drive()
    }, 300)

    return () => clearTimeout(timer)
  }, [hasManagerStrip])

  return null
}
