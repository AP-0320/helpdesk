import { test as base, type Page } from '@playwright/test'

// Credentials sourced from server/.env ADMIN_EMAIL / ADMIN_PASSWORD
// which the global-setup seed script uses when creating the admin user.
export const ADMIN_EMAIL = 'admin@example.com'
export const ADMIN_PASSWORD = 'Password@123'
export const ADMIN_NAME = 'Admin'

/**
 * Performs a full UI login and waits until the dashboard is visible.
 * Use this helper in beforeEach blocks rather than duplicating the steps.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/dashboard')
}

type AuthFixtures = {
  /** A page that is already authenticated as the seeded admin user. */
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsAdmin(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
