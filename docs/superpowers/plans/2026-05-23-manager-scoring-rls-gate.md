# Manager Scoring RLS Gate Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a missing RLS SELECT policy on `assessment_rounds` that prevents managers from reading their direct reports' rounds, causing the manager scoring page to show a false "hasn't completed a self-assessment yet" error.

**Architecture:** Add one SQL migration that grants managers SELECT access to direct report rounds via the `connections` table, mirroring the existing "Managers can read scores for direct reports" policy on `scores`. Update one copy string in the manager page to accurately describe the genuine no-round state.

**Tech Stack:** Supabase (PostgreSQL RLS), Next.js 15 App Router (server component), Vitest

---

## File Map

| Action | File |
|---|---|
| Create | `supabase/migrations/20260523000000_manager_can_read_dr_rounds.sql` |
| Modify | `app/(app)/manager/[userId]/page.tsx` (line 70 — copy only) |

No TypeScript logic changes. No new test files needed — the migration is SQL-only (RLS policies aren't unit-testable via Vitest mocks; verification is done via curl and browser smoke test).

---

### Task 1: Create feature branch and confirm baseline tests pass

**Files:** none (git + test runner only)

- [ ] **Step 1: Create feature branch**

```bash
git checkout master && git pull origin master
git checkout -b fix/manager-scoring-rls-gate
```

Expected: on branch `fix/manager-scoring-rls-gate`

- [ ] **Step 2: Run the test suite**

```bash
npm test
```

Expected: all tests pass. If any fail before you touch anything, stop and report — do not proceed.

---

### Task 2: Write the migration

**Files:**
- Create: `supabase/migrations/20260523000000_manager_can_read_dr_rounds.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260523000000_manager_can_read_dr_rounds.sql` with this exact content:

```sql
-- Managers need SELECT access to their direct reports' assessment_rounds so the
-- manager scoring page can fetch the round via the standard server client.
-- The existing "Users can manage own rounds" policy only covers auth.uid() = user_id.
-- This mirrors the "Managers can read scores for direct reports" policy on scores.
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

- [ ] **Step 2: Apply the migration to your Supabase project**

Run this in the Supabase SQL editor (dashboard → SQL editor) or via the CLI if configured:

```bash
# Via CLI (if supabase CLI is linked to the project):
supabase db push

# Or paste the file contents directly into the Supabase SQL editor and run it.
```

Expected: no error. The policy `"Managers can read direct report rounds"` now appears in the `assessment_rounds` policies list in the Supabase dashboard.

- [ ] **Step 3: Verify unauthenticated reads are still blocked**

```bash
SUPABASE_URL="https://jxanausntacmzgnzzncu.supabase.co"
ANON_KEY="<your NEXT_PUBLIC_SUPABASE_ANON_KEY value>"

curl -s \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/assessment_rounds?select=*"
```

Expected: `[]` — the anon key carries no `auth.uid()`, so neither the owner policy nor the new manager policy matches. Public access is still blocked.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/20260523000000_manager_can_read_dr_rounds.sql
git commit -m "fix: add manager SELECT policy on assessment_rounds"
```

---

### Task 3: Fix the "no round" copy in the manager page

**Files:**
- Modify: `app/(app)/manager/[userId]/page.tsx`

The `!round` fallback (line 66–74) fires when the DR genuinely has no round at all. The old copy said "hasn't completed a self-assessment yet", which was misleading even before the RLS bug and is now doubly inaccurate.

- [ ] **Step 1: Update the copy**

In `app/(app)/manager/[userId]/page.tsx`, find this block (around line 66):

```tsx
  if (!round) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-400">
          {profile?.display_name ?? 'This person'} hasn&apos;t completed a self-assessment yet.
        </p>
      </div>
    )
  }
```

Replace it with:

```tsx
  if (!round) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-400">
          {profile?.display_name ?? 'This person'} hasn&apos;t started a round yet.
        </p>
      </div>
    )
  }
```

- [ ] **Step 2: Run the test suite**

```bash
npm test
```

Expected: all tests pass (no tests cover this string directly, but confirm nothing regressed).

- [ ] **Step 3: Commit**

```bash
git add app/(app)/manager/[userId]/page.tsx
git commit -m "fix: update manager page no-round copy to reflect actual gate"
```

---

### Task 4: Smoke test and raise PR

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Browser smoke test**

1. Log in as a manager who has at least one active direct report connection.
2. On the dashboard, locate the Team Scoring strip — confirm the DR card shows "Not scored / Start →".
3. Click the card. Confirm you reach the pillar selection screen (list of pillars with "✓ scored" badges where applicable), NOT the "hasn't started a round yet" error.
4. Click a pillar. Confirm the skill scoring UI loads.
5. Score one skill. Confirm the save succeeds (no toast error).

- [ ] **Step 3: git status check**

```bash
git status
```

Expected: working tree clean. Only files from Tasks 2 and 3 should appear in `git log`.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin fix/manager-scoring-rls-gate
```

Then show the diff to the user and wait for explicit approval before running `gh pr create`.
