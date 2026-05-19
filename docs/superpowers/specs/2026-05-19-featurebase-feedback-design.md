# Featurebase Feedback Widget — Design Spec

## Goal

Embed Featurebase's native feedback widget into all authenticated app pages so users can submit feedback without leaving the product. Users are silently identified via a server-signed JWT so their submissions are attributed in the Featurebase dashboard automatically.

---

## What was decided

| Decision | Choice | Reason |
|---|---|---|
| Entry point | Floating pill, bottom-right | Native Featurebase widget placement — prominent, always accessible |
| Interaction | Featurebase native button + panel | No custom UI needed; full Featurebase panel UX (boards, voting, changelogs) out of the box |
| Identity | Server-signed JWT (HS256) | Required by Featurebase by default; prevents impersonation |
| Scope | All authenticated app pages | Widget is mounted in `AppShell`, which wraps every `(app)/` route |

---

## Architecture

### Data flow

```
app/(app)/layout.tsx  [server]
  └─ generates featurebaseJwt (userId, email, name signed with FEATUREBASE_JWT_SECRET)
  └─ passes jwt + user props → <AppShell>

AppShell  [client]
  └─ <FeaturebaseProvider appId={NEXT_PUBLIC_FEATUREBASE_APP_ID} featurebaseJwt={jwt}>
       └─ <FeedbackWidget />   ← calls useFeedbackWidget, activates native floating button
       └─ {children}
```

### New files

- `lib/featurebase.ts` — `generateFeaturebaseJwt(user)` server function (signs JWT with `jsonwebtoken`)
- `components/app/FeedbackWidget.tsx` — client component; calls `useFeedbackWidget({ theme: 'dark', placement: 'right' })`

### Modified files

- `app/(app)/layout.tsx` — call `generateFeaturebaseJwt`, pass result as `featurebaseJwt` prop to `AppShell`
- `components/app/AppShell.tsx` — accept `featurebaseJwt` prop, wrap render tree with `FeaturebaseProvider`, mount `FeedbackWidget`

---

## Environment variables

| Variable | Scope | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_FEATUREBASE_APP_ID` | Public (client + server) | Featurebase → Settings → Developers → Installation |
| `FEATUREBASE_JWT_SECRET` | Server-only | Featurebase → Settings → Access & Security → Security |

`FEATUREBASE_JWT_SECRET` must **never** appear in a `NEXT_PUBLIC_` variable — it would bypass Featurebase's identity security entirely.

---

## Implementation detail

### JWT generation (`lib/featurebase.ts`)

Uses the `jsonwebtoken` npm package (`npm install jsonwebtoken` + `npm install --save-dev @types/jsonwebtoken`). Signed with HS256. Payload:

```ts
{
  userId: string  // Supabase user.id
  email: string   // user.email
  name: string    // profile.display_name ?? email prefix
}
```

The function is called once per request inside `app/(app)/layout.tsx`, which already fetches the user and profile. No extra database round-trip needed.

### Widget initialisation (`components/app/FeedbackWidget.tsx`)

```ts
useFeedbackWidget({
  theme: 'dark',
  placement: 'right',
  locale: 'en',
})
```

`FeaturebaseProvider` (from `featurebase-js/react`) wraps `AppShell`'s content and accepts `appId` + `featurebaseJwt`. The provider handles script loading internally — no manual `<Script>` tag needed.

### TypeScript

`featurebase-js` ships its own types. No ambient declarations needed.

---

## Featurebase portal setup (already completed)

For reference — steps completed before implementing:

1. **Settings → Developers → Installation** — copy App ID → `NEXT_PUBLIC_FEATUREBASE_APP_ID`
2. **Settings → Access & Security → Security** — copy JWT secret → `FEATUREBASE_JWT_SECRET`
3. Add both to `.env.local` and Netlify environment variables
4. Create at least one board (e.g. "Feature Requests", "Bugs")
5. Apply branding (see below)
6. Validate JWT config via the test tool in Settings → Access & Security

---

## Featurebase portal theming

| Setting | Value | Reason |
|---|---|---|
| Theme | Dark | Matches the app; avoids a jarring light flash when the widget opens |
| Brand color | `#f59e0b` | App's amber accent — used on Beta badge, LogoMark, and CTA buttons throughout |
| Logo | LogoMark (orange rounded square + chart) | Consistent brand identity; readable at small sizes |

The widget is also initialised with `theme: 'dark'` in code, so portal setting and in-app widget are consistent.

---

## Testing

- `__tests__/components/app/FeedbackWidget.test.tsx` — render test confirming the component mounts without error
- `__tests__/lib/featurebase.test.ts` — unit test for `generateFeaturebaseJwt`: verifies the JWT decodes to the expected payload fields (`userId`, `email`, `name`) with the correct algorithm

No integration test against the live Featurebase API — the widget is a third-party embed and is excluded from the test boundary.

---

## Out of scope

- Custom feedback form UI (Featurebase's panel handles this)
- Featurebase changelog widget (separate installation if needed later)
- Feedback widget on public (unauthenticated) pages — no user identity available
