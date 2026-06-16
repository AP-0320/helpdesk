# Helpdesk — Project Memory

## Documentation
Always use **context7** to fetch up-to-date documentation before working with any library or framework. Do not rely on training-data knowledge for API signatures, configuration options, or version-specific behaviour.

## Project Structure
- `client/` — React 19 + TypeScript + Tailwind CSS v4 (Vite)
- `server/` — Node.js + Express + TypeScript
- `server/prisma/` — Prisma schema and seed script

## Tech Stack

### Client
- React 19 + TypeScript + Tailwind CSS v4 + Vite
- shadcn/ui — style: `radix-nova`, base: Radix UI, preset: Nova (default theme)
- `react-router-dom` v7
- `react-hook-form` + `zod` + `@hookform/resolvers`
- `better-auth` (client-side auth)
- `axios` — all HTTP requests (always `withCredentials: true` to carry the session cookie)
- `@tanstack/react-query` — all server state / data fetching (wrap in `useQuery`); `QueryClientProvider` is mounted in `main.tsx`
- `lucide-react` icons
- `class-variance-authority`, `clsx`, `tailwind-merge`

### Server
- Node.js + Express + TypeScript
- Prisma ORM
- `express-session` + `connect-pg-simple` (DB-backed sessions)
- `better-auth` (server-side)
- `zod` — request body validation in all routes

## Dev Servers
- Client: `npm run dev` inside `client/` → http://localhost:5173
- Server: `npm run dev` inside `server/` → http://localhost:3000
- Vite proxies `/api/*` requests from the client to the server automatically.

## Database
- ORM: Prisma
- Run migrations: `npm run db:migrate` (inside `server/`)
- Seed admin: `npm run db:seed` (inside `server/`)
- Copy `server/.env.example` to `server/.env` and fill in `DATABASE_URL` before running anything.
- Test DB: `helpdesk_test` — connection string in `DATABASE_TEST_URL` inside `server/.env`
- Test DB migrate: `npm run db:migrate:test` (inside `server/`)
- Test DB seed: `npm run db:seed:test` (inside `server/`)

## Conventions
- All API routes are prefixed with `/api`
- Auth uses database-backed sessions (`express-session` + `connect-pg-simple`)
- Session data shape is typed in `server/src/types/session.d.ts`
- Rate limiting (`better-auth`) is gated on `process.env.NODE_ENV === 'production'` — off in dev and test

## Shared core package

Zod schemas that are used by **both client and server** live in `packages/core/src/schemas/`. Import them via the `@helpdesk/core` package alias — never duplicate a schema across client and server.

### Structure
```
packages/core/
└── src/
    ├── index.ts          ← barrel re-export
    └── schemas/
        └── user.ts       ← createUserSchema, CreateUserData
```

### Adding a new shared schema
1. Create `packages/core/src/schemas/<name>.ts` and export the schema + its inferred type
2. Re-export from `packages/core/src/index.ts`
3. Import in server: `import { mySchema } from '@helpdesk/core'`
4. Import in client: `import { mySchema } from '@helpdesk/core'`

No install step needed — `@helpdesk/core` is already a workspace dependency of both `client` and `server`. TypeScript resolves it via `paths` in each tsconfig; Vite resolves it via its alias in `vite.config.ts`.

## Server-side validation
Use **zod** to validate all incoming request bodies in Express routes. Define a schema at the top of the route file and call `.safeParse(req.body)`. On failure, return `400` with the first issue message:

```ts
import { z } from 'zod'
import { Role } from '@prisma/client'

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
})

// inside handler:
const result = createUserSchema.safeParse(req.body)
if (!result.success) {
  res.status(400).json({ error: result.error.issues[0].message })
  return
}
const { name, email, password } = result.data
```

- `zod` is already listed in `server/package.json` — no install needed.
- Only include fields in the schema that are actually sent by the client. Server-determined values (e.g. `role: Role.AGENT`) are set directly in the handler, not parsed from the request.
- When a Prisma enum value is needed in a handler, use the enum constant (e.g. `Role.AGENT` from `@prisma/client`) — never hardcode string literals. If the field *is* a client input, use `z.enum(Role)` to validate it (`z.nativeEnum` is deprecated in Zod v4).

## Component Testing

### Stack
- **Vitest** — test runner (`npm test` watch, `npm run test:run` single pass, both from `client/`)
- **React Testing Library** — render + query
- **`@testing-library/jest-dom`** — custom matchers (imported in `client/src/test/setup.ts`)
- **`vi.mock('axios')`** — mock HTTP at the module level; do not use MSW for component tests

### Shared render helpers
`client/src/test/utils.tsx` exports three helpers. Import from `@/test/utils`.

**`renderWithQueryClient(ui)`** — wraps any component in a fresh `QueryClient` + provider. Use for any component that calls `useQuery` or `useMutation`. The `QueryClient` is configured with `retry: false`, `refetchOnWindowFocus: false`, and `staleTime: Infinity` to prevent JSDOM focus events from triggering background refetches that would flood RTL's `waitFor`.

