---
name: seed-data
description: Seeded test DB users and credentials available in helpdesk_test for E2E tests
metadata:
  type: project
---

Global setup (`e2e/global-setup.ts`) runs migrations + seed once before all tests.

**Seeded admin:**
- email: `admin@example.com`
- password: `Password@123`
- name: `Admin`
- role: `ADMIN`

No other users are seeded. Agent users needed for edit/delete tests must be created within
the test itself via the UI (or API).

**Why this matters:** Tests that need a non-admin user must create one first. Use a unique
email per test (e.g. `test-${label}-${Date.now()}@example.com`) to avoid collisions across
sequential runs within a session. Tests run sequentially (`workers: 1`, `fullyParallel: false`)
and share the same DB — created rows persist for the rest of the session unless explicitly
deleted.

**How to apply:** Always use a `uniqueEmail()` helper (timestamp-based) for any user created
during a test. For tests requiring a fresh agent, create one via `createAgentViaUI()` at the
top of the test rather than assuming one exists from a prior test.
