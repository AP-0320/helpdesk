---
name: api-only-tests
description: Pattern for API-only E2E tests using Playwright's request fixture — webhook and direct API tests without browser UI
metadata:
  type: project
---

## API-only test pattern

For tests that hit the server directly (no browser UI), use `playwright.request.newContext()` to create a dedicated `APIRequestContext` scoped to the API server base URL:

```ts
let apiContext: import('@playwright/test').APIRequestContext

test.beforeEach(async ({ playwright }) => {
  apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' })
})

test.afterEach(async () => {
  await apiContext.dispose()
})
```

**Why:** The global Playwright `baseURL` is `http://localhost:5173` (Vite). For API server calls, a separate context with `baseURL: 'http://localhost:3000'` must be created per test suite.

**Import directly from `@playwright/test`** — do not import the auth fixture's `test` for API-only suites.

## Svix webhook signing in tests

`svix` is a root-level workspace dependency (in the root `node_modules`). Import it directly:

```ts
import { Webhook } from 'svix'
```

Sign a payload string as:

```ts
const wh = new Webhook(secret)
const msgId = `msg_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
const now = new Date()
const signature = wh.sign(msgId, now, payload) // returns "v1,<base64>"
const headers = {
  'svix-id': msgId,
  'svix-timestamp': Math.floor(now.getTime() / 1000).toString(),
  'svix-signature': signature,
}
```

`RESEND_WEBHOOK_SECRET` is available as `process.env.RESEND_WEBHOOK_SECRET` because `playwright.config.ts` calls `dotenv.config({ path: 'server/.env' })` at startup.

## Getting an admin session cookie for API calls

Better Auth's sign-in endpoint: `POST /api/auth/sign-in/email` with `{ email, password, rememberMe: false }`. Read the `set-cookie` response header and pass it as `cookie` in subsequent request headers.

```ts
const res = await apiContext.post('/api/auth/sign-in/email', {
  data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, rememberMe: false },
})
const cookie = res.headers()['set-cookie']
```

## Unique email_id per test

Since the test DB is shared and not truncated between tests, use a unique `email_id` per test to avoid idempotency hits:

```ts
emailId: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
```

**How to apply:** Always generate a unique `email_id` for each ticket-creating webhook test. Never reuse a fixed ID across tests.
