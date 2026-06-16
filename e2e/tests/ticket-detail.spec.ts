/**
 * E2E tests for the ticket detail page (/tickets/:id) and the reply feature.
 *
 * Covered scenarios:
 *
 * Ticket detail — navigation
 *  1. Back link on the detail page navigates to /tickets
 *  2. Clicking a ticket subject link on /tickets navigates to /tickets/:id
 *
 * Ticket detail — content display
 *  3. Subject appears as an <h1> heading
 *  4. From name and email are shown (format: "Name <email>")
 *  5. To email is shown
 *  6. Received date/time is shown (non-empty string)
 *  7. Email body text appears in a <pre>
 *
 * Ticket detail — sidebar controls
 *  8. Status select shows "Open" by default
 *  9. Changing status to "Resolved" sends PATCH and reflects the new value
 * 10. Changing category to "Technical Issue" sends PATCH and reflects the new value
 * 11. Resetting category to "No category" sends PATCH
 *
 * Reply feature — button and form toggle
 * 12. "Reply" button is visible below the body
 * 13. Clicking "Reply" reveals the textarea and hides the button
 * 14. "Cancel" hides the form and restores the "Reply" button
 * 15. Cancelling clears any text typed into the textarea
 *
 * Reply feature — validation
 * 16. Submitting an empty reply shows "Reply is required"
 *
 * Reply feature — happy path
 * 17. Submitting a reply closes the form and the "Reply" button reappears
 * 18. The submitted reply body appears in the thread
 * 19. "agent" type label appears next to the author name in the thread
 * 20. Reply persists after a full page reload (fetched from DB)
 */

import { test, expect } from '../fixtures/auth.fixture'
import { request as playwrightRequest } from '@playwright/test'
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
 * Returns a valid Resend inbound-email payload with a unique email_id.
 *
 * Note: the server fetches the email body from the Resend API after receiving
 * the webhook. In the test environment that fetch will silently fail (no real
 * Resend API key / email_id), so ticket.body will always be '' in tests.
 */
function buildPayload(overrides: {
  emailId?: string
  subject?: string
  from?: string
  to?: string[]
} = {}): object {
  return {
    type: 'email.received',
    created_at: new Date().toISOString(),
    data: {
      email_id: overrides.emailId ?? `test-detail-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: new Date().toISOString(),
      from: overrides.from ?? 'Jane Customer <jane@example.com>',
      to: overrides.to ?? ['support@helpdesk.com'],
      cc: [],
      bcc: [],
      message_id: '<test@mail.example.com>',
      subject: overrides.subject ?? 'Help needed with my order',
      attachments: [],
    },
  }
}

interface TestTicket {
  id: string
  subject: string
  fromName: string
  fromEmail: string
  toEmail: string
}

/**
 * Creates a ticket via the signed webhook, authenticates as admin to fetch
 * the ticket list, and returns the created ticket's details.
 * Each call uses a unique emailId to prevent idempotency collisions.
 */
async function createTestTicket(overrides: {
  subject?: string
  from?: string
} = {}): Promise<TestTicket> {
  const apiContext = await playwrightRequest.newContext({ baseURL: API_BASE })

  const emailId = `test-detail-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const payloadObj = buildPayload({
    emailId,
    subject: overrides.subject,
    from: overrides.from,
  })
  const payloadStr = JSON.stringify(payloadObj)
  const svixHeaders = signPayload(WEBHOOK_SECRET, payloadStr)

  const webhookRes = await apiContext.post('/api/webhooks/inbound-email', {
    headers: { 'content-type': 'application/json', ...svixHeaders },
    data: payloadStr,
  })

  if (!webhookRes.ok()) {
    throw new Error(`Webhook returned ${webhookRes.status()}: ${await webhookRes.text()}`)
  }

  const { id } = await webhookRes.json()

  // Authenticate as admin
  const signInRes = await apiContext.post('/api/auth/sign-in/email', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, rememberMe: false },
  })
  if (!signInRes.ok()) {
    throw new Error(`Sign-in failed with status ${signInRes.status()}`)
  }

  // Fetch the full ticket so we have all fields for assertions
  const ticketRes = await apiContext.get(`/api/tickets/${id}`)
  if (!ticketRes.ok()) {
    throw new Error(`GET /api/tickets/${id} failed with ${ticketRes.status()}`)
  }
  const ticket = await ticketRes.json()

  await apiContext.dispose()

  return {
    id: ticket.id,
    subject: ticket.subject,
    fromName: ticket.fromName,
    fromEmail: ticket.fromEmail,
    toEmail: ticket.toEmail,
  }
}

// ---------------------------------------------------------------------------
// Test groups
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1–2. Navigation
// ---------------------------------------------------------------------------

