import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getScheduledRound } from '@/lib/db/scheduled-rounds'
import { generateICS } from '@/lib/ical'

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const scheduled = await getScheduledRound(user.id)
  if (!scheduled) {
    return new NextResponse('No scheduled round found', { status: 404 })
  }

  const ics = generateICS(scheduled.scheduled_date)

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reflection-round.ics"',
    },
  })
}
