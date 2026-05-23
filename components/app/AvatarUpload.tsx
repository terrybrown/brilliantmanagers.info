'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { uploadAvatarAction, removeAvatarAction } from '@/app/(app)/profile/actions'

interface AvatarUploadProps {
  initialAvatarUrl: string | null
  initials: string
}

export function AvatarUpload({ initialAvatarUrl, initials }: AvatarUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl)
  const [isUploading, startUpload] = useTransition()
  const [isRemoving, startRemove] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    const formData = new FormData()
    formData.set('avatar', file)

    startUpload(async () => {
      const result = await uploadAvatarAction(formData)
      URL.revokeObjectURL(objectUrl)
      if (!result.ok) {
        setPreviewUrl(null)
        toast.error(result.error)
      } else {
        toast.success('Avatar updated')
        router.refresh()
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function handleRemove() {
    startRemove(async () => {
      const result = await removeAvatarAction()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPreviewUrl(null)
      toast.success('Avatar removed')
      router.refresh()
    })
  }

  const isPending = isUploading || isRemoving

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
            background: '#1f2937', border: '2px solid #334155',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, position: 'relative',
            opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s',
          }}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Profile photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 20 }}>{initials}</span>
          )}
        </div>

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
            {previewUrl && (
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
        </div>
      </div>
    </div>
  )
}
