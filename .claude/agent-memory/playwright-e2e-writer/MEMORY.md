# Playwright E2E Writer — Memory Index

- [Seed Credentials](seed-credentials.md) — Admin email/password used in helpdesk_test; where they come from
- [Auth System](auth-system.md) — How better-auth, ProtectedRoute, AdminRoute, and Layout.signOut are wired together
- [Fixture Conventions](fixture-conventions.md) — Auth fixture exports, import patterns, authenticatedPage destructuring pattern
- [Selector Patterns](selector-patterns.md) — Confirmed selectors for login, nav, dashboard, users page, dialogs, alertdialog
- [TypeScript Setup](typescript-setup.md) — Root tsconfig covers e2e/**; use server's tsc to type-check; no tsc in root node_modules
- [Seed Data](seed-data.md) — Only admin is seeded; agent users must be created per-test with unique emails
- [API-Only Tests](api-only-tests.md) — Pattern for webhook/API tests: request.newContext, Svix signing, session cookie, unique email_id strategy
- [Ticket DB & body constraint](seed-and-db.md) — ticket.body always '' in tests; no agents seeded; unique emailId per test required
- [Ticket creation helper](webhook-ticket-creation.md) — createTestTicket: playwrightRequest.newContext + Svix sign + dispose pattern
- [shadcn Select interaction](shadcn-select-interaction.md) — filter by hasText to pick trigger, getByRole('option') for portal items, waitForResponse
