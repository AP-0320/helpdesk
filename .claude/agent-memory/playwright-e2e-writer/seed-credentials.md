---
name: seed-credentials
description: Admin credentials seeded into helpdesk_test by global-setup; values from server/.env ADMIN_EMAIL and ADMIN_PASSWORD
metadata:
  type: reference
---

The global-setup (`e2e/global-setup.ts`) runs `prisma migrate deploy` then `tsx prisma/seed.ts` against `DATABASE_TEST_URL` before every test run.

The seed script (`server/prisma/seed.ts`) reads `process.env.ADMIN_EMAIL` and `ADMIN_PASSWORD` and creates one user if they don't exist yet.

Current values from `server/.env`:
- `ADMIN_EMAIL` = `admin@example.com`
- `ADMIN_PASSWORD` = `Password@123`
- `ADMIN_NAME` = `Admin` (hardcoded in seed)
- `role` = `ADMIN`

The seed is idempotent: if the user already exists it logs "skipping" and exits.

No AGENT-role seeded user exists as of the initial auth tests. Any test requiring a non-admin user must create one inline or the seed must be extended.

These constants are centralised in `e2e/fixtures/auth.fixture.ts` as `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — import from there rather than hardcoding in test files.
