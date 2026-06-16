import { screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { renderWithQueryClient } from '@/test/utils'
import TicketsTable from '../TicketsTable'

vi.mock('axios')

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select data-testid="category-filter" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

const mockTickets = [
  {
    id: '1',
    subject: 'Help with my order',
    fromName: 'Jane Customer',
    fromEmail: 'jane@example.com',
    status: 'OPEN' as const,
    category: null,
    createdAt: '2026-06-14T10:00:00.000Z',
  },
  {
    id: '2',
    subject: 'Technical issue report',
    fromName: 'Bob Smith',
    fromEmail: 'bob@example.com',
    status: 'RESOLVED' as const,
    category: 'TECHNICAL_ISSUE' as const,
    createdAt: '2026-05-20T08:00:00.000Z',
  },
]

function pageResponse(tickets = mockTickets, overrides: Record<string, unknown> = {}) {
  const total = (overrides.total as number) ?? tickets.length
  return {
    data: {
      tickets,
      total,
      page: 1,
      pageSize: 10,
      pageCount: Math.ceil(total / 10),
      ...overrides,
    },
  }
}

const defaultParams = { sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 10 }

function renderTable() {
  return renderWithQueryClient(<TicketsTable />)
}

describe('TicketsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton placeholders while the request is in-flight', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderTable()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows all required column headers', async () => {
    vi.mocked(axios.get).mockResolvedValue(pageResponse([]))
    renderTable()
    await screen.findByText('No tickets yet.')
    expect(screen.getByRole('columnheader', { name: /Subject/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /From/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Status/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Category/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Received/ })).toBeInTheDocument()
  })

  it('shows "No tickets yet." when the API returns an empty list', async () => {
    vi.mocked(axios.get).mockResolvedValue(pageResponse([]))
    renderTable()
    expect(await screen.findByText('No tickets yet.')).toBeInTheDocument()
  })

  it('shows the error message when the request fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Request failed with status code 500'))
    renderTable()
    expect(await screen.findByText('Request failed with status code 500')).toBeInTheDocument()
  })

  it('hides the table when there is an error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Server error'))
    renderTable()
    await screen.findByText('Server error')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  describe('with tickets loaded', () => {
    beforeEach(() => {
      vi.mocked(axios.get).mockResolvedValue(pageResponse())
    })

    it('renders a row for each ticket with its subject', async () => {
      renderTable()
      expect(await screen.findByText('Help with my order')).toBeInTheDocument()
      expect(screen.getByText('Technical issue report')).toBeInTheDocument()
    })

    it('shows fromName and fromEmail in the From cell', async () => {
      renderTable()
      await screen.findByText('Jane Customer')
      expect(screen.getByText('Jane Customer')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })

    it('renders "Open" status badge for an OPEN ticket', async () => {
      renderTable()
      expect(await screen.findByText('Open')).toBeInTheDocument()
    })

    it('renders "Resolved" status badge for a RESOLVED ticket', async () => {
      renderTable()
      expect(await screen.findByText('Resolved')).toBeInTheDocument()
    })

    it('shows "—" in the Category cell when category is null', async () => {
      renderTable()
      await screen.findByText('Help with my order')
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('shows a category badge label when category is set', async () => {
      renderTable()
      expect(await screen.findByText('Technical Issue')).toBeInTheDocument()
    })

    it('formats the createdAt date as a localised short date', async () => {
      renderTable()
      await screen.findByText('Help with my order')
      const expectedDate = new Date('2026-06-14T10:00:00.000Z').toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      expect(screen.getByText(expectedDate)).toBeInTheDocument()
    })

    it('calls the API with default sort and page params', async () => {
      renderTable()
      await screen.findByText('Help with my order')
      expect(vi.mocked(axios.get)).toHaveBeenCalledWith('/api/tickets', {
        params: defaultParams,
        withCredentials: true,
      })
    })

    it('marks a column header as ascending after the first click', async () => {
      renderTable()
      await screen.findByText('Help with my order')

      const subjectHeader = screen.getByRole('columnheader', { name: /Subject/ })
      expect(subjectHeader).toHaveAttribute('aria-sort', 'none')

      fireEvent.click(subjectHeader.querySelector('button')!)

      expect(screen.getByRole('columnheader', { name: /Subject/ }))
        .toHaveAttribute('aria-sort', 'ascending')
    })

    it('marks a column header as descending after the second click', async () => {
      renderTable()
      await screen.findByText('Help with my order')

      fireEvent.click(
        screen.getByRole('columnheader', { name: /Subject/ }).querySelector('button')!
      )
      await waitFor(() =>
        expect(screen.getByRole('columnheader', { name: /Subject/ }))
          .toHaveAttribute('aria-sort', 'ascending')
      )
      await screen.findByText('Help with my order')

      fireEvent.click(
        screen.getByRole('columnheader', { name: /Subject/ }).querySelector('button')!
      )
      await waitFor(() =>
        expect(screen.getByRole('columnheader', { name: /Subject/ }))
          .toHaveAttribute('aria-sort', 'descending')
      )
    })

    describe('filtering', () => {
      it('renders All / Open / Resolved / Closed status filter buttons', async () => {
        renderTable()
        await screen.findByText('Help with my order')
        expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Resolved' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Closed' })).toBeInTheDocument()
      })

      it('calls the API with status param when a status filter button is clicked', async () => {
        renderTable()
        await screen.findByText('Help with my order')

        fireEvent.click(screen.getByRole('button', { name: 'Open' }))

        await waitFor(() =>
          expect(vi.mocked(axios.get)).toHaveBeenLastCalledWith('/api/tickets', {
            params: { ...defaultParams, status: 'OPEN' },
            withCredentials: true,
          })
        )
      })

      it('calls the API without status param when no filter is active', async () => {
        renderTable()
        await screen.findByText('Help with my order')
        expect(vi.mocked(axios.get)).toHaveBeenCalledWith('/api/tickets', {
          params: defaultParams,
          withCredentials: true,
        })
      })

      it('calls the API with category param when a category is selected', async () => {
        renderTable()
        await screen.findByText('Help with my order')

        fireEvent.change(screen.getByTestId('category-filter'), {
          target: { value: 'TECHNICAL_ISSUE' },
        })

        await waitFor(() =>
          expect(vi.mocked(axios.get)).toHaveBeenLastCalledWith('/api/tickets', {
            params: { ...defaultParams, category: 'TECHNICAL_ISSUE' },
            withCredentials: true,
          })
        )
      })

      it('calls the API with search param after the debounce delay', async () => {
        renderTable()
        await screen.findByText('Help with my order')

        fireEvent.change(screen.getByPlaceholderText('Search tickets…'), {
          target: { value: 'help' },
        })

        await waitFor(
          () =>
            expect(vi.mocked(axios.get)).toHaveBeenLastCalledWith('/api/tickets', {
              params: { ...defaultParams, search: 'help' },
              withCredentials: true,
            }),
          { timeout: 2000 }
        )
      })
    })

    describe('pagination', () => {
      it('does not show pagination controls when all tickets fit on one page', async () => {
        renderTable()
        await screen.findByText('Help with my order')
        expect(screen.queryByLabelText('Go to previous page')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Go to next page')).not.toBeInTheDocument()
      })

      it('shows Previous and Next navigation when there are multiple pages', async () => {
        vi.mocked(axios.get).mockResolvedValue(pageResponse(mockTickets, { total: 50 }))
        renderTable()
        await screen.findByText('Help with my order')
        expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument()
        expect(screen.getByLabelText('Go to next page')).toBeInTheDocument()
      })

      it('marks Previous as aria-disabled on the first page', async () => {
        vi.mocked(axios.get).mockResolvedValue(pageResponse(mockTickets, { total: 50 }))
        renderTable()
        await screen.findByText('Help with my order')
        expect(screen.getByLabelText('Go to previous page')).toHaveAttribute('aria-disabled', 'true')
      })

      it('calls the API with page 2 when Next is clicked', async () => {
        vi.mocked(axios.get).mockResolvedValue(pageResponse(mockTickets, { total: 50 }))
        renderTable()
        await screen.findByText('Help with my order')

        fireEvent.click(screen.getByLabelText('Go to next page'))

        await waitFor(() =>
          expect(vi.mocked(axios.get)).toHaveBeenLastCalledWith('/api/tickets', {
            params: { ...defaultParams, page: 2 },
            withCredentials: true,
          })
        )
      })

      it('shows the result range and total', async () => {
        vi.mocked(axios.get).mockResolvedValue(pageResponse(mockTickets, { total: 50 }))
        renderTable()
        await screen.findByText('Help with my order')
        expect(screen.getByText('Showing 1–10 of 50')).toBeInTheDocument()
      })
    })
  })
})
