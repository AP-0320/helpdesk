import { screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { renderWithQueryClient } from '@/test/utils'
import TicketDetailPage from '../TicketDetailPage'

vi.mock('axios')

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useParams: () => ({ id: '1' }) }
})

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children, disabled }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
    >
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

interface MockReply {
  id: string
  body: string
  userType: 'AGENT' | 'CUSTOMER'
  createdAt: string
  user: { id: string; name: string } | null
}

const mockTicket = {
  id: '1',
  subject: 'Help with my order',
  body: 'I need help with order #123.\n\nPlease advise.',
  fromName: 'Jane Customer',
  fromEmail: 'jane@example.com',
  toEmail: 'support@helpdesk.com',
  status: 'OPEN' as const,
  category: null,
  createdAt: '2026-06-14T10:00:00.000Z',
  assignedId: null,
  assignee: null,
}

const mockAgents = [
  { id: 'agent-1', name: 'Alice Agent', email: 'alice@helpdesk.com' },
  { id: 'agent-2', name: 'Bob Agent', email: 'bob@helpdesk.com' },
]

const mockAgentReply: MockReply = {
  id: 'reply-1',
  body: 'Thanks for reaching out. I will look into this.',
  userType: 'AGENT',
  createdAt: '2026-06-14T11:00:00.000Z',
  user: { id: 'agent-1', name: 'Alice Agent' },
}

function renderPage() {
  return renderWithQueryClient(<TicketDetailPage />)
}

function mockGet(ticket = mockTicket, replies: MockReply[] = []) {
  vi.mocked(axios.get).mockImplementation((url) => {
    if (String(url).startsWith('/api/agents')) return Promise.resolve({ data: mockAgents })
    if (String(url).includes('/replies')) return Promise.resolve({ data: replies })
    return Promise.resolve({ data: ticket })
  })
}

