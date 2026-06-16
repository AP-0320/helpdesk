---
name: auth-system
description: How the helpdesk auth system is wired: better-auth, route guards, logout, sign-up disabled
metadata:
  type: project
---

**Sign-up is disabled** — `server/src/auth.ts` sets `emailAndPassword: { enabled: true, disableSignUp: true }`. There is no registration page or link anywhere in the client.

**Route structure** (`client/src/App.tsx`):
- `/login` — public, renders `LoginPage`
- `/*` catch-all → `<Navigate to="/dashboard" replace />`
- All other routes wrapped in `<ProtectedRoute>` which redirects to `/login` if `authClient.useSession()` returns no session
- `/users` additionally wrapped in `<AdminRoute>` which redirects to `/dashboard` if `session.user.role !== "ADMIN"`

**Session loading** — `useSession()` has an `isPending` state. Both `ProtectedRoute` and `AdminRoute` render `null` (blank page) while pending, then redirect. Tests must wait for URL to settle rather than asserting immediately on content.

**Login flow** — `LoginPage` uses `authClient.signIn.email(...)` with:
- `onSuccess`: `navigate("/dashboard")`
- `onError`: `setError("root", { message: ctx.error.message })`
- The button is disabled (`isSubmitting`) during the request

**Logout** — `Layout.tsx` calls `authClient.signOut({ fetchOptions: { onSuccess: () => navigate("/login") } })`. The "Sign out" button is a `<button>` (not a link).

**API error message** from better-auth for wrong credentials: `"Invalid email or password"` (exact casing confirmed by test).

**Rate limiting** is off in `NODE_ENV=test` — no need to throttle or space out login attempts.

**Roles**: `ADMIN` and `AGENT` (enum in Prisma). Only `ADMIN` users see the "Users" nav link and can access `/users`.
