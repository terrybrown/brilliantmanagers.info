# Profile Photo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add avatar upload to the profile page, stored in Supabase Storage with RLS-enforced access for the owner and their active connections, displayed in the topbar avatar and on the manager page.

**Architecture:** A private Supabase Storage bucket `avatars` holds one file per user at `{userId}/avatar.{ext}`. Storage RLS policies mirror the `connections` table logic. Signed URLs (1-hour TTL) are generated server-side at render time and threaded down through `AppLayout → AppShell → Topbar → AvatarDropdown`. The profile page gains an avatar section with upload and remove actions.

**Tech Stack:** Next.js 16 App Router, Supabase Storage (`@supabase/supabase-js`), Vitest + React Testing Library, TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/007_avatar.sql` | Create | `avatar_path` column + storage bucket + RLS policies |
| `lib/db/profiles.ts` | Modify | Add `avatar_path` to `Profile`; add `getSignedAvatarUrl()` |
| `components/app/AvatarDropdown.tsx` | Modify | Render `<img>` when `avatarUrl` present, initials fallback |
| `__tests__/components/app/AvatarDropdown.test.tsx` | Modify | Cover photo and no-photo cases |
| `components/app/AppShell.tsx` | Modify | Add `avatarUrl?: string` to `UserInfo`; thread to `Topbar` |
| `components/app/Topbar.tsx` | Modify | Add `avatarUrl?: string` to `UserInfo`; thread to `AvatarDropdown` |
| `app/(app)/layout.tsx` | Modify | Fetch `avatar_path`, generate signed URL, pass `avatarUrl` to `AppShell` |
| `app/(app)/profile/page.tsx` | Modify | Add avatar section (current photo, file input, remove button) |
| `app/(app)/profile/actions.ts` | Modify | Handle avatar upload; add `removeAvatarAction` |
| `app/(app)/manager/[userId]/page.tsx` | Modify | Fetch direct report's avatar, show beside name |

---

## Task 1: Database migration — `avatar_path` column + storage bucket + RLS

**Files:**
- Create: `supabase/migrations/007_avatar.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/007_avatar.sql`:

```sql
-- Add avatar_path to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_path text;

-- Create the avatars bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Owner can upload
CREATE POLICY "avatar insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can replace
CREATE POLICY "avatar update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can delete their own avatar
CREATE POLICY "avatar delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner + active connections can read
CREATE POLICY "avatar select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.connections
        WHERE status = 'active'
          AND (
            (manager_id = auth.uid() AND direct_report_id::text = (storage.foldername(name))[1])
            OR (direct_report_id = auth.uid() AND manager_id::text = (storage.foldername(name))[1])
          )
      )
    )
  );
```

- [ ] **Step 2: Apply the migration**

Run against your Supabase project (local CLI or dashboard SQL editor). Confirm the `profiles` table now has an `avatar_path` column and the `avatars` bucket appears in Storage.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_avatar.sql
git commit -m "feat: add avatar_path column and storage bucket with RLS"
```

---

## Task 2: `lib/db/profiles.ts` — add `avatar_path` + `getSignedAvatarUrl()`

**Files:**
- Modify: `lib/db/profiles.ts`

- [ ] **Step 1: Add `avatar_path` to the `Profile` interface and add `getSignedAvatarUrl`**

Replace the contents of `lib/db/profiles.ts` with:

```ts
import { createClient } from '@/lib/supabase/server'

export interface Profile {
  id: string
  display_name: string | null
  email: string | null
  job_title: string | null
  bio: string | null
  avatar_path: string | null
  created_at: string
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data as Profile | null
}

export async function updateProfile(
  userId: string,
  fields: { display_name?: string; job_title?: string; bio?: string; avatar_path?: string | null }
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)
  if (error) throw error
}

export async function getSignedAvatarUrl(
  avatarPath: string
): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('avatars')
    .createSignedUrl(avatarPath, 3600)
  return data?.signedUrl ?? null
}
```

- [ ] **Step 2: Run the test suite to confirm nothing is broken**

```bash
npm test
```

Expected: all existing tests pass (no test file for `profiles.ts` — consistent with rest of `lib/db/`).

- [ ] **Step 3: Commit**

```bash
git add lib/db/profiles.ts
git commit -m "feat: add avatar_path to Profile type and getSignedAvatarUrl helper"
```

---

## Task 3: `AvatarDropdown` — photo or initials fallback

