-- Allow any authenticated user to read any profile.
--
-- Without this, the only SELECT policy on profiles was "auth.uid() = id"
-- (own profile only), which caused two silent failures:
--
-- 1. getConnectionsForUser: the PostgREST FK join for manager/direct_report
--    returned null for the "other side" of every connection, crashing
--    DirectReportCard on the people page.
--
-- 2. createConnection: the email lookup (SELECT id FROM profiles WHERE email = ?)
--    always returned null for any user other than the caller, so every
--    connection attempt fell through to NO_ACCOUNT_ERROR and pending_invitation
--    even when the other user was already registered.
create policy "Authenticated users can read all profiles" on profiles
  for select using (auth.uid() is not null);
