'use client'
import { createRoundAction } from '@/app/(app)/reflections/actions'

interface CreateRoundModalProps {
  open: boolean
  onClose: () => void
  defaultTitle: string
}

export function CreateRoundModal({ open, onClose, defaultTitle }: CreateRoundModalProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Start new reflection round"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 440,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
          Start a new reflection round
        </h2>

        <form action={createRoundAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="round-title"
              style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}
            >
              Title
            </label>
            <input
              id="round-title"
              name="title"
              type="text"
              required
              defaultValue={defaultTitle}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                color: '#fff',
                outline: 'none',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="round-remind"
              style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}
            >
              Remind me by
              <span style={{ fontWeight: 400, color: '#475569', marginLeft: 6 }}>(optional)</span>
            </label>
            <input
              id="round-remind"
              name="remind_at"
              type="date"
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                color: '#fff',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: 11, color: '#475569' }}>
              Recurring reminders can be set in Profile → Notifications
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="round-notes"
              style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}
            >
              Intention
              <span style={{ fontWeight: 400, color: '#475569', marginLeft: 6 }}>(optional)</span>
            </label>
            <textarea
              id="round-notes"
              name="notes"
              rows={3}
              placeholder="What do you want to focus on this round?"
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                color: '#fff',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: '1px solid #334155',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '10px 0',
                borderRadius: 8,
                background: '#f59e0b',
                color: '#1a2a3a',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              Start reflection
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
