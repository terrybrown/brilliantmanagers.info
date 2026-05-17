'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { uploadAvatarAction, removeAvatarAction } from '@/app/(app)/profile/actions'

interface AvatarUploadProps {
  initialAvatarUrl: string | null
  initials: string
}

type Toast = { message: string; type: 'success' | 'error' }

export function AvatarUpload({ initialAvatarUrl, initials }: AvatarUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl)
  const [toast, setToast] = useState<Toast | null>(null)
  const [isUploading, startUpload] = useTransition()
  const [isRemoving, startRemove] = useTransition()

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setToast(null)

    const formData = new FormData()
    formData.set('avatar', file)

    startUpload(async () => {
      const result = await uploadAvatarAction(formData)
      if (result.error) {
        URL.revokeObjectURL(objectUrl)
        setPreviewUrl(null)
        setToast({ message: result.error, type: 'error' })
      } else {
        URL.revokeObjectURL(objectUrl)
        setToast({ message: 'Photo updated', type: 'success' })
        router.refresh()
      }
      // Reset input so the same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function handleRemove() {
    startRemove(async () => {
      const result = await removeAvatarAction()
      if (result.error) {
        setToast({ message: result.error, type: 'error' })
        return
      }
      setPreviewUrl(null)
      setToast({ message: 'Photo removed', type: 'success' })
      router.refresh()
    })
  }

  const isPending = isUploading || isRemoving
  const displayUrl = previewUrl

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        {/* Avatar circle */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#1f2937',
            border: '2px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            opacity: isPending ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile photo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 20 }}>
              {initials}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:border-amber-400 hover:text-amber-400 transition-colors">
              {isUploading ? 'Uploading…' : 'Change photo'}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </label>
            {displayUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {isRemoving ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>
          {toast && (
            <p
              className={`text-xs ${toast.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {toast.message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
