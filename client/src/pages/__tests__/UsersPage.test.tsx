import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { renderWithQueryClient } from '@/test/utils'

import UsersPage from '../UsersPage'

vi.mock('axios')

const mockUsers = [
  {
    id: '1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    role: 'ADMIN' as const,
    emailVerified: true,
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: '2',
    name: 'Bob Jones',
    email: 'bob@example.com',
    role: 'AGENT' as const,
    emailVerified: true,
    createdAt: '2024-03-22T08:30:00.000Z',
  },
]

function renderPage() {
  return renderWithQueryClient(<UsersPage />)
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the card heading and description', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    renderPage()
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('All registered users in the system')).toBeInTheDocument()
  })

  it('renders skeleton placeholders while the request is in-flight', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderPage()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows table column headers', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    renderPage()
    await screen.findByText('No users found.')
    expect(screen.getByRole('columnheader', { name: 'User' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Joined' })).toBeInTheDocument()
  })

  it('shows "No users found." when the API returns an empty list', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    renderPage()
    expect(await screen.findByText('No users found.')).toBeInTheDocument()
  })

  it('shows the error message when the request fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Request failed with status code 500'))
    renderPage()
    expect(await screen.findByText('Request failed with status code 500')).toBeInTheDocument()
  })

  it('hides the table when there is an error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Server error'))
    renderPage()
    await screen.findByText('Server error')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  describe('with users loaded', () => {
    beforeEach(() => {
      vi.mocked(axios.get).mockResolvedValue({ data: mockUsers })
    })

    it('renders a row for each user with name and email', async () => {
      renderPage()
      expect(await screen.findByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Bob Jones')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('shows the first letter of each user name as the avatar initial', async () => {
      renderPage()
      await screen.findByText('Alice Smith')
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
    })

    it('renders "Admin" badge for ADMIN and "Agent" badge for AGENT', async () => {
      renderPage()
      expect(await screen.findByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Agent')).toBeInTheDocument()
    })

    it('formats the createdAt date in short month format', async () => {
      renderPage()
      await screen.findByText('Alice Smith')
      const expectedDate = new Date('2024-01-15T10:00:00.000Z').toLocaleDateString(
        undefined,
        { year: 'numeric', month: 'short', day: 'numeric' }
      )
      expect(screen.getByText(expectedDate)).toBeInTheDocument()
    })

    it('calls the API with credentials', async () => {
      renderPage()
      await screen.findByText('Alice Smith')
      expect(vi.mocked(axios.get)).toHaveBeenCalledWith('/api/users', {
        withCredentials: true,
      })
    })
  })

  describe('Add User dialog', () => {
    beforeEach(() => {
      vi.mocked(axios.get).mockResolvedValue({ data: [] })
    })

    it('is not visible on initial render', () => {
      renderPage()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens when the "Add User" button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('button', { name: /add user/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add new user')).toBeInTheDocument()
    })

    it('closes when the Escape key is pressed', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('button', { name: /add user/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await user.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
    })

    it('closes when clicking outside the dialog', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('button', { name: /add user/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await user.click(document.querySelector('[data-slot="dialog-overlay"]')!)
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
    })
  })

  describe('Edit User dialog', () => {
    beforeEach(() => {
      vi.mocked(axios.get).mockResolvedValue({ data: mockUsers })
    })

    it('renders an edit button for each user row', async () => {
      renderPage()
      await screen.findByText('Alice Smith')
      expect(screen.getByRole('button', { name: 'Edit Alice Smith' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit Bob Jones' })).toBeInTheDocument()
    })

    it('opens the edit dialog when an edit button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('Alice Smith')
      await user.click(screen.getByRole('button', { name: 'Edit Alice Smith' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit user')).toBeInTheDocument()
    })

    it('closes the edit dialog when the Escape key is pressed', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('Alice Smith')
      await user.click(screen.getByRole('button', { name: 'Edit Alice Smith' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await user.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
    })
  })
})