**Files:**
- Modify: `components/app/AvatarDropdown.tsx`
- Modify: `__tests__/components/app/AvatarDropdown.test.tsx`

- [ ] **Step 1: Write the failing tests**

Replace `__tests__/components/app/AvatarDropdown.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AvatarDropdown } from '@/components/app/AvatarDropdown'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const user = { displayName: 'Terry Brown', email: 'terry@test.com', initials: 'TB' }

describe('AvatarDropdown', () => {
  it('shows initials when no avatarUrl', () => {
    render(<AvatarDropdown user={user} />)
    expect(screen.getByText('TB')).toBeTruthy()
  })

  it('shows avatar image when avatarUrl provided', () => {
    render(<AvatarDropdown user={{ ...user, avatarUrl: 'https://example.com/avatar.jpg' }} />)
    const img = screen.getByRole('img', { name: 'Terry Brown' })
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg')
    expect(screen.queryByText('TB')).toBeNull()
  })

  it('dropdown is hidden by default', () => {
    render(<AvatarDropdown user={user} />)
    expect(screen.queryByText('Profile & settings')).toBeNull()
  })

  it('opens dropdown on button click', () => {
    render(<AvatarDropdown user={user} />)
    fireEvent.click(screen.getByRole('button', { name: /open user menu/i }))
    expect(screen.getByText('Profile & settings')).toBeTruthy()
  })

  it('closes dropdown on second click', () => {
    render(<AvatarDropdown user={user} />)
    const btn = screen.getByRole('button', { name: /open user menu/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText('Profile & settings')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify the new test fails**

```bash
npm test -- AvatarDropdown
```

Expected: FAIL — "shows avatar image when avatarUrl provided" — `avatarUrl` prop doesn't exist yet.

- [ ] **Step 3: Update `AvatarDropdown` to accept and render `avatarUrl`**

Replace the full contents of `components/app/AvatarDropdown.tsx` with:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { User, Bell, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

export function AvatarDropdown({ user }: { user: UserInfo }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id="nav-avatar"
        onClick={() => setOpen(o => !o)}
        aria-label="Open user menu"
        aria-expanded={open}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `2px solid ${open ? '#f59e0b' : '#334155'}`,
          background: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#f59e0b',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          user.initials
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            width: 220,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{user.email}</div>
          </div>

          <DropdownItem href="/profile" icon={User} label="Profile & settings" onClick={() => setOpen(false)} />
          <DropdownItem href="/notifications" icon={Bell} label="Notifications" onClick={() => setOpen(false)} />

          <div style={{ height: 1, background: '#334155' }} />

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              width: '100%',
              fontSize: 13,
              color: '#f87171',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <LogOut size={15} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string
  icon: typeof User
  label: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        fontSize: 13,
        color: '#94a3b8',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.background = '#334155'
        ;(e.currentTarget as HTMLElement).style.color = '#f8fafc'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
      }}
    >
      <Icon size={15} strokeWidth={1.75} />
      {label}
    </Link>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- AvatarDropdown
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app/AvatarDropdown.tsx __tests__/components/app/AvatarDropdown.test.tsx
git commit -m "feat: show avatar photo in AvatarDropdown with initials fallback"
```

---

## Task 4: Thread `avatarUrl` through `AppShell` and `Topbar`

**Files:**
- Modify: `components/app/AppShell.tsx`
- Modify: `components/app/Topbar.tsx`

- [ ] **Step 1: Run existing Topbar tests to confirm they're green before touching anything**

```bash
npm test -- Topbar
```

Expected: PASS.

- [ ] **Step 2: Add `avatarUrl` to `UserInfo` in `AppShell`**

Replace full contents of `components/app/AppShell.tsx` with:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const LS_KEY = 'bm_sidebar_expanded'

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

