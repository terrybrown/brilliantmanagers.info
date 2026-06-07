'use client'

import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { DeptNodeData } from '@/lib/org/layout'

export function DeptNode({ data, selected }: NodeProps<DeptNodeData>) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <div
        style={{
          padding: '8px 14px',
          background: selected ? 'var(--color-accent-wash2)' : 'var(--color-surface)',
          border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: selected ? 'var(--color-accent)' : 'var(--color-text-primary)',
          cursor: 'pointer',
          userSelect: 'none',
          minWidth: 120,
          width: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          boxShadow: '0 1px 3px rgba(40,60,45,0.06)',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.label}
        </span>
        {data.memberCount > 0 && (
          <span
            style={{
              background: selected ? 'var(--color-accent)' : 'var(--color-chip-bg)',
              color: selected ? 'var(--color-accent-fg)' : 'var(--color-text-faint)',
              borderRadius: 10,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {data.memberCount}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </>
  )
}
