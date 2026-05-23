# Manager Scoring RLS Gate Fix

**Date:** 2026-05-23  
**Status:** Approved

## Problem

When a manager clicks a direct report card in the Team Scoring strip, they land on `/manager/[userId]` and see:

> "[name] hasn't completed a self-assessment yet."

This fires even when the DR has an active or in-progress round. The root cause is a missing RLS SELECT policy on `assessment_rounds`.

### Root cause

`assessment_rounds` has one policy:

```sql
create policy "Users can manage own rounds" on assessment_rounds
  for all using (auth.uid() = user_id);
```

When the manager (auth.uid() = A) tries to read a round owned by the DR (user_id = B), the policy resolves to `A = B` → false. The row is invisible.

Both `getRoundById` and `getLatestCompleteRound` use the standard server Supabase client, which is subject to RLS. Both return null. The manager page then renders the "hasn't completed a self-assessment" error.

The dashboard's `getDirectReportRoundSummaries` works correctly because it uses the admin client (which bypasses RLS). The manager scoring page does not.

### Intended behaviour

Managers should be able to score a DR as soon as any round exists (in_progress or complete). The only valid block is when the DR has no round at all.

---

## Design

### 1. Migration — add manager SELECT policy

New file: `supabase/migrations/YYYYMMDDNNNNNN_manager_can_read_dr_rounds.sql`

```sql
-- Managers need to read their direct reports' assessment_rounds to score them.
-- The existing "Users can manage own rounds" policy only covers auth.uid() = user_id.
create policy "Managers can read direct report rounds" on assessment_rounds
  for select using (
    exists (
      select 1 from connections
      where connections.direct_report_id = assessment_rounds.user_id
        and connections.manager_id = auth.uid()
        and connections.status = 'active'
    )
  );
```

This mirrors the existing "Managers can read scores for direct reports" policy on the `scores` table. No change to INSERT/UPDATE/DELETE — those remain owner-only.

### 2. Copy fix — manager page "no round" state

`app/(app)/manager/[userId]/page.tsx` line 70:

- **Before:** `{profile?.display_name ?? 'This person'} hasn't completed a self-assessment yet.`
- **After:** `{profile?.display_name ?? 'This person'} hasn't started a round yet.`

This is accurate now: the block fires only when there is genuinely no round, not due to RLS blindness.

### 3. No other app code changes

Once the RLS policy is in place, `getRoundById` and `getLatestCompleteRound` return the correct round for the manager's session. The existing page logic handles all round statuses correctly:

| Round status | Behaviour |
|---|---|
| `scheduled` | Shows "hasn't started self-assessment" message |
| `in_progress` | Falls through to scoring UI (no DR scores shown in informed mode — round not complete) |
| `complete` | Falls through to scoring UI (DR scores shown in informed mode if not blind) |
| No round | Shows "hasn't started a round yet" (updated copy) |

---

## Out of scope

Manager-triggered round creation ("either party should be able to create a round") is a separate feature, deferred.

---

## Verification

After applying the migration:

```bash
SUPABASE_URL="https://jxanausntacmzgnzzncu.supabase.co"
ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Must return [] — unauthenticated reads still blocked
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/assessment_rounds?select=*"
```

Manual smoke test: log in as manager, click a DR card in Team Scoring → should reach the pillar selection screen.
