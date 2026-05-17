# App Navigation Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare `(app)` layout with a collapsible left-hand navigation shell — sidebar, topbar, avatar dropdown, and five placeholder pages — so the product feels like a polished app from first login.

**Architecture:** A client `AppShell` component (sidebar toggle state in `localStorage`) wraps server-fetched children. Server layout passes typed user props to AppShell; pages become pure content with no full-page wrappers of their own. Lucide icons throughout, matching the guide's visual language.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS, `lucide-react` (already installed), Supabase (server client + server actions), Vitest + @testing-library/react

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/002_profile_and_plans.sql` | Add job_title/bio to profiles; create development_plans table |
| Create | `lib/db/profiles.ts` | getProfile, updateProfile |
| Create | `lib/db/development-plans.ts` | getPlansForUser, upsertPlan |
| Create | `lib/skill-content.ts` | Rich content for every skill (definition, why, warnings, pathways) |
| Create | `components/app/LogoMark.tsx` | A2 SVG logo mark |
| Create | `components/app/NavItem.tsx` | Single sidebar nav item, active via usePathname |
| Create | `components/app/Sidebar.tsx` | Collapsible sidebar |
| Create | `components/app/AvatarDropdown.tsx` | Avatar menu (profile / notifications / sign out) |
| Create | `components/app/Topbar.tsx` | Page title + beta badge + avatar |
| Create | `components/app/AppShell.tsx` | Client shell — localStorage toggle, composes sidebar + topbar |
| Modify | `app/(app)/layout.tsx` | Use AppShell; pass user info |
| Modify | `middleware.ts` | Add new routes; redirect login → /dashboard |
| Modify | `app/auth/callback/route.ts` | Redirect to /dashboard |
| Modify | `app/(app)/scorecard/page.tsx` | Remove own full-page wrapper |
| Modify | `app/(app)/results/page.tsx` | Remove own full-page wrapper |
| Modify | `app/(app)/connections/page.tsx` | Remove own full-page wrapper |
| Modify | `app/(app)/manager/[userId]/page.tsx` | Remove own full-page wrapper |
| Create | `app/(app)/dashboard/page.tsx` | Dashboard with stats + pillar bars + growth nudge |
| Create | `app/(app)/organisation/page.tsx` | Static placeholder |
| Create | `app/(app)/growth/page.tsx` | Server data loader |
| Create | `components/app/GrowthView.tsx` | Client: pillar filters + skill grid + detail panel + plan form |
| Create | `app/(app)/growth/actions.ts` | upsertPlanAction server action |
| Create | `app/(app)/profile/page.tsx` | Profile form |
| Create | `app/(app)/profile/actions.ts` | updateProfileAction server action |
| Create | `app/(app)/notifications/page.tsx` | Static placeholder |
| Create | `__tests__/components/app/NavItem.test.tsx` | Active state rendering |
| Create | `__tests__/components/app/AvatarDropdown.test.tsx` | Open/close |
| Create | `__tests__/lib/skill-content.test.ts` | Every skill key has content |

---

## Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/002_profile_and_plans.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Add profile fields
alter table profiles
  add column if not exists job_title text,
  add column if not exists bio text;

-- Development plans: one per user per skill
create table development_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  skill_key text not null,
  pillar text not null,
  goal text not null,
  target_date date,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, skill_key)
);

alter table development_plans enable row level security;

create policy "Users can select own plans" on development_plans
  for select using (auth.uid() = user_id);

create policy "Users can insert own plans" on development_plans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own plans" on development_plans
  for update using (auth.uid() = user_id);

create policy "Users can delete own plans" on development_plans
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply to local Supabase (if running locally) or push to remote**

```bash
# If using Supabase CLI:
supabase db push
# Or apply manually via the Supabase dashboard SQL editor
```

- [ ] **Step 3: Verify columns exist**

Run in Supabase SQL editor:
```sql
select column_name from information_schema.columns
where table_name = 'profiles' and column_name in ('job_title', 'bio');

select table_name from information_schema.tables
where table_name = 'development_plans';
```
Expected: 2 rows for profiles query, 1 row for plans query.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_profile_and_plans.sql
git commit -m "feat: add job_title/bio to profiles and development_plans table"
```

---

## Task 2: DB — profiles

**Files:**
- Create: `lib/db/profiles.ts`

- [ ] **Step 1: Write the module**

```typescript
import { createClient } from '@/lib/supabase/server'

export interface Profile {
  id: string
  display_name: string | null
  email: string | null
  job_title: string | null
  bio: string | null
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
  fields: { display_name?: string; job_title?: string; bio?: string }
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)
  if (error) throw error
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/profiles.ts
git commit -m "feat: add getProfile and updateProfile db helpers"
```

---

## Task 3: DB — development plans

**Files:**
- Create: `lib/db/development-plans.ts`

- [ ] **Step 1: Write the module**

```typescript
import { createClient } from '@/lib/supabase/server'

export interface DevelopmentPlan {
  id: string
  user_id: string
  skill_key: string
  pillar: string
  goal: string
  target_date: string | null
  status: 'planned' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export async function getPlansForUser(userId: string): Promise<DevelopmentPlan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('development_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DevelopmentPlan[]
}

export async function upsertPlan(
  userId: string,
  plan: {
    skill_key: string
    pillar: string
    goal: string
    target_date?: string | null
    status: 'planned' | 'in_progress' | 'completed'
  }
): Promise<DevelopmentPlan> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('development_plans')
    .upsert(
      { user_id: userId, ...plan, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,skill_key' }
    )
    .select()
    .single()
  if (error) throw error
  return data as DevelopmentPlan
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/development-plans.ts
git commit -m "feat: add development plans db helpers"
```

---

## Task 4: Skill content data

**Files:**
- Create: `lib/skill-content.ts`
- Create: `__tests__/lib/skill-content.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/skill-content.test.ts
import { describe, it, expect } from 'vitest'
import { SKILLS } from '@/lib/skills'
import { SKILL_CONTENT } from '@/lib/skill-content'

describe('SKILL_CONTENT', () => {
  it('has an entry for every skill key', () => {
    SKILLS.forEach(skill => {
      expect(SKILL_CONTENT[skill.key], `Missing content for ${skill.key}`).toBeDefined()
    })
  })

  it('every entry has all four required sections', () => {
    Object.entries(SKILL_CONTENT).forEach(([key, content]) => {
      expect(content.whyItMatters.length, `${key}: whyItMatters empty`).toBeGreaterThan(0)
      expect(content.warningSigns.length, `${key}: warningSigns empty`).toBeGreaterThan(0)
      expect(content.pathways.length, `${key}: pathways empty`).toBeGreaterThan(0)
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- skill-content
```
Expected: FAIL — `Cannot find module '@/lib/skill-content'`

- [ ] **Step 3: Create `lib/skill-content.ts`**

The `description` field in `lib/skills.ts` serves as each skill's **Definition**. This file adds the remaining three sections. Source the content from the old build at `/Users/terry.brown/work/personal/brilliant managers/brilliant-managers/content/`. Complete all 36 entries.

