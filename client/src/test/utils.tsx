import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { ComponentType, ReactElement } from 'react'

export function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Prevent JSDOM window-focus events from triggering refetches during
        // waitFor/findBy polling — those DOM mutations cause waitFor to loop.
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      },
    },
  })
  // Using the wrapper option lets RTL's built-in rerender() automatically
  // re-wrap in the same QueryClientProvider, so callers never need to
  // manage the provider themselves.
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
  return render(ui, { wrapper: Wrapper })
}

/**
 * Renders a dialog component with open=true and a mocked onOpenChange.
 * Use for any component that follows the open / onOpenChange prop contract.
 *
 * For dialogs with extra required props pass them as the second argument:
 *   renderOpenDialog(EditUserDialog, { userId: '123' })
 */
export function renderOpenDialog<ExtraProps = Record<string, never>>(
  Component: ComponentType<
    { open: boolean; onOpenChange: (open: boolean) => void } & ExtraProps
  >,
  extraProps?: ExtraProps,
  onOpenChange = vi.fn()
) {
  return {
    onOpenChange,
    ...renderWithQueryClient(
      <Component
        open={true}
        onOpenChange={onOpenChange}
        {...(extraProps as object)}
      />
    ),
  }
}

/**
 * Same as renderOpenDialog but also returns a typed rerender(open) helper for
 * testing open → closed → open transitions (e.g. form-reset behaviour).
 */
export function renderOpenDialogWithRerender<ExtraProps = Record<string, never>>(
  Component: ComponentType<
    { open: boolean; onOpenChange: (open: boolean) => void } & ExtraProps
  >,
  extraProps?: ExtraProps,
  onOpenChange = vi.fn()
) {
  const result = renderWithQueryClient(
    <Component
      open={true}
      onOpenChange={onOpenChange}
      {...(extraProps as object)}
    />
  )
  return {
    onOpenChange,
    rerender: (open: boolean) =>
      result.rerender(
        <Component
          open={open}
          onOpenChange={onOpenChange}
          {...(extraProps as object)}
        />
      ),
  }
}
