import { redirect } from 'next/navigation'
import Link from 'next/link'
import { confirmLogin } from './actions'
import { ConfirmButton } from './ConfirmButton'

interface Props {
  searchParams: Promise<{
    token_hash?: string
    type?: string
    error?: string
    error_description?: string
  }>
}

export default async function AuthConfirmPage({ searchParams }: Props) {
  const { token_hash, error, error_description } = await searchParams
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-bold">Link expired</h1>
          <p className="mb-6 text-slate-500">
            {error_description ??
              'This sign-in link has expired or already been used.'}
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold text-amber-500 hover:text-amber-400"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (!token_hash) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-bold">Complete your sign-in</h1>
        <p className="mb-6 text-slate-500">Click below to sign in to Brilliant Managers.</p>
        <form action={confirmLogin}>
          <input type="hidden" name="token_hash" value={token_hash} />
          <ConfirmButton />
        </form>
      </div>
    </div>
  )
}
