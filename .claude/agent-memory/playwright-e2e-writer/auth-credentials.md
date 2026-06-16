---
name: auth-credentials
description: Seeded admin credentials and auth fixture patterns for E2E tests
metadata:
  type: project
---

Seeded admin user (created by `server/prisma/seed.ts`):
- Email: `admin@example.com`
- Password: `Password@123`
- Name: `Admin`
- Role: `ADMIN`

These are also exposed as constants from `e2e/fixtures/auth.fixture.ts`:
```typescript
export const ADMIN_EMAIL = 'admin@example.com'
export const ADMIN_PASSWORD = 'Password@123'
export const ADMIN_NAME = 'Admin'
```

`process.env.ADMIN_EMAIL` and `process.env.ADMIN_PASSWORD` are available in test files because `playwright.config.ts` loads `server/.env` via `dotenv.config`.

## Auth fixture

`e2e/fixtures/auth.fixture.ts` exports:
- `test` — extended test with `authenticatedPage` fixture (pre-logged-in via UI)
- `loginAsAdmin(page)` — performs full UI login, waits for `/dashboard`
- `expect` — re-exported from `@playwright/test`

Import: `import { test, expect } from '../fixtures/auth.fixture'`

The `authenticatedPage` fixture calls `loginAsAdmin(page)` in setup and provides the logged-in `Page` object. Use in test params as `{ authenticatedPage: page }`.

Related: [[seed-and-db]], [[webhook-ticket-creation]]