describe('TicketDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet()
  })

  it('shows skeleton placeholders while loading', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderPage()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows the error message when the request fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Request failed with status code 404'))
    renderPage()
    expect(await screen.findByText('Request failed with status code 404')).toBeInTheDocument()
  })

  describe('with ticket loaded', () => {
    it('shows the ticket subject as the heading', async () => {
      renderPage()
      expect(await screen.findByRole('heading', { name: 'Help with my order' })).toBeInTheDocument()
    })

    it('shows the sender name and email', async () => {
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })
      expect(screen.getByText('Jane Customer')).toBeInTheDocument()
      expect(screen.getByText(/<jane@example\.com>/)).toBeInTheDocument()
    })

    it('shows the recipient email', async () => {
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })
      expect(screen.getByText('support@helpdesk.com')).toBeInTheDocument()
    })

    it('shows the email body', async () => {
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })
      expect(screen.getByText(/I need help with order #123/)).toBeInTheDocument()
    })

    it('has a back link to the tickets list', async () => {
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })
      expect(screen.getByRole('link', { name: 'Back to tickets' }))
        .toHaveAttribute('href', '/tickets')
    })

    it('calls the API with the ticket id and credentials', async () => {
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })
      expect(vi.mocked(axios.get)).toHaveBeenCalledWith('/api/tickets/1', {
        withCredentials: true,
      })
    })

    it('calls PATCH with new status when status select changes', async () => {
      vi.mocked(axios.patch).mockResolvedValue({ data: { ...mockTicket, status: 'RESOLVED' } })
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })

      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
      const statusSelect = selects.find((s) => s.value === 'OPEN')!
      fireEvent.change(statusSelect, { target: { value: 'RESOLVED' } })

      await waitFor(() =>
        expect(vi.mocked(axios.patch)).toHaveBeenCalledWith(
          '/api/tickets/1',
          { status: 'RESOLVED' },
          { withCredentials: true }
        )
      )
    })

    it('calls PATCH with new category when category select changes', async () => {
      vi.mocked(axios.patch).mockResolvedValue({ data: { ...mockTicket, category: 'TECHNICAL_ISSUE' } })
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })

      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
      const categorySelect = selects.find((s) => s.value === 'none')!
      fireEvent.change(categorySelect, { target: { value: 'TECHNICAL_ISSUE' } })

      await waitFor(() =>
        expect(vi.mocked(axios.patch)).toHaveBeenCalledWith(
          '/api/tickets/1',
          { category: 'TECHNICAL_ISSUE' },
          { withCredentials: true }
        )
      )
    })

    it('calls PATCH with null category when "No category" is selected', async () => {
      const assignedTicket = { ...mockTicket, category: 'TECHNICAL_ISSUE' as const }
      mockGet(assignedTicket)
      vi.mocked(axios.patch).mockResolvedValue({ data: { ...assignedTicket, category: null } })
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })

      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
      const categorySelect = selects.find((s) => s.value === 'TECHNICAL_ISSUE')!
      fireEvent.change(categorySelect, { target: { value: 'none' } })

      await waitFor(() =>
        expect(vi.mocked(axios.patch)).toHaveBeenCalledWith(
          '/api/tickets/1',
          { category: null },
          { withCredentials: true }
        )
      )
    })

    it('calls PATCH with assignedId when agent is selected', async () => {
      vi.mocked(axios.patch).mockResolvedValue({ data: { ...mockTicket, assignedId: 'agent-1', assignee: mockAgents[0] } })
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })

      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
      const assigneeSelect = selects.find((s) => s.value === 'unassigned')!
      fireEvent.change(assigneeSelect, { target: { value: 'agent-1' } })

      await waitFor(() =>
        expect(vi.mocked(axios.patch)).toHaveBeenCalledWith(
          '/api/tickets/1',
          { assignedId: 'agent-1' },
          { withCredentials: true }
        )
      )
    })

    it('calls PATCH with null assignedId when Unassigned is selected', async () => {
      const assignedTicket = { ...mockTicket, assignedId: 'agent-1', assignee: mockAgents[0] }
      mockGet(assignedTicket)
      vi.mocked(axios.patch).mockResolvedValue({ data: { ...assignedTicket, assignedId: null, assignee: null } })
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })

      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
      const assigneeSelect = selects.find((s) => s.value === 'agent-1')!
      fireEvent.change(assigneeSelect, { target: { value: 'unassigned' } })

      await waitFor(() =>
        expect(vi.mocked(axios.patch)).toHaveBeenCalledWith(
          '/api/tickets/1',
          { assignedId: null },
          { withCredentials: true }
        )
      )
    })
  })

  describe('reply feature', () => {
    it('shows the Reply button after the ticket loads', async () => {
      renderPage()
      expect(await screen.findByRole('button', { name: 'Reply' })).toBeInTheDocument()
    })

    it('shows the reply form and hides the Reply button when Reply is clicked', async () => {
      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: 'Reply' }))
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send reply' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument()
    })

    it('hides the form and restores the Reply button when Cancel is clicked', async () => {
      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: 'Reply' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(await screen.findByRole('button', { name: 'Reply' })).toBeInTheDocument()
      expect(screen.queryByRole('textbox', { name: 'Reply' })).not.toBeInTheDocument()
    })

    it('shows a validation error when the form is submitted empty', async () => {
      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: 'Reply' }))
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
      expect(await screen.findByText('Reply is required')).toBeInTheDocument()
    })

    it('POSTs to the replies endpoint with the body and credentials', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: mockAgentReply })
      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: 'Reply' }))
      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), {
        target: { value: 'Thanks for reaching out.' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
      await waitFor(() =>
        expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
          '/api/tickets/1/replies',
          { body: 'Thanks for reaching out.' },
          { withCredentials: true }
        )
      )
    })

    it('hides the form after a successful reply submission', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: mockAgentReply })
      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: 'Reply' }))
      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), {
        target: { value: 'Thanks for reaching out.' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
      expect(await screen.findByRole('button', { name: 'Reply' })).toBeInTheDocument()
      expect(screen.queryByRole('textbox', { name: 'Reply' })).not.toBeInTheDocument()
    })

    it('shows an API error when the POST fails', async () => {
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      vi.mocked(axios.post).mockRejectedValue({
        isAxiosError: true,
        response: { data: { error: 'Something went wrong on the server' } },
      })
      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: 'Reply' }))
      fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), {
        target: { value: 'Hello' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
      expect(await screen.findByText('Something went wrong on the server')).toBeInTheDocument()
    })

    it('renders existing replies with author name, type label, and body', async () => {
      mockGet(mockTicket, [mockAgentReply])
      renderPage()
      await screen.findByRole('heading', { name: 'Help with my order' })
      expect(await screen.findByText('Thanks for reaching out. I will look into this.')).toBeInTheDocument()
      // 'Alice Agent' also appears in the agents dropdown, so check for at least one match
      expect(screen.getAllByText('Alice Agent').length).toBeGreaterThan(0)
      expect(screen.getByText('agent')).toBeInTheDocument()
    })

    it('fetches replies with the correct ticket id and credentials', async () => {
      renderPage()
      await screen.findByRole('button', { name: 'Reply' })
      expect(vi.mocked(axios.get)).toHaveBeenCalledWith('/api/tickets/1/replies', {
        withCredentials: true,
      })
    })
  })
})
