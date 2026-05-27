import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')
const CUTOFF_DAYS = 7
const cutoffDate = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`Cutoff: ${cutoffDate.toISOString()} (unverified users older than ${CUTOFF_DAYS} days)`)
  if (DRY_RUN) console.log('DRY RUN — no deletions will be performed\n')

  let page = 1
  const perPage = 1000
  let totalScanned = 0
  let totalFound = 0
  let totalDeleted = 0
  const errors: string[] = []

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('Failed to list users:', error.message)
      if (errors.length > 0) {
        console.log('Errors collected before failure:')
        errors.forEach(e => console.log(` - ${e}`))
      }
      process.exit(1)
    }

    totalScanned += data.users.length

    const toDelete = data.users.filter(
      u => !u.email_confirmed_at && new Date(u.created_at) < cutoffDate,
    )

    totalFound += toDelete.length

    for (const user of toDelete) {
      const label = user.email ?? `<no-email id=${user.id}>`
      if (DRY_RUN) {
        console.log(`[dry-run] Would delete: ${label} (created ${user.created_at})`)
        totalDeleted++
        continue
      }
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        errors.push(`${label}: ${deleteError.message}`)
      } else {
        console.log(`Deleted: ${label} (created ${user.created_at})`)
        totalDeleted++
      }
    }

    if (data.nextPage === null) break
    page++
  }

  const deletedLabel = DRY_RUN ? 'Would delete' : 'Deleted'
  console.log(`\nScanned: ${totalScanned} | Found: ${totalFound} | ${deletedLabel}: ${totalDeleted} | Errors: ${errors.length}`)
  if (errors.length > 0) {
    console.log('Errors:')
    errors.forEach(e => console.log(` - ${e}`))
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
