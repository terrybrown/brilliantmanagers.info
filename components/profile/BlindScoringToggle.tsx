'use client'
import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { updateBlindScoringAction } from '@/app/(app)/profile/actions'

export function BlindScoringToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue)
  const [, startTransition] = useTransition()

  function handleChange(value: boolean) {
    setEnabled(value)
    startTransition(() => { updateBlindScoringAction(value) })
  }

  return (
    <div className="flex items-start gap-3">
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        aria-label="Blind scoring mode"
      />
      <div>
        <p className="text-sm font-medium">Blind scoring</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {enabled
            ? "You won't see your direct report's self-assessment while scoring."
            : "You'll see your direct report's self-assessment while scoring."}
        </p>
      </div>
    </div>
  )
}
