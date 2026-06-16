/**
 * E2E tests for the authentication system.
 *
 * Covered scenarios:
 *  1. Login happy path — valid admin credentials navigate to /dashboard
 *  2. Login shows "Signing in…" while submitting
 *  3. Validation: empty form submission shows field-level errors
 *  4. Validation: invalid email format shows email error
 *  5. Validation: password field left blank shows its own error
 *  6. Auth error: wrong password shows root-level API error
 *  7. Auth error: unregistered email shows root-level API error
 *  8. Protected route redirect — unauthenticated users are sent to /login
 *  9. Catch-all redirect — the root path redirects unauthenticated users to /login
 * 10. Dashboard content — authenticated user sees their name and role badge
 * 11. Session persistence — page reload keeps the user authenticated
 * 12. Logout — "Sign out" button ends the session and redirects to /login
 * 13. Post-logout protection — accessing /dashboard after logout redirects to /login
 * 14. No sign-up flow — registration is disabled; the login page has no sign-up link
 */

import { test, expect } from '@playwright/test'
import {
  test as authTest,
  loginAsAdmin,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
} from '../fixtures/auth.fixture'

// ---------------------------------------------------------------------------
// Helper — fast navigation to the login page before each test
// ---------------------------------------------------------------------------

test.describe('Login page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should render the login card with email and password fields', async ({ page }) => {
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('should not have a sign-up or registration link (sign-up is disabled)', async ({ page }) => {
    // better-auth is configured with disableSignUp: true — no registration UI should exist
    await expect(page.getByRole('link', { name: /sign.?up|register|create account/i })).toHaveCount(0)
    await expect(page.getByText(/sign.?up|register|create account/i)).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Validation errors (client-side, zod)
// ---------------------------------------------------------------------------

test.describe('Login form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should show required errors when form is submitted empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('should show email format error for invalid email', async ({ page }) => {
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Password').fill('somepassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Enter a valid email')).toBeVisible()
    // Password field should not also error
    await expect(page.getByText('Password is required')).toHaveCount(0)
  })

  test('should show password required error when only email is filled', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Password is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toHaveCount(0)
  })

  test('should show email required error when only password is filled', async ({ page }) => {
    await page.getByLabel('Password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toHaveCount(0)
  })

  test('should clear validation errors once the user corrects them', async ({ page }) => {
    // Trigger both errors first
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Email is required')).toBeVisible()

    // Fix the email field — react-hook-form validates on change after first submit
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await expect(page.getByText('Email is required')).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Auth errors (server-side, wrong credentials / unknown account)
// ---------------------------------------------------------------------------

test.describe('Login auth errors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should show an error message when the password is wrong', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill('WrongPassword999!')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // The root-level error from better-auth is rendered as a <p class="text-sm text-destructive">
    // The button should become clickable again after failure
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled({ timeout: 10_000 })
    // better-auth returns "Invalid email or password" for credential mismatches
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    // Must remain on the login page
    await expect(page).toHaveURL('/login')
  })

  test('should show an error message for an unregistered email', async ({ page }) => {
    await page.getByLabel('Email').fill('nobody@nowhere.example.com')
    await page.getByLabel('Password').fill('SomePassword1!')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled({ timeout: 10_000 })
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('should show loading state on the button while the request is in flight', async ({ page }) => {
    // Hold the sign-in request so we can observe the transient disabled state
    let resolveRoute!: () => void
    await page.route('**/api/auth/sign-in/email', async (route) => {
      await new Promise<void>((resolve) => { resolveRoute = resolve })
      await route.continue()
    })

    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(ADMIN_PASSWORD)

    const submitButton = page.getByRole('button', { name: 'Sign in' })
    // Do not await — the route handler keeps the request pending
    void submitButton.click()

    // Wait for React to re-render with isSubmitting:true — button text changes to "Signing in…"
    const loadingButton = page.getByRole('button', { name: 'Signing in…' })
    await expect(loadingButton).toBeVisible()
    await expect(loadingButton).toBeDisabled()

    // Release the request and let login complete
    resolveRoute()
    await page.waitForURL('/dashboard')
  })
})

// ---------------------------------------------------------------------------
// Happy path login
// ---------------------------------------------------------------------------

test.describe('Login happy path', () => {
  test('should navigate to /dashboard after successful login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display the user name and ADMIN role badge on the dashboard', async ({ page }) => {
    await loginAsAdmin(page)

    await expect(page.getByRole('heading', { name: ADMIN_NAME })).toBeVisible()
    await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible()
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible()
  })

  test('should show the navigation header with Dashboard and Users links for admin', async ({ page }) => {
    await loginAsAdmin(page)

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    // Admin-only nav link
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test('should not redirect to /login when /login is visited while already authenticated', async ({ page }) => {
    // After login, visiting /login should not crash — the app has no explicit redirect
    // for already-authenticated users visiting /login, but the session will still be live
    await loginAsAdmin(page)
    await page.goto('/login')
    // The login page renders fine — no forced redirect away is implemented
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Protected route guards (unauthenticated access)
// ---------------------------------------------------------------------------

test.describe('Protected route redirects', () => {
  test('should redirect /dashboard to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
  })

  test('should redirect /users to /login when not authenticated', async ({ page }) => {
    await page.goto('/users')
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
  })

  test('should redirect the root path to /login when not authenticated', async ({ page }) => {
    // App.tsx: <Route path="*" element={<Navigate to="/dashboard" replace />} />
    // /dashboard then redirects to /login because ProtectedRoute gates it
    await page.goto('/')
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })

  test('should redirect an unknown path to /login when not authenticated', async ({ page }) => {
    await page.goto('/some/unknown/path')
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })
})

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

test.describe('Session persistence', () => {
  test('should keep the user authenticated after a full page reload', async ({ page }) => {
    await loginAsAdmin(page)
    // Wait for the page to fully render before reloading
    await expect(page.getByRole('heading', { name: ADMIN_NAME })).toBeVisible()

    await page.reload()

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: ADMIN_NAME })).toBeVisible()
  })

  test('should keep the user authenticated after navigating away and back', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to a different route within the app
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL('/users')

    // Navigate back to dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: ADMIN_NAME })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Logout flow
// ---------------------------------------------------------------------------

test.describe('Logout', () => {
  test('should sign out and redirect to /login when "Sign out" is clicked', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Sign out' }).click()

    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
  })

  test('should prevent access to /dashboard after logging out', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL('/login')

    // Attempt to navigate to the protected route after logout
    await page.goto('/dashboard')
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })

  test('should prevent access to /users after logging out', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL('/login')

    await page.goto('/users')
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })
})

// ---------------------------------------------------------------------------
// Admin-specific route guard (AdminRoute component)
// ---------------------------------------------------------------------------

test.describe('AdminRoute guard', () => {
  // The seeded admin has role ADMIN so these tests confirm admin access works.
  // A non-admin (AGENT) access scenario requires a seeded AGENT user — if one
  // is added to the seed in the future, a test verifying /users → /dashboard
  // redirect for AGENT role should be added here.

  test('should allow an ADMIN user to access /users', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/users')
    await expect(page).toHaveURL('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Authenticated fixture smoke test
// ---------------------------------------------------------------------------

authTest.describe('authenticatedPage fixture', () => {
  authTest('should start tests already on /dashboard', async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toHaveURL('/dashboard')
    await expect(authenticatedPage.getByRole('heading', { name: ADMIN_NAME })).toBeVisible()
  })
})