```typescript
export interface SkillContent {
  whyItMatters: string
  warningSigns: string[]
  pathways: string[]
}

export const SKILL_CONTENT: Record<string, SkillContent> = {
  // --- SELF ---
  'self-time-task-management': {
    whyItMatters:
      'Your effectiveness as a manager is bounded by your own capacity. If you are constantly reactive, your team feels it — decisions slow down, blockers stay unresolved, and you become the constraint.',
    warningSigns: [
      'Calendar is back-to-back with no protected thinking time',
      'Regularly missing your own deadlines or commitments',
      'Saying yes to everything and delivering on little',
      'Team waits on you for decisions that should be quick',
    ],
    pathways: [
      'Time-block deep work before 10am — protect it like an external meeting',
      'Do a weekly calendar audit: which recurring meetings are yours to remove?',
      'Use a trusted system (GTD, Notion, paper) — the tool matters less than the habit',
      'Delegate decisions where you are not the best person to make them',
    ],
  },
  'self-empathy-compassion': {
    whyItMatters:
      'People perform best when they feel understood. Empathy is not softness — it is information. Knowing what a person is carrying helps you calibrate how hard to push, what support to offer, and when to back off.',
    warningSigns: [
      'Team members rarely share personal context with you',
      'You find yourself frustrated by what you perceive as excuses',
      'You default to solutions before the person has finished explaining the problem',
      'Feedback conversations feel transactional rather than human',
    ],
    pathways: [
      'Start 1:1s with a genuine "how are you, really?" and wait for the answer',
      'Practise reflecting back what you hear before responding',
      'Notice when you are listening to fix vs listening to understand',
      'Share your own challenges — vulnerability invites vulnerability',
    ],
  },
  'self-growth-mindset': {
    whyItMatters:
      'Managers who stop learning stop improving — and their teams feel it. A growth mindset models the behaviour you want from your team: curiosity over defensiveness, experiments over certainty.',
    warningSigns: [
      'Feedback triggers defensiveness rather than curiosity',
      'You rarely seek out learning outside your existing domain',
      'Mistakes in the team are treated as failures rather than data',
      'You avoid situations where you might look uncertain',
    ],
    pathways: [
      'Ask for feedback explicitly and specifically — "What is one thing I could do differently?"',
      'Dedicate 30 minutes per week to something outside your comfort zone',
      'Run team retrospectives that model learning from failure',
      'Share your own learning gaps openly with your team',
    ],
  },
  'self-emotional-intelligence': {
    whyItMatters:
      'Your emotional state is contagious. A manager who cannot read the room — or regulate their own reactions — creates unpredictability that teams learn to navigate around rather than engage with directly.',
    warningSigns: [
      'People visibly change behaviour when you are stressed',
      'You react quickly in heated moments and regret it later',
      'Team members walk on eggshells around difficult topics',
      'You miss signals that someone is struggling',
    ],
    pathways: [
      'Build a pause between trigger and response — even 10 seconds changes the outcome',
      'Name your emotional state to yourself before difficult conversations',
      'Ask "what is this person feeling right now?" before responding',
      'Debrief after moments where you did not like your own reaction',
    ],
  },
  'self-leadership-styles': {
    whyItMatters:
      'No single leadership style works for every person or situation. Over-directing experienced people disengages them. Under-directing new people leaves them adrift. The skill is in reading which mode is needed.',
    warningSigns: [
      'You manage everyone the same way regardless of their experience',
      'High performers feel micromanaged; new starters feel unsupported',
      'Your default is either fully hands-on or fully hands-off',
      'You find it hard to shift gears mid-conversation',
    ],
    pathways: [
      'Map each direct report on a 2×2 of competence vs commitment for their current role',
      'Explicitly agree with each person how much direction they want',
      'Practise coaching questions even when you know the answer',
      'Notice when you reach for your default style — and consciously try a different one',
    ],
  },
  'self-self-awareness': {
    whyItMatters:
      'Self-awareness is the foundation everything else is built on. Without it, you cannot improve — because you do not accurately see where the gaps are. The most dangerous blind spot is not knowing you have one.',
    warningSigns: [
      'Your self-perception and others\' perception of you diverge significantly',
      'You rarely receive critical feedback — possibly because people have stopped trying',
      'You attribute outcomes to external factors more than to your own choices',
      'You are surprised when people leave or disengage',
    ],
    pathways: [
      'Seek 360 feedback annually and take every point seriously',
      'Ask your most trusted direct report: "What is one thing I do that I probably don\'t notice?"',
      'Journal after hard weeks — look for your own patterns',
      'Find a peer or coach who will tell you the truth',
    ],
  },
  'self-cross-functional-skillset': {
    whyItMatters:
      'The further you go in management, the more you lead across domains you do not fully own. Breadth of understanding builds credibility, improves decisions, and helps you translate between functions.',
    warningSigns: [
      'You struggle to engage meaningfully with peer managers outside your domain',
      'Cross-functional projects get stuck because you cannot bridge the gap',
      'You default to your domain expertise when facilitating broader conversations',
      'Your network is entirely within your own function',
    ],
    pathways: [
      'Spend time with peers in other functions — ask them what their biggest challenges are',
      'Read widely outside your domain — annual reports, other industry press',
      'Volunteer for cross-functional projects where you will be out of your depth',
      'Ask "what does this look like from finance / product / ops?" in your own decisions',
    ],
  },
  'self-resilience': {
    whyItMatters:
      'Management is sustained difficulty. Resilience is not toughness — it is the ability to absorb pressure, recover from setbacks, and maintain enough stability that your team can lean on you when things are hard.',
    warningSigns: [
      'You absorb your team\'s stress and visibly carry it',
      'Hard periods leave you depleted for weeks',
      'You catastrophise when things go wrong',
      'You have no clear routines that restore your energy',
    ],
    pathways: [
      'Identify your personal recovery signals — what does depleted look like for you?',
      'Build non-negotiable recovery habits (exercise, sleep, social connection)',
      'Practise reframing: "What can I control here?" rather than spiralling on what you cannot',
      'Talk to someone — a peer, coach, or mentor — before problems compound',
    ],
  },
  'self-vulnerability-courage': {
    whyItMatters:
      'Psychological safety starts with the manager. If you never admit uncertainty, never share your own struggles, and never take stands that cost you something — you implicitly teach your team to do the same.',
    warningSigns: [
      'You never say "I don\'t know" in front of the team',
      'You avoid conflict until it becomes unavoidable',
      'Hard feedback is softened until the message is lost',
      'You change your position when challenged, even when you were right',
    ],
    pathways: [
      'The next time you don\'t know something, say so — out loud, to the team',
      'Share a recent mistake of your own in a team setting',
      'Name the hard thing in the room rather than waiting for someone else to',
      'Distinguish between "I changed my mind because of new information" and "I caved under pressure"',
    ],
  },

  // --- TEAM ---
  'team-dei': {
    whyItMatters:
      'Diverse teams make better decisions. Inclusive managers retain people who would otherwise leave. Equity is not a programme — it is a daily set of choices about who gets airtime, opportunities, and credit.',
    warningSigns: [
      'The same voices dominate in meetings',
      'Your team lacks diversity — and you have not interrogated why',
      'Informal opportunities (stretch projects, visibility) tend to go to the same people',
      'Feedback is applied inconsistently across the team',
    ],
    pathways: [
      'Audit who speaks in your meetings — actively draw in quieter voices',
      'Track stretch opportunities and make sure they are distributed intentionally',
      'Review your hiring process for where bias enters',
      'Ask directly: "Does everyone on this team feel like they belong here?"',
    ],
  },
  'team-coaching-mentoring': {
    whyItMatters:
      'The fastest way to scale your own impact is to make your team better. Coaching — asking rather than telling — builds capability and ownership. Mentoring builds people\'s careers. Both take time you will never regret spending.',
    warningSigns: [
      'Your 1:1s are status updates, not development conversations',
      'Team members ask for your opinion before forming their own',
      'You solve problems for people rather than with them',
      'Nobody on the team is visibly growing',
    ],
    pathways: [
      'Replace "here\'s what I\'d do" with "what have you tried?" and "what are your options?"',
      'Ask each direct report: "What are you working on that scares you a little?"',
      'Set a personal goal to grow someone into the role above theirs',
      'Read about the GROW model and use it deliberately in one 1:1 this week',
    ],
  },
  'team-one-to-ones': {
    whyItMatters:
      '1:1s are the highest-leverage conversation in management. Done well, they surface problems early, build trust, and give you the signal you need to manage effectively. Done badly — or skipped — they leave people feeling unseen.',
    warningSigns: [
      '1:1s are the first thing cancelled when things get busy',
      'The agenda is always set by you, never the other person',
      'You spend more time talking than listening',
      'You leave without knowing how that person is really doing',
    ],
    pathways: [
      'Make them non-negotiable — put them first in the calendar',
      'Ask each person to own the agenda for their 1:1',
      'Start with "what is on your mind?" and resist filling the silence',
      'End with "what support do you need from me this week?"',
    ],
  },
  'team-growth-progression': {
    whyItMatters:
      'People leave managers, not companies — and the most common reason is feeling stuck. When people see a path forward and feel you are invested in it, discretionary effort follows.',
    warningSigns: [
      'You cannot name each person\'s development goal',
      'Promotion conversations only happen when someone raises them',
      'Stretch opportunities are given to whoever asks, not whoever needs them',
      'High performers leave and you are surprised',
    ],
    pathways: [
      'Have a dedicated growth conversation with each person at least quarterly',
      'Know the criteria for the next level and make them explicit',
      'Create development plans — not just aspirations but actions with timelines',
      'Actively advocate for your people\'s progression in calibration conversations',
    ],
  },
  'team-performance-discipline': {
    whyItMatters:
      'Not addressing underperformance is a team-wide problem, not a private one. High performers notice. Trust in your leadership erodes. And the person struggling deserves to know — early enough to change.',
    warningSigns: [
      'You have been aware of an issue for months and not addressed it',
      'You give positive feedback in public and soften or avoid difficult feedback',
      'Performance conversations happen after problems have compounded',
      'The rest of the team is quietly compensating for someone\'s output',
    ],
    pathways: [
      'Address performance issues in the same week you notice them — not the same quarter',
      'Be specific: "Here is the behaviour I observed / here is the impact" not "you\'re not performing well"',
      'Document conversations — for everyone\'s protection',
      'Separate the message from the relationship — you can be kind and clear',
    ],
  },
  'team-accountability': {
    whyItMatters:
      'Accountability is not blame — it is the expectation that commitments are kept and that gaps are named honestly. Without it, deadlines slip, standards drift, and a culture of "good enough" sets in.',
    warningSigns: [
      'Commitments are regularly missed without being discussed',
      'People explain why something failed but no one asks what will change',
      'You absorb accountability that should sit with your team',
      'Retrospectives produce actions that are never reviewed',
    ],
    pathways: [
      'Close the loop: "You said X by Y — what happened, and what\'s next?"',
      'Make commitments explicit in writing — not just in conversation',
      'Ask "what will you do differently?" rather than accepting explanations as closure',
      'Model accountability yourself — when you miss something, own it publicly',
    ],
  },
  'team-unblocking': {
    whyItMatters:
      'Your team\'s throughput is partly determined by how fast you remove obstacles. Every day a blocker sits is a day of productivity — and morale — lost. Unblocking is often the highest-leverage thing a manager does in a given week.',
    warningSigns: [
      'Your team works around obstacles rather than escalating them',
      'You learn about blockers in retrospectives, not in the moment',
      'Dependencies on other teams take weeks to resolve',
      'People feel they have to manage upward to get things done',
    ],
    pathways: [
      'Ask in every 1:1: "What is slowing you down right now?"',
      'Create a low-friction channel for blockers — one message, fast response',
      'Take one cross-team dependency off your team\'s plate this week',
      'Report unresolved blockers up — do not absorb them silently',
    ],
  },
  'team-recruitment': {
    whyItMatters:
      'Hiring is the highest-leverage and hardest-to-reverse decision a manager makes. One bad hire affects the whole team; one great hire elevates everyone. Most managers spend too little time on this.',
    warningSigns: [
      'You hire based on gut feeling and culture fit alone',
      'Interviews are inconsistent across candidates',
      'Onboarding begins at "first day" rather than at "offer accepted"',
      'You settle for available rather than holding out for excellent',
    ],
    pathways: [
      'Define the role with a scorecard before opening the search',
      'Use structured interviews with consistent questions across all candidates',
      'Involve the team in hiring — they will work with this person',
      'Treat every candidate interaction as a signal — they are evaluating you too',
    ],
  },
  'team-onboarding': {
    whyItMatters:
      'The first 90 days determine whether a new joiner becomes a contributor or a drag on the team. Strong onboarding accelerates ramp time, builds early belonging, and signals what kind of team this is.',
    warningSigns: [
      'New starters figure things out by observing rather than being guided',
      'First week is mostly admin and waiting for access',
      'No structured check-ins in the first month',
      'New joiners are expected to contribute before they are ready',
    ],
    pathways: [
      'Build a 30/60/90 day plan with the new joiner in week one',
      'Assign a peer buddy — someone to ask questions without judgment',
      'Over-communicate in the first month: context, norms, expectations',
      'Schedule a frank "how is it really going?" conversation at 30 and 60 days',
    ],
  },
  'team-psychological-safety': {
    whyItMatters:
      'Amy Edmondson\'s research is unambiguous: psychological safety is the number one predictor of team performance. It does not mean comfort — it means people can take risks, speak up, and fail without fear of punishment.',
    warningSigns: [
      'People agree with you in meetings and disagree in the corridor',
      'Mistakes are hidden rather than surfaced',
      'Ideas are not challenged — everyone nods',
      'People do not push back on decisions they privately think are wrong',
    ],
    pathways: [
      'React to bad news with curiosity, not frustration',
      'Reward the raising of problems — explicitly thank people for surfacing issues',
      'Model intellectual humility: change your mind in public when warranted',
      'Ask for dissenting views explicitly: "Who thinks differently?"',
    ],
  },
  'team-cross-team-collaboration': {
    whyItMatters:
      'Most meaningful work happens across team boundaries. Managers who invest in peer relationships get things done faster, resolve conflicts earlier, and build reputational currency that their team benefits from.',
    warningSigns: [
      'Your team is seen as hard to work with by other teams',
      'Cross-functional projects are stressful and slow',
      'You rarely proactively communicate with peer managers',
      'Dependencies are managed reactively, not proactively',
    ],
    pathways: [
      'Invest in relationships before you need them — regular informal contact with peers',
      'Proactively share what your team is working on and how it intersects with others',
      'Resolve cross-team friction at the relationship level before escalating',
      'Celebrate cross-team wins publicly — make collaboration visible',
    ],
  },

  // --- STRATEGY ---
  'strategy-vision-creation': {
    whyItMatters:
      'People need to understand where they are going and why it matters. A clear vision makes prioritisation obvious, motivates discretionary effort, and allows the team to make good decisions independently.',
    warningSigns: [
      'Team members cannot articulate what the team is trying to achieve',
      'Every priority feels equally important',
      'The team is busy but not directional',
      'Vision only exists in a document no one reads',
    ],
    pathways: [
      'Write the vision in one sentence — if you cannot, it is not clear enough',
      'Test it: ask three team members to describe the team\'s goal in their own words',
      'Connect day-to-day work to the vision explicitly and regularly',
      'Revisit and update the vision when strategy shifts — stale vision is worse than none',
    ],
  },
  'strategy-culture-driving': {
    whyItMatters:
      'Culture is not a set of values on a wall — it is the behaviour that gets rewarded, tolerated, and punished. As the manager, you are the primary culture signal. What you do, not what you say, sets the norm.',
    warningSigns: [
      'Stated values and actual behaviours diverge',
      'You talk about culture in general terms but rarely in specifics',
      'Cultural issues are addressed with communications rather than decisions',
      'High-performing but culturally destructive behaviour goes unchallenged',
    ],
    pathways: [
      'Name specific behaviours you want to see — not abstract values',
      'Reward cultural behaviour explicitly, not just output',
      'Address cultural violations quickly — every miss sets a new norm',
      'Ask: "What story would a new joiner tell about how we work here?"',
    ],
  },
  'strategy-goal-setting': {
    whyItMatters:
      'Goals translate vision into something the team can act on. Vague goals produce vague output. Clear, measurable goals give people something to aim at and allow progress to be assessed honestly.',
    warningSigns: [
      'Goals are written once and rarely revisited',
      'It is unclear at quarter-end whether goals were met',
      'The team has too many goals to focus on any one thing',
      'Goals are inputs (activities) rather than outcomes',
    ],
    pathways: [
      'Write goals as outcomes: "Achieve X by Y" not "work on X"',
      'Three to five goals maximum — prioritisation is a skill',
      'Review goals monthly — not to judge but to adjust',
      'Distinguish between committed goals (must deliver) and aspirational goals (stretch)',
    ],
  },
  'strategy-change-management': {
    whyItMatters:
      'Organisations change constantly. Managers who handle change well keep their team\'s productivity and morale intact through the transition. Those who handle it poorly add a second wave of disruption on top of the first.',
    warningSigns: [
      'The team hears about changes at the same time as everyone else',
      'You relay organisational decisions without adding your own context',
      'People feel uncertain and anxious during change',
      'Resistance is treated as a problem rather than information',
    ],
    pathways: [
      'Get ahead of the message — your team should hear from you before the all-hands',
      'Acknowledge the impact honestly before moving to "here\'s the opportunity"',
      'Create space for questions — and answer them, including "I don\'t know yet"',
      'Listen to resistance — it often contains legitimate concerns',
    ],
  },
  'strategy-data-driven-decisions': {
    whyItMatters:
      'Decisions based on data are reproducible, learnable-from, and harder to challenge arbitrarily. Decisions based on intuition alone are invisible — nobody can see the reasoning, so nobody can improve on it.',
    warningSigns: [
      'Decisions are made based on whoever argues most forcefully',
      'You have no regular metrics review',
      'Data exists but is not consulted before decisions',
      'Gut feel and data are treated as interchangeable',
    ],
    pathways: [
      'Identify three to five metrics that matter for your team and review them weekly',
      'Build a habit: "What does the data say?" before "What do we think?"',
      'Distinguish correlation from causation — especially when things go wrong',
      'Share the data behind decisions with your team — transparency builds trust',
    ],
  },
  'strategy-stakeholder-management': {
    whyItMatters:
      'Your team\'s success depends on people outside your team. Stakeholders who trust you will give you the benefit of the doubt. Those who do not will block, delay, and second-guess everything.',
    warningSigns: [
      'Stakeholders are surprised by your team\'s direction or output',
      'Escalations come to you rather than being resolved at the working level',
      'Key relationships are transactional — only contact when there is a problem',
      'You are caught flat-footed by stakeholder reactions',
    ],
    pathways: [
      'Map your stakeholders: who has most influence on your team\'s success?',
      'Communicate proactively — do not wait for someone to ask for an update',
      'Invest in relationships before you need them',
      'Learn what each stakeholder cares most about — and speak to that',
    ],
  },
  'strategy-resource-planning': {
    whyItMatters:
      'Misallocated resources produce frustration, burnout, and missed priorities. Good resource planning makes the implicit explicit — forcing hard choices about what matters most.',
    warningSigns: [
      'Your team is simultaneously stretched and unclear on priorities',
      'New requests are added without removing existing commitments',
      'You do not know how your team\'s time is actually distributed',
      'Budget conversations happen too late to change decisions',
    ],
    pathways: [
      'Create a simple capacity model — where is your team\'s time going?',
      'Make prioritisation decisions explicit: "We are doing X instead of Y"',
      'Protect investment in people\'s development even when delivery is pressured',
      'Review resource allocation quarterly against strategic priorities',
    ],
  },
  'strategy-innovation-experimentation': {
    whyItMatters:
      'Teams that only optimise existing processes eventually fall behind. Creating deliberate space for experimentation — even in small ways — builds adaptability and signals that learning matters more than looking certain.',
    warningSigns: [
      'The answer to "what could we do differently?" is always "we\'ve always done it this way"',
      'Experiments are only run when mandated from above',
      'Failure is treated as a reason not to try again',
      'The team is busy but not generating new ideas',
    ],
    pathways: [
      'Protect a small amount of time (10%) for experiments — formally',
      'Run a "try it for two weeks" culture rather than deciding upfront if ideas will work',
      'Celebrate failed experiments that generated learning',
      'Ask regularly: "What is one thing we could test this quarter?"',
    ],
  },

  // --- COMMUNICATIONS ---
  'comms-relationships-partnerships': {
    whyItMatters:
      'Relationships are the infrastructure that work runs on. In a world of interdependence, trust built before a crisis is the asset that gets things done when everything is moving fast.',
    warningSigns: [
      'Your network is thin outside your immediate team',
      'You contact people primarily when you need something',
      'Relationship-building feels like a waste of time compared to "real work"',
      'You are surprised by decisions that affect your team',
    ],
    pathways: [
      'Schedule one relationship-building coffee per week — outside your team',
      'Offer value before you need something — introductions, knowledge, support',
      'Follow up after conversations — memory and follow-through build trust',
      'Map who most influences your team\'s outcomes and invest there first',
    ],
  },
  'comms-communication-excellence': {
    whyItMatters:
      'Clear communication is a force multiplier. When people understand what you mean, decisions are faster, alignment is deeper, and rework from misunderstanding is reduced. Most managers overestimate how clearly they communicate.',
    warningSigns: [
      'Decisions need to be re-explained repeatedly',
      'Written communication is long and hard to act on',
      'The same questions come back because the first answer was unclear',
      'People nod in meetings and then do different things',
    ],
    pathways: [
      'Start with the conclusion, then the reasoning — not the other way around',
      'Read your written communications from the recipient\'s perspective before sending',
      'Ask: "What question is this answering?" — if you cannot say, rewrite',
      'Use fewer words — brevity signals respect for the reader\'s time',
    ],
  },
  'comms-listening': {
    whyItMatters:
      'Most people listen to respond, not to understand. Real listening — the kind that makes people feel heard — is rare and powerful. It builds trust, surfaces better information, and changes what you do with what you hear.',
    warningSigns: [
      'You finish other people\'s sentences',
      'You are formulating your response while the other person is still talking',
      'People do not share bad news with you early',
      'You often miss the subtext of what people are saying',
    ],
    pathways: [
      'Practise full stops — let silences exist before you respond',
      'Reflect back what you heard: "So you\'re saying..." before adding your view',
      'Put away your phone and laptop — attention signals respect',
      'Ask follow-up questions before offering any opinion',
    ],
  },
  'comms-storytelling': {
    whyItMatters:
      'Data informs; stories move people. The manager who can connect facts to meaning — through narrative — creates understanding that lasts and motivates action. Presentations, pitches, and change conversations all benefit from this.',
    warningSigns: [
      'Your presentations are data-heavy and hard to remember',
      'People understand what you are proposing but not why it matters',
      'Context is delivered as a preamble rather than woven through the message',
      'Emotion is absent from your professional communication',
    ],
    pathways: [
      'Structure communication as: situation → complication → resolution',
      'Find the human angle: who is affected, how, and why does it matter?',
      'Use specific examples rather than general principles',
      'Practise: after a presentation, can someone repeat the key message back to you?',
    ],
  },
  'comms-feedback': {
    whyItMatters:
      'Feedback is the mechanism through which people improve. Without it, good behaviour is not reinforced and poor behaviour is not corrected. Most managers give too little feedback — and what they give is too vague to act on.',
    warningSigns: [
      'Feedback is reserved for formal reviews',
      'Positive feedback is generic: "great job" rather than specific',
      'Developmental feedback is softened to the point of being invisible',
      'You give feedback to the same people and avoid others',
    ],
    pathways: [
      'Give feedback within 48 hours of the behaviour — proximity matters',
      'Use the SBI model: Situation, Behaviour, Impact',
      'Make positive feedback specific enough to be repeatable',
      'Ask: "Can I share an observation?" — the question itself signals respect',
    ],
  },
  'comms-difficult-conversations': {
    whyItMatters:
      'Avoiding difficult conversations does not make them go away — it makes them worse. The manager who can navigate conflict and discomfort honestly and humanely builds a team where problems get solved rather than accumulate.',
    warningSigns: [
      'You have conversations you have been putting off for weeks',
      'Difficult messages get so many caveats they lose their meaning',
      'You raise a concern and then immediately walk it back under pushback',
      'Team conflict surfaces to you rather than being resolved between people',
    ],
    pathways: [
      'Name the uncomfortable thing early: "I want to talk about something difficult"',
      'Prepare the message — know what you want to say before you are in the room',
      'Separate the person from the problem — attack the issue, respect the individual',
      'Do not rescue: allow silence and discomfort to do their work',
    ],
  },

  // --- DOMAIN EXPERTISE ---
  'domain-process-innovation': {
    whyItMatters:
      'Process debt accumulates silently. Teams that never examine how they work spend increasing effort on decreasing output. Intentional process improvement is a force multiplier — one change that compounds.',
    warningSigns: [
      'Processes exist because "that\'s how we\'ve always done it"',
      'Retrospectives produce actions that are not followed through',
      'Manual work that could be automated is tolerated',
      'Your team spends time on low-value coordination overhead',
    ],
    pathways: [
      'Run a quarterly process audit: what takes the most time relative to its value?',
      'Give the team permission and space to improve their own ways of working',
      'Automate one repetitive manual process per quarter',
      'Measure the before-and-after of process changes — show the impact',
    ],
  },
  'domain-technical-mastery': {
    whyItMatters:
      'You do not need to be the best individual contributor on your team — but you need enough mastery to evaluate quality, ask good questions, and maintain your team\'s respect. Falling too far behind the domain creates a credibility gap.',
    warningSigns: [
      'You cannot evaluate whether your team\'s work is good',
      'Technical decisions are made without your meaningful input',
      'Your team stops bringing you into domain conversations',
      'You rely entirely on your team\'s confidence as a quality signal',
    ],
    pathways: [
      'Stay close to the work — occasionally do the thing, not just manage it',
      'Dedicate time to learning the evolving landscape of your domain',
      'Ask your strongest team member to teach you something once a month',
      'Be explicit about where you are not the expert — and where you expect to rely on them',
    ],
  },
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- skill-content
```
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/skill-content.ts __tests__/lib/skill-content.test.ts
git commit -m "feat: add skill content data (definition, why, warnings, pathways)"
```

---

## Task 5: LogoMark component

**Files:**
- Create: `components/app/LogoMark.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/app/LogoMark.tsx
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Brilliant Managers">
      <rect width="32" height="32" rx="7" fill="#f59e0b" />
      <path
        d="M5,24 C9,22 13,12 17,15 C21,18 23,7 27,6 L27,27 L5,27 Z"
        fill="#0f172a"
        opacity="0.25"
      />
      <path
        d="M5,24 C9,22 13,12 17,15 C21,18 23,7 27,6"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="27" cy="6" r="2.5" fill="#0f172a" />
    </svg>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/LogoMark.tsx
