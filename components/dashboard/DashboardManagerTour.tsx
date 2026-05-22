'use client'
import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const STORAGE_KEY = 'bm_manager_tour_seen'

export function DashboardManagerTour({ hasManagerStrip }: { hasManagerStrip: boolean }) {
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return

    const steps: { element: string; popover: { title: string; description: string } }[] = []

    if (hasManagerStrip && document.getElementById('manager-strip')) {
      steps.push({
        element: '#manager-strip',
        popover: {
          title: 'Your team, ready to score',
          description:
            'When a direct report completes their self-assessment, they appear here. Click to score them.',
        },
      })
    }

    if (document.getElementById('nav-reflections')) {
      steps.push({
        element: '#nav-reflections',
        popover: {
          title: 'Team reflections',
          description: "See your direct reports' reflection rounds in one place.",
        },
      })
    }

    if (document.getElementById('nav-connections')) {
      steps.push({
        element: '#nav-connections',
        popover: {
          title: 'Your team',
          description: 'Manage connections and invite direct reports here.',
        },
      })
    }

    if (steps.length === 0) return

    const driverObj = driver({
      showProgress: true,
      steps,
      onDestroyStarted: () => {
        try {
          localStorage.setItem(STORAGE_KEY, '1')
        } catch {
          // localStorage unavailable in some private browsing contexts
        }
        driverObj.destroy()
      },
    })
    driverObj.drive()
  }, [hasManagerStrip])

  return null
}