test.describe('Ticket detail — navigation', () => {
  let ticket: TestTicket

  test.beforeEach(async () => {
    ticket = await createTestTicket({
      subject: `Nav test ${Date.now()}`,
    })
  })

  test('should navigate back to /tickets when the Back link is clicked', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible()

    await page.getByRole('link', { name: /back/i }).click()

    await page.waitForURL('/tickets')
    await expect(page).toHaveURL('/tickets')
  })

  test('should navigate to /tickets/:id when the ticket subject link is clicked on /tickets', async ({ authenticatedPage: page }) => {
    await page.goto('/tickets')
    await page.waitForLoadState('networkidle')

    // The subject is rendered as a link in the table
    const subjectLink = page.getByRole('link', { name: ticket.subject })
    await expect(subjectLink).toBeVisible()
    await subjectLink.click()

    await page.waitForURL(`/tickets/${ticket.id}`)
    await expect(page).toHaveURL(`/tickets/${ticket.id}`)
  })
})

// ---------------------------------------------------------------------------
// 3–7. Content display
// ---------------------------------------------------------------------------

test.describe('Ticket detail — content display', () => {
  let ticket: TestTicket

  test.beforeEach(async () => {
    ticket = await createTestTicket({
      subject: `Content test ${Date.now()}`,
      from: 'Jane Customer <jane@example.com>',
    })
  })

  test('should display the ticket subject as an h1 heading', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await expect(page.getByRole('heading', { level: 1, name: ticket.subject })).toBeVisible()
  })

  test('should display the sender name and email', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    // TicketBasicDetails renders: <span>{fromName}</span> <span>&lt;{fromEmail}&gt;</span>
    await expect(page.getByText(ticket.fromName)).toBeVisible()
    await expect(page.getByText(`<${ticket.fromEmail}>`)).toBeVisible()
  })

  test('should display the recipient (To) email', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await expect(page.getByText(ticket.toEmail)).toBeVisible()
  })

  test('should display a non-empty received date/time', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    // The Received field is a formatted date string inside a <dd>. We find
    // the <dt> labelled "Received" and assert that the sibling <dd> has text.
    const receivedDt = page.getByText('Received', { exact: false }).first()
    await expect(receivedDt).toBeVisible()

    // The formatted date is rendered in the same <div> — assert its <dd> is non-empty
    // by checking the parent dl contains a non-empty text node after "Received"
    const receivedValue = page.locator('dl dd').last()
    await expect(receivedValue).not.toHaveText('')
  })

  test('should render a <pre> element for the email body', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    // The server fetches the email body from the Resend API after webhook ingestion.
    // In the test environment that fetch silently fails, so body is ''. We assert
    // the <pre> element itself is present in the DOM as part of the rendered ticket.
    await expect(page.locator('pre')).toBeAttached()
  })
})

// ---------------------------------------------------------------------------
// 8–11. Sidebar controls
// ---------------------------------------------------------------------------

test.describe('Ticket detail — sidebar controls', () => {
  let ticket: TestTicket

  test.beforeEach(async () => {
    ticket = await createTestTicket({
      subject: `Sidebar test ${Date.now()}`,
    })
  })

  test('should show status as "Open" by default', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    // The Status sidebar select trigger shows the current value
    const statusTrigger = page
      .locator('[data-slot="select-trigger"]')
      .filter({ hasText: /open/i })
    await expect(statusTrigger).toBeVisible()
  })

  test('should update status to "Resolved" and reflect it in the select', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    // Click the Status select trigger (first select on page = Status)
    const statusTrigger = page
      .locator('[data-slot="select-trigger"]')
      .filter({ hasText: /open/i })
    await statusTrigger.click()

    // SelectContent opens as a portal — target option directly from the page
    const resolvedOption = page.getByRole('option', { name: 'Resolved' })
    await expect(resolvedOption).toBeVisible()

    // Wait for the PATCH request to complete after selecting
    const patchPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${ticket.id}`) && res.request().method() === 'PATCH',
    )
    await resolvedOption.click()
    await patchPromise

    // The trigger should now show "Resolved"
    await expect(
      page.locator('[data-slot="select-trigger"]').filter({ hasText: /resolved/i }),
    ).toBeVisible()
  })

  test('should update category to "Technical Issue" and reflect it in the select', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    // Category select trigger — has placeholder "No category" initially
    const categoryTrigger = page
      .locator('[data-slot="select-trigger"]')
      .filter({ hasText: /no category/i })
    await categoryTrigger.click()

    const techIssueOption = page.getByRole('option', { name: 'Technical Issue' })
    await expect(techIssueOption).toBeVisible()

    const patchPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${ticket.id}`) && res.request().method() === 'PATCH',
    )
    await techIssueOption.click()
    await patchPromise

    await expect(
      page.locator('[data-slot="select-trigger"]').filter({ hasText: /technical issue/i }),
    ).toBeVisible()
  })

  test('should reset category back to "No category" and reflect it in the select', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    // First set a category so there is something to reset
    const categoryTrigger = page
      .locator('[data-slot="select-trigger"]')
      .filter({ hasText: /no category/i })
    await categoryTrigger.click()

    await page.getByRole('option', { name: 'General Question' }).click()
    await page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${ticket.id}`) && res.request().method() === 'PATCH',
    )
    await expect(
      page.locator('[data-slot="select-trigger"]').filter({ hasText: /general question/i }),
    ).toBeVisible()

    // Now reset to "No category"
    const generalTrigger = page
      .locator('[data-slot="select-trigger"]')
      .filter({ hasText: /general question/i })
    await generalTrigger.click()

    const noCategoryOption = page.getByRole('option', { name: 'No category' })
    await expect(noCategoryOption).toBeVisible()

    const patchPromise2 = page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${ticket.id}`) && res.request().method() === 'PATCH',
    )
    await noCategoryOption.click()
    await patchPromise2

    await expect(
      page.locator('[data-slot="select-trigger"]').filter({ hasText: /no category/i }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 12–15. Reply feature — button and form toggle
// ---------------------------------------------------------------------------

test.describe('Reply feature — button and form toggle', () => {
  let ticket: TestTicket

  test.beforeEach(async () => {
    ticket = await createTestTicket({
      subject: `Reply toggle test ${Date.now()}`,
    })
  })

  test('should show the "Reply" button below the email body', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Reply' })).toBeVisible()
  })

  test('should reveal the reply form and hide the "Reply" button when clicked', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Reply' }).click()

    // The textarea labelled "Reply" appears
    await expect(page.getByLabel('Reply')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reply' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    // The original "Reply" button is gone (showForm = true replaces it)
    await expect(page.getByRole('button', { name: 'Reply' })).toHaveCount(0)
  })

  test('should hide the reply form and restore the "Reply" button when Cancel is clicked', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Reply' }).click()
    await expect(page.getByLabel('Reply')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByLabel('Reply')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Reply' })).toBeVisible()
  })

  test('should clear textarea content when Cancel is clicked', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Reply' }).click()

    const textarea = page.getByLabel('Reply')
    await textarea.fill('Draft message that should be cleared')

    await page.getByRole('button', { name: 'Cancel' }).click()

    // Reopen the form — textarea must be empty (react-hook-form reset() is called on cancel)
    await page.getByRole('button', { name: 'Reply' }).click()
    await expect(page.getByLabel('Reply')).toHaveValue('')
  })
})

