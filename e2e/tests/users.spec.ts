/**
 * E2E tests for the User Management feature (/users page).
 *
 * Covered scenarios:
 *
 * Page & table
 *  1.  Renders the "Users" heading and description
 *  2.  Table shows correct column headers
 *  3.  Seeded admin row is visible with correct name, email, and role badge
 *  4.  Admin row has an Edit button but no Delete button
 *  5.  "Add User" button is visible
 *
 * Add user (POST /api/users)
 *  6.  Clicking "Add User" opens the "Add new user" dialog
 *  7.  Submitting empty form shows all three validation errors
 *  8.  Invalid email shows "Enter a valid email"
 *  9.  Short password shows "Password must be at least 8 characters"
 * 10.  Successful creation — dialog closes and new row appears in the table
 * 11.  Duplicate email — dialog stays open and shows 409 conflict message
 * 12.  Cancel closes the dialog without creating a user
 *
 * Edit user (PATCH /api/users/:id)
 * 13.  Edit button opens the "Edit user" dialog pre-filled with existing values
 * 14.  Password field is empty with placeholder "Leave blank to keep current"
 * 15.  Updating name saves and the new name appears in the table
 * 16.  Submitting with a blank name shows "Name is required"
 * 17.  Cancel closes the edit dialog without saving changes
 *
 * Delete user (DELETE /api/users/:id)
 * 18.  Delete button on an agent row opens the confirmation alert dialog
 * 19.  Confirmation dialog shows the user's name in the description
 * 20.  Cancel closes the confirmation dialog and user remains in the table
 * 21.  Confirming delete removes the user row from the table
 * 22.  Admin row has no Delete button (already covered by test 4, reinforced here)
 */

import { test, expect } from '../fixtures/auth.fixture'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a unique email suffix so parallel test runs and retries don't collide. */
function uniqueEmail(label: string): string {
  return `test-${label}-${Date.now()}@example.com`
}

/**
 * Creates an agent user via the UI and returns the name and email used.
 * Leaves the dialog closed and the table visible on success.
 */
async function createAgentViaUI(
  page: import('@playwright/test').Page,
  name: string,
  email: string,
  password = 'Password@123',
): Promise<void> {
  await page.getByRole('button', { name: 'Add User' }).click()
  await expect(page.getByRole('heading', { name: 'Add new user' })).toBeVisible()

  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create user' }).click()

  // Dialog closes on success — wait for the heading to disappear
  await expect(page.getByRole('heading', { name: 'Add new user' })).not.toBeVisible()
  // New row must appear before the helper returns
  await expect(page.getByText(name)).toBeVisible()
}

// ---------------------------------------------------------------------------
// Page & table
// ---------------------------------------------------------------------------

