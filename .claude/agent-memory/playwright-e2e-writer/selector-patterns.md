---
name: selector-patterns
description: Confirmed working Playwright selectors for the helpdesk app's login form, nav, dashboard, and error messages
metadata:
  type: project
---

## Login page

| Element | Selector |
|---------|----------|
| Page heading | `page.getByRole('heading', { name: 'Sign in' })` |
| Email input | `page.getByLabel('Email')` — Label `htmlFor="email"` pairs with `id="email"` input |
| Password input | `page.getByLabel('Password')` — Label `htmlFor="password"` pairs with `id="password"` input |
| Submit button | `page.getByRole('button', { name: 'Sign in' })` (disabled state: `'Signing in…'`) |

## Form validation errors (field-level, `text-xs text-destructive`)

| Message | Selector |
|---------|----------|
| Empty email | `page.getByText('Email is required')` |
| Invalid email format | `page.getByText('Enter a valid email')` |
| Empty password | `page.getByText('Password is required')` |

## Auth/API errors (root-level, `text-sm text-destructive`)

| Scenario | Text |
|----------|------|
| Wrong password or unknown email | `/invalid email or password/i` |

## Layout (post-login nav)

| Element | Selector |
|---------|----------|
| Dashboard nav link | `page.getByRole('link', { name: 'Dashboard' })` |
| Users nav link (ADMIN only) | `page.getByRole('link', { name: 'Users' })` |
| Sign out button | `page.getByRole('button', { name: 'Sign out' })` |

## Dashboard content

| Element | Selector |
|---------|----------|
| User name | `page.getByText(ADMIN_NAME)` — renders `{user?.name}` in an `<h2>` |
| User email | `page.getByText(ADMIN_EMAIL)` — renders `{user?.email}` in a `<p>` |
| Role badge | `page.getByText('ADMIN')` — renders in a `<span>` badge |
| Users page heading | `page.getByRole('heading', { name: 'Users' })` |

## Users page (/users)

| Element | Selector |
|---------|----------|
| Page heading | `getByRole('heading', { name: 'Users' })` |
| Table column headers | `getByRole('columnheader', { name: '...' })` |
| Add User button | `getByRole('button', { name: 'Add User' })` |
| Dialog title (add) | `getByRole('heading', { name: 'Add new user' })` |
| Dialog title (edit) | `getByRole('heading', { name: 'Edit user' })` |
| Edit button (per row) | `getByRole('button', { name: 'Edit <userName>' })` |
| Delete button (per row) | `getByRole('button', { name: 'Delete <userName>' })` |
| Name field in dialog | `getByLabel('Name')` |
| Email field in dialog | `getByLabel('Email')` |
| Password field (add mode) | `getByLabel('Password')` |
| Password field (edit mode) | `getByPlaceholder('Leave blank to keep current')` |
| Create button | `getByRole('button', { name: 'Create user' })` |
| Save button | `getByRole('button', { name: 'Save changes' })` |
| AlertDialog container | `getByRole('alertdialog')` |
| Delete confirm button | `getByRole('alertdialog').getByRole('button', { name: 'Delete' })` |

## Role badge rendering
`UsersTable` renders role badges as: first char uppercase + rest lowercase.
`ADMIN` → `Admin`, `AGENT` → `Agent`. Use `getByText('Agent')` / `getByText('Admin')`.

## aria-label pattern on icon buttons
`UsersTable` sets `aria-label={\`Edit ${user.name}\`}` and `aria-label={\`Delete ${user.name}\`}`
on the Pencil/Trash2 icon buttons — so `getByRole('button', { name: 'Edit Alice' })` works
with no `data-testid` needed.

## Tickets page (/tickets)

| Element | Selector |
|---------|----------|
| Card title | `page.locator('[data-slot="card-title"]')` → text `"Tickets"` |
| Card description | `page.locator('[data-slot="card-description"]')` |
| Table column headers | `getByRole('columnheader', { name: '...' })` — Subject, From, Status, Category, Received |
| Tickets nav link | `page.getByRole('link', { name: 'Tickets' })` (visible to all authenticated users) |
| Status badge | `row.locator('[data-slot="badge"]', { hasText: 'Open' })` — text is `status.charAt(0) + status.slice(1).toLowerCase()` |
| Category dash (null) | `row.getByText('—')` — renders `<span class="text-xs text-muted-foreground">—</span>` |
| fromName (From cell) | `page.locator('span.font-medium', { hasText: '...' })` |
| fromEmail (From cell) | `page.locator('span.text-muted-foreground', { hasText: '...' })` |
| Specific row by subject | `page.getByRole('row', { name: new RegExp(subject) })` — scopes badge/date assertions to one row |
| Error state | `page.locator('p.text-destructive')` — rendered outside the table |

## Tickets page — seeding notes

- Webhook-created tickets always start with `status: OPEN` and `category: null`.
- The "From" field `"Jane Customer <jane@example.com>"` parses to `fromName: "Jane Customer"`, `fromEmail: "jane@example.com"`.
- The table renders `page.waitForLoadState('networkidle')` after `page.goto('/tickets')` is sufficient to wait for data.
- Empty-state ("No tickets yet.") cannot be reliably tested in the shared DB because tickets accumulate across runs — omit this scenario.

## Notes

- shadcn `Label` uses `htmlFor` → `id` association so `getByLabel` works reliably.
- No `data-testid` attributes were needed for the auth flow, user management, or tickets page — semantic selectors cover all cases.
- The "Sign out" element is a `<button>`, not an `<a>`, so `getByRole('button')` is correct (not `getByRole('link')`).
- The delete confirmation uses `AlertDialog` (Radix), which gets `role="alertdialog"` automatically.