// ---------------------------------------------------------------------------
// 16. Reply feature — validation
// ---------------------------------------------------------------------------

test.describe('Reply feature — validation', () => {
  let ticket: TestTicket

  test.beforeEach(async () => {
    ticket = await createTestTicket({
      subject: `Reply validation test ${Date.now()}`,
    })
  })

  test('should show "Reply is required" when the form is submitted with an empty textarea', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Reply' }).click()
    await expect(page.getByLabel('Reply')).toBeVisible()

    await page.getByRole('button', { name: 'Send reply' }).click()

    await expect(page.getByText('Reply is required')).toBeVisible()

    // Form must remain open after a validation error
    await expect(page.getByLabel('Reply')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 17–20. Reply feature — happy path
// ---------------------------------------------------------------------------

test.describe('Reply feature — happy path', () => {
  let ticket: TestTicket

  test.beforeEach(async () => {
    ticket = await createTestTicket({
      subject: `Reply happy path ${Date.now()}`,
    })
  })

  test('should close the form and restore the "Reply" button after a successful reply', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Reply' }).click()
    await page.getByLabel('Reply').fill('Thanks for reaching out, we will look into this.')

    const postPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/tickets/${ticket.id}/replies`) &&
        res.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Send reply' }).click()
    const postRes = await postPromise
    expect(postRes.status()).toBe(201)

    // Form closes and "Reply" button reappears
    await expect(page.getByLabel('Reply')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Reply' })).toBeVisible()
  })

  test('should display the submitted reply body in the thread', async ({ authenticatedPage: page }) => {
    const replyBody = `Test reply body ${Date.now()}`

    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Reply' }).click()
    await page.getByLabel('Reply').fill(replyBody)

    const postPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/tickets/${ticket.id}/replies`) &&
        res.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Send reply' }).click()
    await postPromise

    // TicketReplies renders reply body in a <p>
    await expect(page.locator('p').filter({ hasText: replyBody })).toBeVisible()
  })

  test('should display the "agent" type label next to the author name in the thread', async ({ authenticatedPage: page }) => {
    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Reply' }).click()
    await page.getByLabel('Reply').fill('Agent reply to verify label.')

    const postPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/tickets/${ticket.id}/replies`) &&
        res.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Send reply' }).click()
    await postPromise

    // TicketReplies renders: <span class="capitalize">{userType.toLowerCase()}</span>
    // For an AGENT reply this becomes "agent"
    await expect(page.getByText('agent', { exact: true })).toBeVisible()
  })

  test('should persist the reply after a full page reload', async ({ authenticatedPage: page }) => {
    const replyBody = `Persistent reply ${Date.now()}`

    await page.goto(`/tickets/${ticket.id}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Reply' }).click()
    await page.getByLabel('Reply').fill(replyBody)

    const postPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/tickets/${ticket.id}/replies`) &&
        res.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Send reply' }).click()
    await postPromise

    // Reload the page — replies are fetched fresh from the DB
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.locator('p').filter({ hasText: replyBody })).toBeVisible()
    await expect(page.getByText('agent', { exact: true })).toBeVisible()
  })
})