git commit -m "feat: add LogoMark SVG component (A2 growth trajectory logo)"
```

---

## Task 6: NavItem component

**Files:**
- Create: `components/app/NavItem.tsx`
- Create: `__tests__/components/app/NavItem.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/app/NavItem.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavItem } from '@/components/app/NavItem'
import { LayoutDashboard } from 'lucide-react'

// Mock usePathname
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))

describe('NavItem', () => {
  it('renders label when expanded', () => {
    render(
      <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isExpanded={true} />
    )
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })

  it('hides label when collapsed', () => {
    render(
      <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isExpanded={false} />
    )
    expect(screen.queryByText('Dashboard')).toBeNull()
  })

  it('applies active styles when pathname matches href', () => {
    const { container } = render(
      <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isExpanded={true} />
    )
    const link = container.querySelector('a')
    expect(link?.getAttribute('aria-current')).toBe('page')
  })

  it('does not apply active styles for non-matching pathname', () => {
    const { container } = render(
      <NavItem href="/growth" icon={LayoutDashboard} label="Growth" isExpanded={true} />
    )
    const link = container.querySelector('a')
    expect(link?.getAttribute('aria-current')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- NavItem
```
Expected: FAIL — module not found

- [ ] **Step 3: Create the component**

```tsx
// components/app/NavItem.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isExpanded: boolean
}

export function NavItem({ href, icon: Icon, label, isExpanded }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      title={!isExpanded ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isExpanded ? 10 : 0,
        width: isExpanded ? '100%' : 40,
        height: 40,
        padding: isExpanded ? '0 10px' : '0',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        borderRadius: 8,
        textDecoration: 'none',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s',
        background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
        color: isActive ? '#f59e0b' : '#64748b',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          ;(e.currentTarget as HTMLElement).style.background = '#1f2937'
          ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = '#64748b'
        }
      }}
    >
      <Icon size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      {isExpanded && (
        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
      )}
    </Link>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- NavItem
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/app/NavItem.tsx __tests__/components/app/NavItem.test.tsx
git commit -m "feat: add NavItem component with active route detection"
```

---

## Task 7: Sidebar component

**Files:**
- Create: `components/app/Sidebar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/app/Sidebar.tsx
'use client'
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  Network,
  TrendingUp,
} from 'lucide-react'
import { LogoMark } from './LogoMark'
import { NavItem } from './NavItem'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/scorecard', icon: ClipboardCheck, label: 'Scorecard' },
  { href: '/results', icon: BarChart3, label: 'Results' },
  { href: '/organisation', icon: Network, label: 'Organisation' },
  { href: '/growth', icon: TrendingUp, label: 'Growth' },
] as const

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  return (
    <div
      style={{
        width: isExpanded ? 220 : 56,
        background: '#111827',
        borderRight: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isExpanded ? 'flex-start' : 'center',
        padding: isExpanded ? '12px 8px' : '12px 0',
        gap: 4,
        flexShrink: 0,
        position: 'relative',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          flexShrink: 0,
          padding: isExpanded ? '0 4px' : 0,
          width: isExpanded ? '100%' : 40,
          justifyContent: isExpanded ? 'flex-start' : 'center',
        }}
      >
        <LogoMark size={32} />
        {isExpanded && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.3px',
            }}
          >
            Brilliant Managers
          </span>
        )}
      </div>

      {/* Nav */}
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isExpanded={isExpanded}
        />
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          position: 'absolute',
          right: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 20,
          height: 20,
          background: '#1f2937',
          border: '1px solid #334155',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#64748b',
          zIndex: 10,
        }}
      >
        {isExpanded ? '‹' : '›'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/Sidebar.tsx
git commit -m "feat: add Sidebar component with collapsible nav"
```

---

## Task 8: AvatarDropdown + Topbar

**Files:**
- Create: `components/app/AvatarDropdown.tsx`
- Create: `components/app/Topbar.tsx`
- Create: `__tests__/components/app/AvatarDropdown.test.tsx`

- [ ] **Step 1: Write the failing AvatarDropdown test**

```tsx
// __tests__/components/app/AvatarDropdown.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AvatarDropdown } from '@/components/app/AvatarDropdown'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const user = { displayName: 'Terry Brown', email: 'terry@test.com', initials: 'TB' }

describe('AvatarDropdown', () => {
  it('shows initials on the button', () => {
    render(<AvatarDropdown user={user} />)
    expect(screen.getByText('TB')).toBeTruthy()
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

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- AvatarDropdown
```
Expected: FAIL — module not found

- [ ] **Step 3: Create AvatarDropdown**

```tsx
// components/app/AvatarDropdown.tsx
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
        }}
      >
        {user.initials}
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
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{user.email}</div>
          </div>

          {/* Items */}
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

- [ ] **Step 4: Create Topbar**

```tsx
// components/app/Topbar.tsx
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
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Prefix match for nested routes (e.g. /scorecard/self)
  const prefix = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k + '/'))
  return prefix ? PAGE_TITLES[prefix] : 'Brilliant Managers'
}

interface UserInfo {
  displayName: string
  email: string
  initials: string
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
      <span style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc', flex: 1 }}>{title}</span>

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

- [ ] **Step 5: Run AvatarDropdown test to confirm it passes**

```bash
npm test -- AvatarDropdown
```
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add components/app/AvatarDropdown.tsx components/app/Topbar.tsx \
  __tests__/components/app/AvatarDropdown.test.tsx
git commit -m "feat: add AvatarDropdown and Topbar components"
```

---

## Task 9: AppShell

**Files:**
- Create: `components/app/AppShell.tsx`

- [ ] **Step 1: Create AppShell**

```tsx
// components/app/AppShell.tsx
'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const LS_KEY = 'bm_sidebar_expanded'

interface UserInfo {
  displayName: string
  email: string
  initials: string
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

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      setIsExpanded(localStorage.getItem(LS_KEY) === 'true')
    } catch {
      // localStorage unavailable (e.g. SSR iframe) — keep default false
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
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/AppShell.tsx
git commit -m "feat: add AppShell client component with localStorage sidebar state"
```

---

## Task 10: Update (app)/layout.tsx

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Rewrite the layout to use AppShell**

Current file at `app/(app)/layout.tsx` returns `<>{children}</>` after auth check. Replace entirely:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const betaEmails = process.env.APP_BETA_EMAILS
  if (betaEmails) {
    const allowed = betaEmails.split(',').map(e => e.trim())
    if (!allowed.includes(user.email ?? '')) redirect('/the-tool')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'
  const email = user.email ?? ''
  const initials = getInitials(displayName, email)

  return (
    <AppShell
      user={{ displayName, email, initials }}
      showBeta={!!process.env.APP_BETA_EMAILS}
    >
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "feat: wire AppShell into (app) layout with user info"
```

---

## Task 11: Update middleware + auth callback

**Files:**
- Modify: `middleware.ts`
- Modify: `app/auth/callback/route.ts`

- [ ] **Step 1: Update middleware APP_ROUTES and login redirect**

In `middleware.ts`, replace the `APP_ROUTES` array and the post-login redirect:

```typescript
// Replace this line:
const APP_ROUTES = ['/scorecard', '/results', '/connections', '/manager']
// With:
const APP_ROUTES = [
  '/dashboard',
  '/scorecard',
  '/results',
  '/connections',
  '/manager',
  '/organisation',
  '/growth',
  '/profile',
  '/notifications',
]
```

Also replace the login redirect target:
```typescript
// Replace:
return NextResponse.redirect(new URL('/scorecard', request.url))
// With:
return NextResponse.redirect(new URL('/dashboard', request.url))
```

- [ ] **Step 2: Update auth callback redirect**

In `app/auth/callback/route.ts`, change the final redirect:
```typescript
// Replace:
return NextResponse.redirect(new URL('/scorecard', request.url))
// With:
return NextResponse.redirect(new URL('/dashboard', request.url))
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts app/auth/callback/route.ts
git commit -m "feat: add new routes to middleware; redirect post-login to /dashboard"
```

---

## Task 12: Remove page-level wrappers from existing pages

**Files:**
- Modify: `app/(app)/scorecard/page.tsx`
- Modify: `app/(app)/results/page.tsx`
- Modify: `app/(app)/connections/page.tsx`
- Modify: `app/(app)/manager/[userId]/page.tsx`

Each of these pages currently wraps their content in:
```tsx
<div className="dark min-h-screen" style={{ background: '#0f172a' }}>
  <div className="mx-auto max-w-2xl px-4 py-12">
    ...
  </div>
</div>
```

The AppShell now provides the background and scroll area. Remove the outer wrapper from each page, keeping only the inner content. The `max-w-2xl px-4` can stay on the inner div — it provides content width constraint which is still useful.

- [ ] **Step 1: Update scorecard page**

In `app/(app)/scorecard/page.tsx`, replace the outermost JSX wrapper:
```tsx
// Remove:
<div className="dark min-h-screen" style={{ background: '#0f172a' }}>
  <div className="mx-auto max-w-2xl px-4 py-12">
    ...
  </div>
</div>

// Replace with:
<div className="mx-auto max-w-2xl">
  ...
</div>
```
Keep all inner content unchanged.

- [ ] **Step 2: Update results page**

Same pattern in `app/(app)/results/page.tsx` — remove `dark min-h-screen` outer div, keep `max-w-2xl` inner div.

- [ ] **Step 3: Update connections page**

Same pattern in `app/(app)/connections/page.tsx`.

- [ ] **Step 4: Update manager page**

Same pattern in `app/(app)/manager/[userId]/page.tsx`.

- [ ] **Step 5: Run the test suite to confirm nothing broke**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/scorecard/page.tsx app/\(app\)/results/page.tsx \
  app/\(app\)/connections/page.tsx app/\(app\)/manager/\[userId\]/page.tsx
git commit -m "refactor: remove per-page full-screen wrappers (shell provides them)"
```

---

## Task 13: Dashboard page

**Files:**
- Create: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, LEVEL_VALUES, type Pillar, type Level } from '@/lib/skills'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)
  const plans = await getPlansForUser(user.id)
  const activePlans = plans.filter(p => p.status !== 'completed')

  if (!round) {
    return (
      <div className="mx-auto max-w-2xl">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
            Welcome to Brilliant Managers
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Start your first reflection to see your scores and growth insights here.
          </div>
        </div>
        <Link
          href="/scorecard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            background: '#f59e0b',
            color: '#0f172a',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Start your scorecard →
        </Link>
      </div>
    )
  }

  const scores = await getScoresForRound(round.id)

  const pillarAverages = PILLARS.map(pillar => {
    const pillarScores = scores.filter(s => s.pillar === pillar)
    const avg =
      pillarScores.length > 0
        ? pillarScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) /
          pillarScores.length
        : 0
    return { pillar: pillar as Pillar, avg }
  })

  const overallAvg =
    pillarAverages.reduce((sum, p) => sum + p.avg, 0) / pillarAverages.length

  const lowestPillar = [...pillarAverages].sort((a, b) => a.avg - b.avg)[0]

  const roundLabel = new Date(round.created_at).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>
            Welcome back
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Here is how your last reflection went.
          </div>
        </div>
        <Link
          href="/scorecard"
          style={{
            padding: '8px 14px',
            background: '#f59e0b',
            color: '#0f172a',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Start new reflection
        </Link>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <StatCard label="Latest round" value={roundLabel} sub="Last completed" />
        <StatCard label="Overall score" value={overallAvg.toFixed(1)} sub="Across all pillars" />
        <StatCard label="Active plans" value={String(activePlans.length)} sub={`${plans.length - activePlans.length} completed`} />
      </div>

      {/* Lower area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pillar scores */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            Pillar scores
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pillarAverages.map(({ pillar, avg }) => (
              <PillarBar key={pillar} pillar={pillar} avg={avg} />
            ))}
          </div>
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <Link href="/results" style={{ fontSize: 12, color: '#f59e0b', textDecoration: 'none' }}>
              View full results →
            </Link>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Growth nudge */}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            Growth nudge
          </div>
          <div style={{ background: '#1e3a5f', borderRadius: 8, padding: '12px 14px', borderLeft: '3px solid #f59e0b', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 4 }}>💡 From your latest scores</div>
            <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 500 }}>
              {PILLAR_LABELS[lowestPillar.pillar]} scored {lowestPillar.avg.toFixed(1)} — your lowest pillar.
            </div>
            <Link
              href="/growth"
              style={{
                display: 'inline-flex',
                marginTop: 8,
                padding: '5px 12px',
                background: 'rgba(245,158,11,0.1)',
                color: '#f59e0b',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Explore + set a plan →
            </Link>
          </div>

          {/* Active plans */}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
            Active plans
          </div>
          {activePlans.length === 0 ? (
            <div style={{ fontSize: 13, color: '#475569' }}>No active plans yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activePlans.slice(0, 3).map(plan => (
                <div
                  key={plan.id}
                  style={{
                    background: '#1e293b',
                    borderRadius: 8,
                    padding: '10px 14px',
                    borderLeft: `3px solid ${plan.status === 'in_progress' ? '#f59e0b' : '#60a5fa'}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2, textTransform: 'capitalize' }}>
                    {PILLAR_LABELS[plan.pillar as Pillar] ?? plan.pillar} · {plan.status.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: 13, color: '#f8fafc' }}>{plan.goal}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, letterSpacing: '0.5px', marginBottom: 6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function PillarBar({ pillar, avg }: { pillar: Pillar; avg: number }) {
  const pct = Math.round((avg / 5) * 100)
  const isLow = avg < 2.5
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#f8fafc' }}>{PILLAR_LABELS[pillar]}</span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 10,
            fontWeight: 600,
            background: isLow ? 'rgba(248,113,113,0.15)' : 'rgba(245,158,11,0.15)',
            color: isLow ? '#f87171' : '#f59e0b',
          }}
        >
          {avg.toFixed(1)}
        </span>
      </div>
      <div style={{ height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: isLow ? '#f87171' : '#f59e0b',
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx
git commit -m "feat: add Dashboard page with stats, pillar scores, and growth nudge"
```

---

## Task 14: Organisation page

**Files:**
- Create: `app/(app)/organisation/page.tsx`

- [ ] **Step 1: Create the placeholder page**

```tsx
export default function OrganisationPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
          Organisation
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Your team hierarchy and direct reports.
        </div>
      </div>

      {/* Placeholder team list */}
      <div style={{ background: '#1e293b', borderRadius: 10, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
          Once your team joins, you will see their aggregated scores alongside your own, making
          it easy to spot team-wide strengths and development opportunities.
        </div>
        <button
          disabled
          style={{
            padding: '8px 16px',
            background: '#1f2937',
            color: '#475569',
            border: '1px solid #334155',
            borderRadius: 7,
            fontSize: 13,
            cursor: 'not-allowed',
          }}
        >
          Invite a team member — coming soon
        </button>
      </div>

      {/* Placeholder direct reports */}
      {[
        { name: 'Alex Johnson', role: 'Senior Engineer', initials: 'AJ' },
        { name: 'Sam Rivera', role: 'Product Designer', initials: 'SR' },
        { name: 'Jordan Lee', role: 'Engineering Manager', initials: 'JL' },
      ].map(person => (
        <div
          key={person.initials}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#1e293b',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 8,
            opacity: 0.5,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#94a3b8',
              flexShrink: 0,
            }}
          >
            {person.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>{person.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{person.role}</div>
          </div>
          <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>Pending invite</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/organisation/page.tsx
git commit -m "feat: add Organisation placeholder page"
```

---

## Task 15: Growth page

**Files:**
- Create: `app/(app)/growth/page.tsx`
- Create: `app/(app)/growth/actions.ts`
- Create: `components/app/GrowthView.tsx`

- [ ] **Step 1: Create the server action**

```typescript
// app/(app)/growth/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { upsertPlan } from '@/lib/db/development-plans'

export async function upsertPlanAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const skillKey = formData.get('skillKey') as string
  const pillar = formData.get('pillar') as string
  const goal = formData.get('goal') as string
  const targetDate = (formData.get('targetDate') as string) || null
  const status = (formData.get('status') as 'planned' | 'in_progress' | 'completed') ?? 'planned'

  if (!skillKey || !pillar || !goal?.trim()) return

  await upsertPlan(user.id, { skill_key: skillKey, pillar, goal: goal.trim(), target_date: targetDate, status })
  revalidatePath('/growth')
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2: Create the GrowthView client component**

```tsx
// components/app/GrowthView.tsx
'use client'
import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { PILLARS, PILLAR_LABELS, type Pillar, type Skill } from '@/lib/skills'
import { SKILL_CONTENT } from '@/lib/skill-content'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import { upsertPlanAction } from '@/app/(app)/growth/actions'

interface SkillWithScore extends Skill {
  score?: number
  suggested?: boolean
}

interface Props {
  skillsWithScores: SkillWithScore[]
  plans: DevelopmentPlan[]
}

export function GrowthView({ skillsWithScores, plans }: Props) {
  const [activePillar, setActivePillar] = useState<Pillar | 'all'>('all')
  const [selectedSkill, setSelectedSkill] = useState<SkillWithScore | null>(null)
  const [isPending, startTransition] = useTransition()

  const plansBySkillKey = Object.fromEntries(plans.map(p => [p.skill_key, p]))

  const filtered =
    activePillar === 'all'
      ? skillsWithScores
      : skillsWithScores.filter(s => s.pillar === activePillar)

  const suggested = filtered.filter(s => s.suggested)
  const rest = filtered.filter(s => !s.suggested)

  return (
    <div style={{ position: 'relative' }}>
      {/* Pillar filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {(['all', ...PILLARS] as const).map(p => (
          <button
            key={p}
            onClick={() => setActivePillar(p)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              border: '1px solid',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.1s',
              borderColor: activePillar === p ? '#f59e0b' : '#334155',
              color: activePillar === p ? '#f59e0b' : '#94a3b8',
              background: activePillar === p ? 'rgba(245,158,11,0.08)' : 'transparent',
            }}
          >
            {p === 'all' ? 'All pillars' : PILLAR_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Suggested section */}
      {suggested.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            💡 Suggested for you
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {suggested.map(skill => (
              <SkillCard key={skill.key} skill={skill} plan={plansBySkillKey[skill.key]} onExplore={() => setSelectedSkill(skill)} />
            ))}
          </div>
        </div>
      )}

      {/* All skills */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
        All skills
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {rest.map(skill => (
          <SkillCard key={skill.key} skill={skill} plan={plansBySkillKey[skill.key]} onExplore={() => setSelectedSkill(skill)} />
        ))}
      </div>

      {/* Detail panel */}
      {selectedSkill && (
        <DetailPanel
          skill={selectedSkill}
          plan={plansBySkillKey[selectedSkill.key]}
          onClose={() => setSelectedSkill(null)}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}
    </div>
  )
}

function SkillCard({
  skill,
  plan,
  onExplore,
}: {
  skill: SkillWithScore
  plan?: DevelopmentPlan
  onExplore: () => void
}) {
  return (
    <div
      style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}
      onClick={onExplore}
    >
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #0f172a' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>
          {skill.label}
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          {PILLAR_LABELS[skill.pillar]}
        </div>
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {skill.score != null ? (
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 600,
              background: skill.score < 2.5 ? 'rgba(248,113,113,0.15)' : 'rgba(245,158,11,0.15)',
              color: skill.score < 2.5 ? '#f87171' : '#f59e0b',
            }}
          >
            {skill.score.toFixed(1)}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#475569' }}>Not scored</span>
        )}
        {plan && (
          <span style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', textTransform: 'capitalize' }}>
            {plan.status.replace('_', ' ')}
          </span>
        )}
        <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 500 }}>Explore →</span>
      </div>
    </div>
  )
}

function DetailPanel({
  skill,
  plan,
  onClose,
  isPending,
  startTransition,
}: {
  skill: SkillWithScore
  plan?: DevelopmentPlan
  onClose: () => void
  isPending: boolean
  startTransition: React.TransitionStartFunction
}) {
  const content = SKILL_CONTENT[skill.key]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => upsertPlanAction(fd))
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: 400,
        background: '#111827',
        borderLeft: '1px solid #1f2937',
        padding: 24,
        overflowY: 'auto',
        zIndex: 100,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 28,
          height: 28,
          background: '#1f2937',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
        }}
        aria-label="Close panel"
      >
        <X size={14} />
      </button>

      <div style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', marginBottom: 4, paddingRight: 32 }}>
        {skill.label}
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 20 }}>
        {PILLAR_LABELS[skill.pillar]}
      </div>

      {/* Definition */}
      <Section title="Definition">
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{skill.description}</p>
      </Section>

      {content && (
        <>
          <Section title="Why it matters">
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{content.whyItMatters}</p>
          </Section>

          <Section title="Warning signs">
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {content.warningSigns.map(w => (
                <li key={w} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 4 }}>
                  {w}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Pathways to improvement">
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {content.pathways.map(p => (
                <li key={p} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 4 }}>
                  {p}
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}

      {/* Development plan form */}
      <div style={{ borderTop: '1px solid #1f2937', paddingTop: 20, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 12 }}>
          {plan ? 'Update development plan' : 'Set a development plan'}
        </div>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="skillKey" value={skill.key} />
          <input type="hidden" name="pillar" value={skill.pillar} />

          <FieldLabel>Goal</FieldLabel>
          <textarea
            name="goal"
            defaultValue={plan?.goal ?? ''}
            placeholder="What do you want to achieve with this skill?"
            required
            style={textareaStyle}
          />

          <FieldLabel>Target date</FieldLabel>
          <input
            type="date"
            name="targetDate"
            defaultValue={plan?.target_date ?? ''}
            style={inputStyle}
          />

          <FieldLabel>Status</FieldLabel>
          <select name="status" defaultValue={plan?.status ?? 'planned'} style={inputStyle}>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '9px 0',
              background: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              cursor: isPending ? 'wait' : 'pointer',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? 'Saving…' : plan ? 'Update plan' : 'Save plan'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginBottom: 6, letterSpacing: '0.3px' }}>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '9px 12px',
  fontSize: 13,
  color: '#f8fafc',
  outline: 'none',
  fontFamily: 'inherit',
  marginBottom: 12,
  display: 'block',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical' as const,
  minHeight: 80,
}
```

- [ ] **Step 3: Create the server page**

```tsx
// app/(app)/growth/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import { SKILLS, LEVEL_VALUES, type Level } from '@/lib/skills'
import { GrowthView } from '@/components/app/GrowthView'

export default async function GrowthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)
  const plans = await getPlansForUser(user.id)

  let scoresBySkillKey: Record<string, number> = {}
  if (round) {
    const scores = await getScoresForRound(round.id)
    scores.forEach(s => {
      scoresBySkillKey[s.skill_key] = LEVEL_VALUES[s.level as Level]
    })
  }

  // Tag the two lowest-scored skills as suggested
  const sorted = [...SKILLS]
    .filter(s => scoresBySkillKey[s.key] != null)
    .sort((a, b) => (scoresBySkillKey[a.key] ?? 999) - (scoresBySkillKey[b.key] ?? 999))
  const suggestedKeys = new Set(sorted.slice(0, 2).map(s => s.key))

  const skillsWithScores = SKILLS.map(skill => ({
    ...skill,
    score: scoresBySkillKey[skill.key],
    suggested: suggestedKeys.has(skill.key),
  }))

  return (
    <div className="mx-auto max-w-4xl">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>Growth</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Explore skills, understand what great looks like, and set development plans.
        </div>
      </div>
      <GrowthView skillsWithScores={skillsWithScores} plans={plans} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/growth/page.tsx app/\(app\)/growth/actions.ts components/app/GrowthView.tsx
git commit -m "feat: add Growth page with skill cards, detail panel, and development plans"
```

---

## Task 16: Profile page

**Files:**
- Create: `app/(app)/profile/page.tsx`
- Create: `app/(app)/profile/actions.ts`

- [ ] **Step 1: Create the server action**

```typescript
// app/(app)/profile/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/profiles'

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const displayName = (formData.get('displayName') as string)?.trim()
  const jobTitle = (formData.get('jobTitle') as string)?.trim()
  const bio = (formData.get('bio') as string)?.trim()

  await updateProfile(user.id, {
    display_name: displayName || undefined,
    job_title: jobTitle || undefined,
    bio: bio || undefined,
  })

  revalidatePath('/profile')
}
```

- [ ] **Step 2: Create the profile page**

```tsx
// app/(app)/profile/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/profiles'
import { updateProfileAction } from './actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)

  return (
    <div className="mx-auto max-w-xl">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
          Profile &amp; Settings
        </div>
      </div>

      {/* Photo upload (UI only — upload wiring is a future spec) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#1e293b',
            border: '2px dashed #334155',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'not-allowed',
            color: '#475569',
            fontSize: 11,
            textAlign: 'center',
            gap: 4,
          }}
          title="Photo upload coming soon"
        >
          <span style={{ fontSize: 20 }}>📷</span>
          <span>Upload</span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>
            {profile?.display_name ?? user.email?.split('@')[0]}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{user.email}</div>
        </div>
      </div>

      <form action={updateProfileAction}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Display name</label>
          <input
            name="displayName"
            type="text"
            defaultValue={profile?.display_name ?? ''}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Job title</label>
          <input
            name="jobTitle"
            type="text"
            defaultValue={profile?.job_title ?? ''}
            placeholder="e.g. Engineering Manager"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Bio</label>
          <textarea
            name="bio"
            defaultValue={profile?.bio ?? ''}
            placeholder="A short bio about you and your management style..."
            style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }}
          />
        </div>

        {/* Notification prefs — UI only, not persisted in this spec */}
        <div style={{ borderTop: '1px solid #1f2937', paddingTop: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 12 }}>
            Notifications
          </div>
          {[
            { id: 'email-summary', label: 'Weekly email summary' },
            { id: 'nudges', label: 'Growth nudges' },
          ].map(({ id, label }) => (
            <div
              key={id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}
            >
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
              <div
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: '#334155',
                  cursor: 'not-allowed',
                  opacity: 0.5,
                }}
                title="Coming soon"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          style={{
            padding: '9px 24px',
            background: '#f59e0b',
            color: '#0f172a',
            border: 'none',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save changes
        </button>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#64748b',
  fontWeight: 500,
  marginBottom: 6,
  letterSpacing: '0.3px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '9px 12px',
  fontSize: 13,
  color: '#f8fafc',
  outline: 'none',
  fontFamily: 'inherit',
  display: 'block',
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/profile/page.tsx app/\(app\)/profile/actions.ts
git commit -m "feat: add Profile page with display name, job title, bio update action"
```

---

## Task 17: Notifications placeholder

**Files:**
- Create: `app/(app)/notifications/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import Link from 'next/link'

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
          Notifications
        </div>
      </div>
      <div style={{ background: '#1e293b', borderRadius: 10, padding: 24 }}>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
          Notification preferences are managed from your profile page. Email summaries and
          growth nudges will be configurable here once notification delivery is set up.
        </p>
        <Link
          href="/profile"
          style={{ fontSize: 13, color: '#f59e0b', fontWeight: 500, textDecoration: 'none' }}
        >
          Go to Profile &amp; Settings →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/notifications/page.tsx
git commit -m "feat: add Notifications placeholder page"
```

---

## Task 18: Smoke test the full shell

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Manual verification checklist**

Open `http://localhost:3000` and verify:

| Check | Expected |
|---|---|
| Unauthenticated visit to `/dashboard` | Redirects to `/login` |
| Login via magic link | Redirects to `/dashboard` after auth |
| Dashboard loads | Greeting + stats row visible. If no scores: empty state with CTA |
| Sidebar — collapsed state | 56px wide, icons only, no labels |
| Sidebar — expand toggle | Clicks to 220px, labels appear, state persists on refresh |
| Active nav item | Amber background + amber icon on current page |
| Results nav item | Navigates to `/results`, existing radar chart renders |
| Scorecard nav item | Navigates to `/scorecard`, pillar list renders |
| Avatar button | Click opens dropdown with name + email |
| Avatar — Profile & settings | Navigates to `/profile` |
| Profile — save | Submits, page reloads, values preserved |
| Avatar — Sign out | Signs out, redirects to `/login` |
| Growth page | Pillar pills filter skill grid; clicking a skill opens detail panel |
| Growth — set plan | Fills form, submits; plan badge appears on skill card |
| Organisation page | Placeholder visible |
| Notifications page | Placeholder with link to Profile visible |
| 1024px viewport | No horizontal overflow on any page |

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: app navigation shell — all pages complete, shell wired"
```
