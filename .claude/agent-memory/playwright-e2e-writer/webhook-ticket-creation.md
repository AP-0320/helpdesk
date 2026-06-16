---
name: webhook-ticket-creation
description: Pattern for creating tickets via the signed Resend webhook in E2E tests
metadata:
  type: project
---

Tickets have no POST /api/tickets endpoint. The only creation path is:
`POST ${API_BASE}/api/webhooks/inbound-email` — a Svix-signed Resend webhook.

## createTestTicket helper pattern

```typescript
import { request as playwrightRequest } from '@playwright/test'
import { Webhook } from 'svix'

const API_BASE = process.env.API_BASE!
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET!

function signPayload(secret: string, payload: string): Record<string, string> {
  const wh = new Webhook(secret)
  const msgId = `msg_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const now = new Date()
  return {
    'svix-id': msgId,
    'svix-timestamp': Math.floor(now.getTime() / 1000).toString(),
    'svix-signature': wh.sign(msgId, now, payload),
  }
}

async function createTestTicket(overrides = {}) {
  const apiContext = await playwrightRequest.newContext({ baseURL: API_BASE })
  const emailId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const payload = JSON.stringify({ type: 'email.received', created_at: new Date().toISOString(),
    data: { email_id: emailId, created_at: new Date().toISOString(),
      from: 'Jane Customer <jane@example.com>', to: ['support@helpdesk.com'],
      cc: [], bcc: [], message_id: '<test@mail.example.com>',
      subject: overrides.subject ?? 'Test ticket', attachments: [] } })
  const res = await apiContext.post('/api/webhooks/inbound-email', {
    headers: { 'content-type': 'application/json', ...signPayload(WEBHOOK_SECRET, payload) },
    data: payload,
  })
  const { id } = await res.json()
  await apiContext.post('/api/auth/sign-in/email',
    { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, rememberMe: false } })
  const ticket = await (await apiContext.get(`/api/tickets/${id}`)).json()
  await apiContext.dispose()
  return ticket
}
```

**Key notes:**
- Use `playwrightRequest.newContext()` (the standalone `request` export from `@playwright/test`), NOT the `playwright.request` fixture which is only available inside test functions.
- Always `dispose()` the context after use.
- Authenticate the apiContext via `POST /api/auth/sign-in/email` to access protected `/api/tickets/:id`.
- The webhook handler is idempotent on `email_id` — always use a unique emailId per test.

Related: [[seed-and-db]], [[auth-credentials]]