```ts
renderWithQueryClient(<MyComponent />)
```

**`renderOpenDialog(Component, extraProps?, onOpenChange?)`** — renders any dialog that follows the `open` / `onOpenChange` prop contract with `open={true}` and a mocked `onOpenChange`. Returns `{ onOpenChange, ...rtlResult }`.

```ts
// Simple dialog (open + onOpenChange only)
const { onOpenChange } = renderOpenDialog(AddUserDialog)

// Dialog with additional required props
const { onOpenChange } = renderOpenDialog(EditUserDialog, { userId: '123' })
```

**`renderOpenDialogWithRerender(Component, extraProps?, onOpenChange?)`** — same as above but also returns `rerender(open: boolean)` for testing open → closed → open transitions (e.g. verifying form reset).

```ts
const { rerender } = renderOpenDialogWithRerender(AddUserDialog)
rerender(false)  // close
rerender(true)   // reopen — assert form is cleared
```

### Test file location
Place tests in a `__tests__/` folder next to the page or component being tested:
```
client/src/pages/__tests__/UsersPage.test.tsx
client/src/components/__tests__/SomeWidget.test.tsx
```

### Mocking axios
```ts
vi.mock('axios')

// resolve
vi.mocked(axios.get).mockResolvedValue({ data: payload })

// reject
vi.mocked(axios.get).mockRejectedValue(new Error('Request failed with status code 500'))

// never resolves (test loading state)
vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))
```

Always call `vi.clearAllMocks()` in `beforeEach` to reset between tests.

### Dialog component tests
Always mock `@/components/ui/dialog` in dialog form tests. Radix UI's `Dialog` uses `FocusScope` which runs `requestAnimationFrame` callbacks in JSDOM, flooding RTL's `MutationObserver` and causing `waitFor`/`findBy` to hang indefinitely. Replace the shell with plain HTML so tests focus on form behaviour; the open/close interaction is covered by the parent-page tests and E2E tests.

```ts
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle:   ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))
```

Use `fireEvent.change` (not `userEvent.type`) to fill form fields — one event per field instead of one per character avoids per-keystroke mutation spam. Use `fireEvent.click` (not `userEvent.click`) for button interactions — synchronous, no inter-event scheduling overhead.

```ts
fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Smith' } })
fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
// then await the async form response:
expect(await screen.findByText('Name is required')).toBeInTheDocument()
```

### What to test
- **Loading state** — `[data-slot="skeleton"]` elements present while request is in-flight
- **Empty state** — message shown when API returns `[]`
- **Error state** — error text rendered; table/list absent
- **Data rendering** — names, emails, badges, formatted dates appear correctly
- **API call** — correct URL and options (`withCredentials: true`) passed to axios

### Running tests
```bash
cd client
npm test          # watch mode
npm run test:run  # single run (CI)
```

## Testing Strategy

**Prefer component tests over E2E tests.** Write a Vitest + RTL component test for anything that can be tested at the component level: rendering states (loading, empty, error, data), API calls, form behaviour, and UI logic. Reserve E2E tests for scenarios that genuinely require a real browser and server stack — navigation flows, authentication, and cross-page interactions that cannot be meaningfully exercised in isolation.

## E2E Testing

Always delegate E2E test writing to the **`playwright-e2e-writer`** agent — do not write Playwright tests inline. Trigger it:
- After completing a UI feature or flow
- When the user asks for E2E test coverage
- When fixing a bug that should be regression-tested via the UI

The agent holds the full Playwright setup context, fixture conventions, and test-writing methodology for this project.

## shadcn/ui

### Setup
- Initialised with `npx shadcn init --base radix --preset nova`
- Add new components: `npx shadcn add <component>` from inside `client/`
- Components live in `client/src/components/ui/`
- Config: `client/components.json`

### CSS Variables
Defined in `client/src/index.css` using oklch values. Key tokens: `--background`, `--foreground`, `--card`, `--primary`, `--ring`, `--destructive`. Dark mode via `.dark` class.

### Components added
- `button`, `card`, `input`, `label`, `table`, `badge`, `skeleton`

### Autofill fix
`index.css` overrides `input:-webkit-autofill` with an inset `box-shadow` using `var(--card)` to suppress Chrome's yellow background. A separate `focus-visible` rule combines the cover shadow with the focus ring so focus styles still work on autofilled inputs.

## Forms pattern
All forms use `react-hook-form` + `zodResolver` + shadcn components:
- `Input` with `aria-invalid={!!errors.field}` (triggers error styling via CSS)
- `Label` paired to each input
- Field errors: `<p className="text-xs text-destructive">`
- Root/API errors: `<p className="text-sm text-destructive">`
- Auth calls via `better-auth` client (`authClient.signIn.email(...)` etc.)
