/**
 * E2E tests for the Tickets list page (/tickets).
 *
 * Rendering and data tests live in component tests:
 *   client/src/components/__tests__/TicketsTable.test.tsx
 *   client/src/pages/__tests__/TicketsPage.test.tsx
 *
 * Navigation
 *  1. "Tickets" nav link is visible in the header for an authenticated user
 *  2. Clicking the "Tickets" nav link from /dashboard navigates to /tickets
 */

import { test, expect } from '../fixtures/auth.fixture'

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test.describe('Tickets page — navigation', () => {
  test('should display the "Tickets" nav link in the header', async ({ authenticatedPage: page }) => {
    await page.goto('/tickets')
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tickets' })).toBeVisible()
  })

  test('should navigate to /tickets when the "Tickets" nav link is clicked from /dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'Tickets' }).click()

    await page.waitForURL('/tickets')
    await expect(page.locator('[data-slot="card-title"]')).toHaveText('Tickets')
  })
})
