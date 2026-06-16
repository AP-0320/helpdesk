/**
 * E2E tests for the inbound-email webhook endpoint.
 * These are API-only tests — no browser UI is involved.
 *
 * Endpoint under test: POST {API_BASE}/api/webhooks/inbound-email  (PORT env var, default 3000)
 *
 * Covered scenarios:
 *  1. 403 — no provider headers present
 *  2. 400 — Svix headers present but signed with wrong secret
 *  3. 400 — valid signature but payload fails Zod validation (wrong event type)
 *  4. 200 — valid signed payload creates a ticket and returns its id
 *  5. 200 — idempotency: same email_id sent twice returns the same ticket id
 *  6. Subject fallback — empty subject results in ticket subject "(No Subject)"
 *  7. from parsing — "Display Name <email>" extracts name and email correctly
 *  8. from parsing — bare email address results in fromName "Unknown"
 */

import { test, expect } from '@playwright/test'
import { Webhook } from 'svix'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = process.env.API_BASE!
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Signs a JSON payload string with the Resend webhook secret and returns
 * the three Svix headers required by the endpoint.
 */
function signPayload(secret: string, payload: string): Record<string, string> {
  const wh = new Webhook(secret)
  const msgId = `msg_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000).toString()
  const signature = wh.sign(msgId, now, payload)
  return {
    'svix-id': msgId,
    'svix-timestamp': timestamp,
    'svix-signature': signature,
  }
}

/**
 * Returns a valid Resend inbound-email payload with a unique email_id to
 * prevent idempotency collisions between test runs.
 */
function buildPayload(overrides: {
  emailId?: string
  subject?: string
  from?: string
  type?: string
} = {}): object {
  return {
    type: overrides.type ?? 'email.received',
    created_at: new Date().toISOString(),
    data: {
      email_id: overrides.emailId ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: new Date().toISOString(),
      from: overrides.from ?? 'Jane Customer <jane@example.com>',
      to: ['support@helpdesk.com'],
      cc: [],
      bcc: [],
      message_id: '<test@mail.example.com>',
      subject: overrides.subject ?? 'I need help with my order',
      attachments: [],
    },
  }
}

/**
 * Signs in as admin using the api context.
 * The context's built-in cookie jar automatically stores and replays the
 * session cookie — no need to extract or pass it manually.
 */
async function loginAsAdmin(
  apiContext: import('@playwright/test').APIRequestContext,
): Promise<void> {
  const res = await apiContext.post('/api/auth/sign-in/email', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, rememberMe: false },
  })
  expect(res.status()).toBe(200)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('POST /api/webhooks/inbound-email', () => {
  let apiContext: import('@playwright/test').APIRequestContext

  test.beforeEach(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: API_BASE })
  })

  test.afterEach(async () => {
    await apiContext.dispose()
  })

  // -------------------------------------------------------------------------
  // 1. No provider headers → 403
  // -------------------------------------------------------------------------

  test('should return 403 when no webhook provider headers are present', async () => {
    const payload = JSON.stringify(buildPayload())

    const res = await apiContext.post('/api/webhooks/inbound-email', {
      headers: { 'content-type': 'application/json' },
      data: payload,
    })

    expect(res.status()).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ error: 'Request origin not allowed' })
  })

  // -------------------------------------------------------------------------
  // 2. Svix headers present but signed with wrong secret → 400
  // -------------------------------------------------------------------------

  test('should return 400 when the Svix signature is invalid', async () => {
    const payload = JSON.stringify(buildPayload())
    const wrongSecret = 'whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    const svixHeaders = signPayload(wrongSecret, payload)

    const res = await apiContext.post('/api/webhooks/inbound-email', {
      headers: { 'content-type': 'application/json', ...svixHeaders },
      data: payload,
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'Invalid webhook signature' })
  })

  // -------------------------------------------------------------------------
  // 3. Valid signature but payload fails Zod schema → 400
  // -------------------------------------------------------------------------

  test('should return 400 when the payload type is not "email.received"', async () => {
    const payload = JSON.stringify(
      buildPayload({ type: 'email.bounced' }),
    )
    const svixHeaders = signPayload(WEBHOOK_SECRET, payload)

    const res = await apiContext.post('/api/webhooks/inbound-email', {
      headers: { 'content-type': 'application/json', ...svixHeaders },
      data: payload,
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({ error: 'Invalid payload' })
  })

  // -------------------------------------------------------------------------
  // 4. Valid signed payload → 200 + ticket created
  // -------------------------------------------------------------------------

  test('should return 200 with a ticket id and the ticket appears in the ticket list', async () => {
    const emailId = `test-create-${Date.now()}`
    const subject = 'Please help me with my order'
    const payload = JSON.stringify(buildPayload({ emailId, subject }))
    const svixHeaders = signPayload(WEBHOOK_SECRET, payload)

    const webhookRes = await apiContext.post('/api/webhooks/inbound-email', {
      headers: { 'content-type': 'application/json', ...svixHeaders },
      data: payload,
    })

    expect(webhookRes.status()).toBe(200)
    const webhookBody = await webhookRes.json()
    expect(typeof webhookBody.id).toBe('string')
    expect(webhookBody.id.length).toBeGreaterThan(0)

    // Verify the ticket appears in the authenticated ticket list
    await loginAsAdmin(apiContext)
    const ticketsRes = await apiContext.get('/api/tickets')
    expect(ticketsRes.status()).toBe(200)
    const tickets = await ticketsRes.json()

    const created = tickets.find((t: { id: string }) => t.id === webhookBody.id)
    expect(created).toBeDefined()
    expect(created.subject).toBe(subject)
  })

  // -------------------------------------------------------------------------
  // 5. Idempotency — same email_id sent twice → same ticket id, no duplicate
  // -------------------------------------------------------------------------

  test('should return the same ticket id when the same email_id is sent twice', async () => {
    const emailId = `test-idempotency-${Date.now()}`
    const payload = JSON.stringify(buildPayload({ emailId }))
    const svixHeaders = signPayload(WEBHOOK_SECRET, payload)

    const requestOptions = {
      headers: { 'content-type': 'application/json', ...svixHeaders },
      data: payload,
    }

    const firstRes = await apiContext.post('/api/webhooks/inbound-email', requestOptions)
    expect(firstRes.status()).toBe(200)
    const firstBody = await firstRes.json()
    const firstId = firstBody.id

    // Second request with the same email_id — must produce same id
    const secondRes = await apiContext.post('/api/webhooks/inbound-email', requestOptions)
    expect(secondRes.status()).toBe(200)
    const secondBody = await secondRes.json()

    expect(secondBody.id).toBe(firstId)

    // Confirm only one ticket with this email_id exists in the list
    await loginAsAdmin(apiContext)
    const ticketsRes = await apiContext.get('/api/tickets')
    const tickets = await ticketsRes.json()
    const matches = tickets.filter((t: { id: string }) => t.id === firstId)
    expect(matches).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // 6. Empty subject → subject stored as "(No Subject)"
  // -------------------------------------------------------------------------

  test('should store subject as "(No Subject)" when the subject field is empty', async () => {
    const emailId = `test-no-subject-${Date.now()}`
    const payload = JSON.stringify(buildPayload({ emailId, subject: '' }))
    const svixHeaders = signPayload(WEBHOOK_SECRET, payload)

    const webhookRes = await apiContext.post('/api/webhooks/inbound-email', {
      headers: { 'content-type': 'application/json', ...svixHeaders },
      data: payload,
    })

    expect(webhookRes.status()).toBe(200)
    const { id } = await webhookRes.json()

    await loginAsAdmin(apiContext)
    const ticketsRes = await apiContext.get('/api/tickets')
    const tickets = await ticketsRes.json()
    const ticket = tickets.find((t: { id: string }) => t.id === id)

    expect(ticket).toBeDefined()
    expect(ticket.subject).toBe('(No Subject)')
  })

  // -------------------------------------------------------------------------
  // 7. from parsing — "Display Name <email>" format
  // -------------------------------------------------------------------------

  test('should parse "Display Name <email>" into fromName and fromEmail', async () => {
    const emailId = `test-from-display-${Date.now()}`
    const from = 'Alice Smith <alice@example.com>'
    const payload = JSON.stringify(buildPayload({ emailId, from }))
    const svixHeaders = signPayload(WEBHOOK_SECRET, payload)

    const webhookRes = await apiContext.post('/api/webhooks/inbound-email', {
      headers: { 'content-type': 'application/json', ...svixHeaders },
      data: payload,
    })

    expect(webhookRes.status()).toBe(200)
    const { id } = await webhookRes.json()

    await loginAsAdmin(apiContext)
    const ticketsRes = await apiContext.get('/api/tickets')
    const tickets = await ticketsRes.json()
    const ticket = tickets.find((t: { id: string }) => t.id === id)

    expect(ticket).toBeDefined()
    expect(ticket.fromName).toBe('Alice Smith')
    expect(ticket.fromEmail).toBe('alice@example.com')
  })

  // -------------------------------------------------------------------------
  // 8. from parsing — bare email address → fromName "Unknown"
  // -------------------------------------------------------------------------

  test('should set fromName to "Unknown" when from is a bare email address', async () => {
    const emailId = `test-from-bare-${Date.now()}`
    const from = 'bob@example.com'
    const payload = JSON.stringify(buildPayload({ emailId, from }))
    const svixHeaders = signPayload(WEBHOOK_SECRET, payload)

    const webhookRes = await apiContext.post('/api/webhooks/inbound-email', {
      headers: { 'content-type': 'application/json', ...svixHeaders },
      data: payload,
    })

    expect(webhookRes.status()).toBe(200)
    const { id } = await webhookRes.json()

    await loginAsAdmin(apiContext)
    const ticketsRes = await apiContext.get('/api/tickets')
    const tickets = await ticketsRes.json()
    const ticket = tickets.find((t: { id: string }) => t.id === id)

    expect(ticket).toBeDefined()
    expect(ticket.fromName).toBe('Unknown')
    expect(ticket.fromEmail).toBe('bob@example.com')
  })
})
