import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  throw new Error('Sentry example API route - test error')
  return NextResponse.json({ data: 'Testing Sentry Error...' })
}
