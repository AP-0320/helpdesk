---
name: fixture-conventions
description: Auth fixture exports, import patterns, and authenticatedPage usage for E2E tests in this project
metadata:
  type: project
---

**File**: `e2e/fixtures/auth.fixture.ts`

Exports:
- `ADMIN_EMAIL` = `admin@example.com`
- `ADMIN_PASSWORD` = `Password@123`
- `ADMIN_NAME` = `Admin`
- `loginAsAdmin(page: Page): Promise<void>` — imperative helper; fills email+password, clicks Sign in, waits for `/dashboard`. Use in `beforeEach` when many unauthenticated tests share a flow.
- `test` — extended base with `authenticatedPage` fixture; provides a `Page` already on `/dashboard` as admin.
- `expect` — re-exported from `@playwright/test`

**Import pattern for authenticated tests (most common):**
```typescript
import { test, expect } from '../fixtures/auth.fixture'
// Use: test('name', async ({ authenticatedPage }) => { ... })
// Or destructure inline: async ({ authenticatedPage: page }) => { ... }
```

**Import pattern for unauthenticated tests:**
```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin } from '../fixtures/auth.fixture'
```

Both `test` (from fixture) and plain `test` (from `@playwright/test`) can coexist by aliasing:
```typescript
import { test as authTest } from '../fixtures/auth.fixture'
import { test, expect } from '@playwright/test'
```

**Fixture location convention**: `e2e/fixtures/<domain>.fixture.ts` — the `.fixture.ts` suffix distinguishes fixtures from helpers or page objects.

**Note on `authenticatedPage` destructuring**: In `users.spec.ts` the pattern
`async ({ authenticatedPage: page })` is used so the variable is named `page` locally — cleaner
than `authenticatedPage.getByLabel(...)` everywhere.