export function AppShell({
  user,
  showBeta,
  children,
}: {
  user: UserInfo
  showBeta: boolean
  children: React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    try {
      setIsExpanded(localStorage.getItem(LS_KEY) === 'true')
    } catch {
      // localStorage unavailable — keep default false
    }
  }, [])

  function handleToggle() {
    setIsExpanded(prev => {
      const next = !prev
      try {
        localStorage.setItem(LS_KEY, String(next))
      } catch { /* ignore */ }
      return next
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0f1e',
      }}
    >
      <Sidebar isExpanded={isExpanded} onToggle={handleToggle} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar user={user} showBeta={showBeta} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add `avatarUrl` to `UserInfo` in `Topbar`**

Replace full contents of `components/app/Topbar.tsx` with:

```tsx
'use client'
import { usePathname } from 'next/navigation'
import { AvatarDropdown } from './AvatarDropdown'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/scorecard': 'Scorecard',
  '/results': 'Results',
  '/connections': 'Connections',
  '/organisation': 'Organisation',
  '/growth': 'Growth',
  '/profile': 'Profile & Settings',
  '/notifications': 'Notifications',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const prefix = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k + '/'))
  return prefix ? PAGE_TITLES[prefix] : 'Brilliant Managers'
}

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

export function Topbar({ user, showBeta }: { user: UserInfo; showBeta: boolean }) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <div
      style={{
        height: 52,
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 12,
        background: '#0f172a',
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc', flex: 1, fontFamily: 'var(--font-display)' }}>{title}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showBeta && (
          <span
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 10,
              fontWeight: 600,
              background: 'rgba(245,158,11,0.15)',
              color: '#f59e0b',
            }}
          >
            Beta
          </span>
        )}
        <AvatarDropdown user={user} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run all tests to confirm nothing broke**

```bash
npm test
```

Expected: all tests PASS (`avatarUrl` is optional so existing tests that don't pass it are unaffected).

- [ ] **Step 5: Commit**

```bash
git add components/app/AppShell.tsx components/app/Topbar.tsx
git commit -m "feat: thread avatarUrl through AppShell and Topbar to AvatarDropdown"
```

---

## Task 5: `AppLayout` — fetch `avatar_path` and generate signed URL

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Update `AppLayout` to fetch `avatar_path` and generate a signed URL**

Replace full contents of `app/(app)/layout.tsx` with:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedAvatarUrl } from '@/lib/db/profiles'
import { AppShell } from '@/components/app/AppShell'

function getInitials(displayName: string | null, email: string | null): string {
  const name = displayName ?? email ?? '?'
  const parts = name.split(/[\s@]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_path')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'
  const email = user.email ?? ''
  const initials = getInitials(displayName, email)
  const avatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : undefined

  return (
    <AppShell
      user={{ displayName, email, initials, avatarUrl: avatarUrl ?? undefined }}
      showBeta={true}
    >
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "feat: fetch avatar_path in AppLayout and pass signed URL to AppShell"
```

---

## Task 6: Profile page — avatar section + server actions

**Files:**
- Modify: `app/(app)/profile/page.tsx`
- Modify: `app/(app)/profile/actions.ts`

- [ ] **Step 1: Add `removeAvatarAction` and extend `updateProfileAction` in `actions.ts`**

Replace full contents of `app/(app)/profile/actions.ts` with:

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/profiles'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function updateProfileAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const display_name = (formData.get('display_name') as string).trim()
  const job_title = (formData.get('job_title') as string).trim()
  const bio = (formData.get('bio') as string).trim()

  const profileFields: Parameters<typeof updateProfile>[1] = {
    display_name,
    job_title,
    bio,
  }

  const avatarFile = formData.get('avatar') as File | null
  if (avatarFile && avatarFile.size > 0) {
    if (!ALLOWED_MIME_TYPES.has(avatarFile.type)) {
      throw new Error('Avatar must be a JPEG, PNG, or WebP image.')
    }
    if (avatarFile.size > MAX_BYTES) {
      throw new Error('Avatar must be 2 MB or smaller.')
    }

    const ext = EXT_MAP[avatarFile.type]
    const path = `${user.id}/avatar.${ext}`
    const bytes = new Uint8Array(await avatarFile.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, bytes, { contentType: avatarFile.type, upsert: true })

    if (uploadError) throw uploadError

    profileFields.avatar_path = path
  }

  await updateProfile(user.id, profileFields)
  revalidatePath('/profile')
}

export async function removeAvatarAction(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.avatar_path) {
    await supabase.storage.from('avatars').remove([profile.avatar_path])
    await updateProfile(user.id, { avatar_path: null })
  }

  revalidatePath('/profile')
}
```

- [ ] **Step 2: Update the profile page to show the avatar section**

Replace full contents of `app/(app)/profile/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getSignedAvatarUrl } from '@/lib/db/profiles'
import { updateProfileAction, removeAvatarAction } from './actions'

