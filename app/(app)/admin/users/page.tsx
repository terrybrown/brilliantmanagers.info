import { createClient } from '@/lib/supabase/server'
import { listAllUsersWithRoles } from '@/lib/db/user-roles'
import { AdminUsersTable } from './AdminUsersTable'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const users = await listAllUsersWithRoles()

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Users</h1>
      <AdminUsersTable users={users} currentUserId={user!.id} />
    </div>
  )
}