test.describe('Users page — table layout', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/users')
  })

  test('should render the Users heading and description', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await expect(page.getByText('All registered users in the system')).toBeVisible()
  })

  test('should show all required column headers', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Joined' })).toBeVisible()
  })

  test('should display the seeded admin row with correct name, email, and role badge', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Admin')).toBeVisible()
    await expect(page.getByText('admin@example.com')).toBeVisible()
    // Role badge renders "Admin" (first char uppercase, rest lowercase)
    await expect(page.getByText('Admin', { exact: true }).first()).toBeVisible()
  })

  test('should have an Edit button but no Delete button for the admin row', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('button', { name: 'Edit Admin' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete Admin' })).toHaveCount(0)
  })

  test('should show the "Add User" button', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Add user dialog
// ---------------------------------------------------------------------------

test.describe('Add user dialog', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/users')
  })

  test('should open the "Add new user" dialog when "Add User" is clicked', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'Add User' }).click()

    await expect(page.getByRole('heading', { name: 'Add new user' })).toBeVisible()
    await expect(page.getByText('Create a new agent account.')).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('should show all three validation errors when the form is submitted empty', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'Add User' }).click()
    await expect(page.getByRole('heading', { name: 'Add new user' })).toBeVisible()

    await page.getByRole('button', { name: 'Create user' }).click()

    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
  })

  test('should show "Enter a valid email" for a malformed email address', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'Add User' }).click()

    await page.getByLabel('Name').fill('Test User')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Password').fill('Password@123')
    await page.getByRole('button', { name: 'Create user' }).click()

    await expect(page.getByText('Enter a valid email')).toBeVisible()
    // Dialog must remain open
    await expect(page.getByRole('heading', { name: 'Add new user' })).toBeVisible()
  })

  test('should show password length error for a password shorter than 8 characters', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'Add User' }).click()

    await page.getByLabel('Name').fill('Test User')
    await page.getByLabel('Email').fill(uniqueEmail('short-pw'))
    await page.getByLabel('Password').fill('abc')
    await page.getByRole('button', { name: 'Create user' }).click()

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Add new user' })).toBeVisible()
  })

  test('should close the dialog and show the new row in the table on successful creation', async ({ authenticatedPage: page }) => {
    const name = 'Alice Tester'
    const email = uniqueEmail('create-success')

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('Password@123')
    await page.getByRole('button', { name: 'Create user' }).click()

    // Dialog must close
    await expect(page.getByRole('heading', { name: 'Add new user' })).not.toBeVisible()

    // New row must appear in the table
    await expect(page.getByText(name)).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByRole('button', { name: `Edit ${name}` })).toBeVisible()
  })

  test('should show a duplicate-email error and keep the dialog open on 409', async ({ authenticatedPage: page }) => {
    // admin@example.com is already seeded — use it to trigger a conflict
    await page.getByRole('button', { name: 'Add User' }).click()

    await page.getByLabel('Name').fill('Duplicate Admin')
    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel('Password').fill('Password@123')
    await page.getByRole('button', { name: 'Create user' }).click()

    // Wait for the API error to appear (root-level error paragraph)
    await expect(page.getByText('A user with that email already exists')).toBeVisible()
    // Dialog must remain open
    await expect(page.getByRole('heading', { name: 'Add new user' })).toBeVisible()
  })

  test('should close the dialog without creating a user when Cancel is clicked', async ({ authenticatedPage: page }) => {
    const email = uniqueEmail('cancel-add')

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.getByLabel('Name').fill('Should Not Exist')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('Password@123')

    await page.getByRole('button', { name: 'Cancel' }).click()

    // Dialog must close
    await expect(page.getByRole('heading', { name: 'Add new user' })).not.toBeVisible()
    // The partially-filled user must NOT appear in the table
    await expect(page.getByText(email)).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Edit user dialog
// ---------------------------------------------------------------------------

test.describe('Edit user dialog', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/users')
  })

  test('should open the "Edit user" dialog pre-filled with the user name and email', async ({ authenticatedPage: page }) => {
    // Create a fresh agent to edit so we have a predictable row
    const name = 'Edit Prefill Agent'
    const email = uniqueEmail('edit-prefill')
    await createAgentViaUI(page, name, email)

    await page.getByRole('button', { name: `Edit ${name}` }).click()

    await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveValue(name)
    await expect(page.getByLabel('Email')).toHaveValue(email)
  })

  test('should have an empty password field with the "Leave blank" placeholder in edit mode', async ({ authenticatedPage: page }) => {
    const name = 'Edit PW Placeholder'
    const email = uniqueEmail('edit-pw-placeholder')
    await createAgentViaUI(page, name, email)

    await page.getByRole('button', { name: `Edit ${name}` }).click()

    const passwordInput = page.getByPlaceholder('Leave blank to keep current')
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveValue('')
  })

  test('should update the name and reflect it in the table', async ({ authenticatedPage: page }) => {
    const originalName = 'Before Rename Agent'
    const updatedName = 'After Rename Agent'
    const email = uniqueEmail('edit-rename')
    await createAgentViaUI(page, originalName, email)

    await page.getByRole('button', { name: `Edit ${originalName}` }).click()
    await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible()

    await page.getByLabel('Name').clear()
    await page.getByLabel('Name').fill(updatedName)
    await page.getByRole('button', { name: 'Save changes' }).click()

    // Dialog closes on success
    await expect(page.getByRole('heading', { name: 'Edit user' })).not.toBeVisible()

    // Updated name must appear; original must be gone from the table
    await expect(page.getByText(updatedName)).toBeVisible()
    await expect(page.getByText(originalName)).toHaveCount(0)
  })

  test('should show "Name is required" when the name field is cleared and submitted', async ({ authenticatedPage: page }) => {
    const name = 'Blank Name Agent'
    const email = uniqueEmail('edit-blank-name')
    await createAgentViaUI(page, name, email)

    await page.getByRole('button', { name: `Edit ${name}` }).click()
    await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible()

    await page.getByLabel('Name').clear()
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByText('Name is required')).toBeVisible()
    // Dialog must stay open
    await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible()
  })

  test('should close the edit dialog without saving when Cancel is clicked', async ({ authenticatedPage: page }) => {
    const name = 'Cancel Edit Agent'
    const email = uniqueEmail('edit-cancel')
    await createAgentViaUI(page, name, email)

    await page.getByRole('button', { name: `Edit ${name}` }).click()
    await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible()

    // Mutate the name field then cancel — original name must persist in the table
    await page.getByLabel('Name').clear()
    await page.getByLabel('Name').fill('Should Not Save')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('heading', { name: 'Edit user' })).not.toBeVisible()
    // Original name must still be in the table
    await expect(page.getByText(name)).toBeVisible()
    await expect(page.getByText('Should Not Save')).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Delete user dialog
// ---------------------------------------------------------------------------

test.describe('Delete user dialog', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/users')
  })

  test('should open the delete confirmation dialog when the Delete button is clicked', async ({ authenticatedPage: page }) => {
    const name = 'Delete Dialog Agent'
    const email = uniqueEmail('delete-open')
    await createAgentViaUI(page, name, email)

    await page.getByRole('button', { name: `Delete ${name}` }).click()

    await expect(page.getByRole('alertdialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Delete user' })).toBeVisible()
  })

  test('should show the user name in the confirmation dialog description', async ({ authenticatedPage: page }) => {
    const name = 'Named In Dialog Agent'
    const email = uniqueEmail('delete-desc')
    await createAgentViaUI(page, name, email)

    await page.getByRole('button', { name: `Delete ${name}` }).click()

    // The description contains the user's name bolded inside the paragraph
    const dialog = page.getByRole('alertdialog')
    await expect(dialog.getByText(name)).toBeVisible()
  })

  test('should close the confirmation dialog and keep the user when Cancel is clicked', async ({ authenticatedPage: page }) => {
    const name = 'Cancel Delete Agent'
    const email = uniqueEmail('delete-cancel')
    await createAgentViaUI(page, name, email)

    await page.getByRole('button', { name: `Delete ${name}` }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()

    // Alert dialog must close
    await expect(page.getByRole('alertdialog')).not.toBeVisible()
    // User must still be in the table
    await expect(page.getByText(name)).toBeVisible()
    await expect(page.getByRole('button', { name: `Delete ${name}` })).toBeVisible()
  })

  test('should remove the user from the table after confirming deletion', async ({ authenticatedPage: page }) => {
    const name = 'Confirm Delete Agent'
    const email = uniqueEmail('delete-confirm')
    await createAgentViaUI(page, name, email)

    await page.getByRole('button', { name: `Delete ${name}` }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()

    // Click the destructive "Delete" action button inside the alert dialog
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()

    // Alert dialog closes and row is gone
    await expect(page.getByRole('alertdialog')).not.toBeVisible()
    await expect(page.getByText(name)).toHaveCount(0)
    await expect(page.getByRole('button', { name: `Delete ${name}` })).toHaveCount(0)
  })

  test('should not show a Delete button for the admin user', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('button', { name: 'Delete Admin' })).toHaveCount(0)
  })
})