function getInitials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  const parts = src.split(/[\s@]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  const avatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : null
  const initials = getInitials(profile?.display_name ?? null, user.email ?? null)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Profile</h1>
      <p className="mb-8 text-sm text-slate-400">
        Update your display name, job title, and bio.
      </p>

      <form action={updateProfileAction} className="flex flex-col gap-5">
        {/* Avatar section */}
        <div className="mb-1 flex items-center gap-4">
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
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 20 }}>
                {initials}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:border-amber-400 hover:text-amber-400 transition-colors">
              Change photo
              <input
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
              />
            </label>
            {profile?.avatar_path && (
              <form action={removeAvatarAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </form>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Display name
          </label>
          <input
            name="display_name"
            type="text"
            defaultValue={profile?.display_name ?? ''}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Job title
          </label>
          <input
            name="job_title"
            type="text"
            defaultValue={profile?.job_title ?? ''}
            placeholder="e.g. Engineering Manager"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Bio
          </label>
          <textarea
            name="bio"
            rows={4}
            defaultValue={profile?.bio ?? ''}
            placeholder="A short description about yourself..."
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Email
          </label>
          <input
            type="email"
            value={user.email ?? ''}
            disabled
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-500"
          />
        </div>

        <button
          type="submit"
          className="self-start rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-400"
        >
          Save changes
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/profile/page.tsx app/\(app\)/profile/actions.ts
git commit -m "feat: add avatar upload and remove to profile page"
```

---

## Task 7: Manager page — show direct report's avatar

**Files:**
- Modify: `app/(app)/manager/[userId]/page.tsx`

- [ ] **Step 1: Fetch the direct report's avatar and show it beside their name**

Replace full contents of `app/(app)/manager/[userId]/page.tsx` with:

```tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getManagerScoresForRound } from '@/lib/db/manager-scores'
import { getSignedAvatarUrl } from '@/lib/db/profiles'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import { ManagerScoringView } from '@/components/app/ManagerScoringView'

export default async function ManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ pillar?: string }>
}) {
  const { userId } = await params
  const { pillar } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: connection } = await supabase
    .from('connections')
    .select('*')
    .eq('manager_id', user.id)
    .eq('direct_report_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!connection) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, avatar_path')
    .eq('id', userId)
    .single()

  const directReportAvatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : null

  const round = await getLatestCompleteRound(userId)
  if (!round) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-400">
          {profile?.display_name ?? 'This person'} hasn't completed a self-assessment yet.
        </p>
      </div>
    )
  }

  if (!pillar || !PILLARS.includes(pillar as Pillar)) {
    const managerScores = await getManagerScoresForRound(round.id, user.id)
    const scoredPillars = new Set(
      PILLARS.filter(p =>
        getSkillsByPillar(p as Pillar).every(s =>
          managerScores.some(ms => ms.skill_key === s.key)
        )
      )
    )

    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center gap-3">
          {directReportAvatarUrl && (
            <img
              src={directReportAvatarUrl}
              alt={profile?.display_name ?? profile?.email ?? ''}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <h1 className="text-2xl font-bold text-white">
            Scoring {profile?.display_name ?? profile?.email}
          </h1>
        </div>
        <p className="mb-8 text-sm text-slate-400">Select a pillar to score.</p>
        <div className="flex flex-col gap-3">
          {PILLARS.map(p => (
            <Link
              key={p}
              href={`/manager/${userId}?pillar=${p}`}
              className="flex items-center gap-4 rounded-xl bg-slate-800 px-5 py-4"
            >
              <span className="flex-1 font-medium text-white">
                {PILLAR_LABELS[p as Pillar]}
              </span>
              {scoredPillars.has(p) && (
                <span className="text-xs text-green-400">✓ scored</span>
              )}
              <span className="text-slate-600">›</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const skills = getSkillsByPillar(pillar as Pillar)
  const managerScores = await getManagerScoresForRound(round.id, user.id)
  const initialScores: Record<string, Level> = {}
  managerScores
    .filter(ms => skills.some(s => s.key === ms.skill_key))
    .forEach(ms => {
      initialScores[ms.skill_key] = ms.level
    })

  return (
    <ManagerScoringView
      roundId={round.id}
      pillar={pillar}
      pillarLabel={PILLAR_LABELS[pillar as Pillar]}
      skills={skills}
      initialScores={initialScores}
      directReportName={profile?.display_name ?? profile?.email ?? 'your direct report'}
      userId={userId}
    />
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/manager/\[userId\]/page.tsx
git commit -m "feat: show direct report avatar on manager scoring page"
```
