---
name: seed-and-db
description: Seed state and DB constraints for the helpdesk_test database used in E2E tests
metadata:
  type: project
---

The global-setup seed creates exactly **one user**: `admin@example.com` (role ADMIN, password `Password@123`).

No tickets, no agents are seeded. Every E2E test that needs a ticket must create one via the signed Resend webhook at `POST ${API_BASE}/api/webhooks/inbound-email`.

**Why:** The test DB is re-seeded on every full `npm run test:e2e` run (global-setup runs `prisma migrate deploy` + `tsx prisma/seed.ts`). Tests accumulate data across the run but start from a single-user baseline.

**How to apply:**
- The "Assigned to" sidebar select only lists AGENT-role users — since none are seeded, skip assignee-change tests.
- The ticket body (`ticket.body`) will always be `''` in tests because the server fetches body content from `https://api.resend.com/emails/receiving/:email_id` using `RESEND_API_KEY`, and that fetch silently fails in test (no real email id). Do not assert on body content for webhook-created tickets.
- Use `Date.now()` + random suffix in `emailId` / subject to avoid idempotency collisions between tests in the same run.

Related: [[webhook-ticket-creation]], [[auth-credentials]]
