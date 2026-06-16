---
name: shadcn-select-interaction
description: Pattern for interacting with shadcn/radix Select components in Playwright tests
metadata:
  type: project
---

shadcn `Select` wraps Radix UI's `SelectPrimitive`. The trigger renders with `data-slot="select-trigger"`. The dropdown content opens in a portal outside the DOM tree.

## How to click a specific Select trigger when multiple exist

Use `.filter({ hasText: /current value/i })` to disambiguate:

```typescript
const statusTrigger = page
  .locator('[data-slot="select-trigger"]')
  .filter({ hasText: /open/i })
await statusTrigger.click()
```

## How to select an option from the portal

After clicking the trigger, the `SelectContent` portal is appended to `<body>`. Target options with:

```typescript
const option = page.getByRole('option', { name: 'Resolved' })
await expect(option).toBeVisible()
await option.click()
```

Do NOT chain the locator through the trigger — portal content is not a child of the trigger in the DOM.

## Waiting for the resulting API call

Wrap in `waitForResponse` before clicking the option:

```typescript
const patchPromise = page.waitForResponse(
  (res) => res.url().includes(`/api/tickets/${id}`) && res.request().method() === 'PATCH',
)
await option.click()
await patchPromise
```

## Category "No category" placeholder

The category Select uses `value="none"` internally and renders a `SelectItem value="none"` with text "No category". When category is null the trigger shows the placeholder text "No category". After setting a category, filtering by the category label text identifies the trigger.
