import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { renderOpenDialog, renderOpenDialogWithRerender } from '@/test/utils'
import UserDialog from '../UserDialog'
import type { User } from '../UsersTable'

vi.mock('axios')

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

const mockUser: User = {
  id: 'u1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  role: 'ADMIN',
  emailVerified: true,
  createdAt: '2024-01-15T10:00:00.000Z',
}

function fillAddForm({
  name = 'Jane Smith',
  email = 'jane@example.com',
  password = 'password123',
} = {}) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

function clickCreate() {
  fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
}

describe('UserDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('add mode (user=null)', () => {
    const props = { user: null }

    describe('field rendering', () => {
      it('renders the "Add new user" title', () => {
        renderOpenDialog(UserDialog, props)
        expect(screen.getByRole('heading', { name: 'Add new user' })).toBeInTheDocument()
      })

      it('renders name, email and password fields with labels', () => {
        renderOpenDialog(UserDialog, props)
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
      })

      it('renders Cancel and Create user buttons', () => {
        renderOpenDialog(UserDialog, props)
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Create user' })).toBeInTheDocument()
      })
    })

    describe('validation', () => {
      it('shows required errors for all fields when submitted empty', async () => {
        renderOpenDialog(UserDialog, props)
        clickCreate()
        expect(await screen.findByText('Name is required')).toBeInTheDocument()
        expect(screen.getByText('Email is required')).toBeInTheDocument()
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })

      it('shows an email format error for an invalid email', async () => {
        renderOpenDialog(UserDialog, props)
        fillAddForm({ email: 'not-an-email' })
        clickCreate()
        expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
      })

      it('shows a length error for a password shorter than 8 characters', async () => {
        renderOpenDialog(UserDialog, props)
        fillAddForm({ password: 'short' })
        clickCreate()
        expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
      })

      it('marks invalid fields with aria-invalid="true"', async () => {
        renderOpenDialog(UserDialog, props)
        clickCreate()
        await screen.findByText('Name is required')
        expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
      })
    })

    describe('loading state', () => {
      it('shows "Creating…" and disables both buttons while the request is in-flight', async () => {
        vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
        renderOpenDialog(UserDialog, props)
        fillAddForm()
        clickCreate()
        const submitBtn = await screen.findByRole('button', { name: 'Creating…' })
        expect(submitBtn).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      })
    })

    describe('successful submission', () => {
      it('calls POST /api/users with the correct payload and withCredentials', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: {} })
        renderOpenDialog(UserDialog, props)
        fillAddForm()
        clickCreate()
        await waitFor(() =>
          expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
            '/api/users',
            { name: 'Jane Smith', email: 'jane@example.com', password: 'password123' },
            { withCredentials: true }
          )
        )
      })

      it('closes the dialog after a successful submission', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: {} })
        const { onOpenChange } = renderOpenDialog(UserDialog, props)
        fillAddForm()
        clickCreate()
        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
      })
    })

    describe('error handling', () => {
      beforeEach(() => {
        vi.mocked(axios.isAxiosError).mockReturnValue(true)
      })

      it('shows the server error message from the API', async () => {
        vi.mocked(axios.post).mockRejectedValue({
          response: { data: { error: 'A user with that email already exists' } },
        })
        renderOpenDialog(UserDialog, props)
        fillAddForm()
        clickCreate()
        expect(await screen.findByText('A user with that email already exists')).toBeInTheDocument()
      })

      it('shows a fallback message when the API response has no error field', async () => {
        vi.mocked(axios.post).mockRejectedValue({ response: { data: {} } })
        renderOpenDialog(UserDialog, props)
        fillAddForm()
        clickCreate()
        expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
      })

      it('keeps the dialog open on error', async () => {
        vi.mocked(axios.post).mockRejectedValue({
          response: { data: { error: 'Email exists' } },
        })
        const { onOpenChange } = renderOpenDialog(UserDialog, props)
        fillAddForm()
        clickCreate()
        await screen.findByText('Email exists')
        expect(onOpenChange).not.toHaveBeenCalledWith(false)
      })
    })

    describe('Cancel button', () => {
      it('calls onOpenChange(false) without making an API call', () => {
        const { onOpenChange } = renderOpenDialog(UserDialog, props)
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(vi.mocked(axios.post)).not.toHaveBeenCalled()
      })
    })

    describe('form reset', () => {
      it('clears all fields when the dialog is closed and reopened', () => {
        const { rerender } = renderOpenDialogWithRerender(UserDialog, props)
        fillAddForm()
        expect(screen.getByLabelText('Name')).toHaveValue('Jane Smith')
        rerender(false)
        rerender(true)
        expect(screen.getByLabelText('Name')).toHaveValue('')
        expect(screen.getByLabelText('Email')).toHaveValue('')
        expect(screen.getByLabelText('Password')).toHaveValue('')
      })
    })
  })

  describe('edit mode (user provided)', () => {
    const props = { user: mockUser }

    describe('field rendering', () => {
      it('renders the "Edit user" title', () => {
        renderOpenDialog(UserDialog, props)
        expect(screen.getByRole('heading', { name: 'Edit user' })).toBeInTheDocument()
      })

      it('pre-fills name and email from the user prop', () => {
        renderOpenDialog(UserDialog, props)
        expect(screen.getByLabelText('Name')).toHaveValue('Alice Smith')
        expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com')
      })

      it('leaves the password field empty', () => {
        renderOpenDialog(UserDialog, props)
        expect(screen.getByPlaceholderText('Leave blank to keep current')).toHaveValue('')
      })

      it('renders Cancel and Save changes buttons', () => {
        renderOpenDialog(UserDialog, props)
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
      })
    })

    describe('validation', () => {
      it('shows a required error when name is cleared', async () => {
        renderOpenDialog(UserDialog, props)
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } })
        clickSave()
        expect(await screen.findByText('Name is required')).toBeInTheDocument()
      })

      it('shows a required error when email is cleared', async () => {
        renderOpenDialog(UserDialog, props)
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } })
        clickSave()
        expect(await screen.findByText('Email is required')).toBeInTheDocument()
      })

      it('shows an email format error for an invalid email', async () => {
        renderOpenDialog(UserDialog, props)
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
        clickSave()
        expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
      })

      it('allows submitting with an empty password', async () => {
        vi.mocked(axios.patch).mockResolvedValue({ data: {} })
        renderOpenDialog(UserDialog, props)
        clickSave()
        await waitFor(() => expect(vi.mocked(axios.patch)).toHaveBeenCalled())
      })

      it('shows a length error when the new password is shorter than 8 characters', async () => {
        renderOpenDialog(UserDialog, props)
        fireEvent.change(
          screen.getByPlaceholderText('Leave blank to keep current'),
          { target: { value: 'short' } }
        )
        clickSave()
        expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
      })

      it('marks invalid fields with aria-invalid="true"', async () => {
        renderOpenDialog(UserDialog, props)
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } })
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } })
        clickSave()
        await screen.findByText('Name is required')
        expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
      })
    })

    describe('loading state', () => {
      it('shows "Saving…" and disables both buttons while the request is in-flight', async () => {
        vi.mocked(axios.patch).mockReturnValue(new Promise(() => {}))
        renderOpenDialog(UserDialog, props)
        clickSave()
        const submitBtn = await screen.findByRole('button', { name: 'Saving…' })
        expect(submitBtn).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      })
    })

    describe('successful submission', () => {
      it('calls PATCH /api/users/:id with the updated name and empty password', async () => {
        vi.mocked(axios.patch).mockResolvedValue({ data: {} })
        renderOpenDialog(UserDialog, props)
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice Updated' } })
        clickSave()
        await waitFor(() =>
          expect(vi.mocked(axios.patch)).toHaveBeenCalledWith(
            '/api/users/u1',
            { name: 'Alice Updated', email: 'alice@example.com', password: '' },
            { withCredentials: true }
          )
        )
      })

      it('calls PATCH /api/users/:id with a new password when provided', async () => {
        vi.mocked(axios.patch).mockResolvedValue({ data: {} })
        renderOpenDialog(UserDialog, props)
        fireEvent.change(
          screen.getByPlaceholderText('Leave blank to keep current'),
          { target: { value: 'newpassword123' } }
        )
        clickSave()
        await waitFor(() =>
          expect(vi.mocked(axios.patch)).toHaveBeenCalledWith(
            '/api/users/u1',
            { name: 'Alice Smith', email: 'alice@example.com', password: 'newpassword123' },
            { withCredentials: true }
          )
        )
      })

      it('closes the dialog after a successful save', async () => {
        vi.mocked(axios.patch).mockResolvedValue({ data: {} })
        const { onOpenChange } = renderOpenDialog(UserDialog, props)
        clickSave()
        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
      })
    })

    describe('error handling', () => {
      beforeEach(() => {
        vi.mocked(axios.isAxiosError).mockReturnValue(true)
      })

      it('shows the server error message from the API', async () => {
        vi.mocked(axios.patch).mockRejectedValue({
          response: { data: { error: 'A user with that email already exists' } },
        })
        renderOpenDialog(UserDialog, props)
        clickSave()
        expect(await screen.findByText('A user with that email already exists')).toBeInTheDocument()
      })

      it('shows a fallback message when the API response has no error field', async () => {
        vi.mocked(axios.patch).mockRejectedValue({ response: { data: {} } })
        renderOpenDialog(UserDialog, props)
        clickSave()
        expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
      })

      it('keeps the dialog open on error', async () => {
        vi.mocked(axios.patch).mockRejectedValue({
          response: { data: { error: 'Email taken' } },
        })
        const { onOpenChange } = renderOpenDialog(UserDialog, props)
        clickSave()
        await screen.findByText('Email taken')
        expect(onOpenChange).not.toHaveBeenCalledWith(false)
      })
    })

    describe('Cancel button', () => {
      it('calls onOpenChange(false) without making an API call', () => {
        const { onOpenChange } = renderOpenDialog(UserDialog, props)
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(vi.mocked(axios.patch)).not.toHaveBeenCalled()
      })
    })

    describe('form reset', () => {
      it('restores pre-filled values when the dialog is closed and reopened', () => {
        const { rerender } = renderOpenDialogWithRerender(UserDialog, props)
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Edited Name' } })
        expect(screen.getByLabelText('Name')).toHaveValue('Edited Name')
        rerender(false)
        rerender(true)
        expect(screen.getByLabelText('Name')).toHaveValue('Alice Smith')
        expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com')
        expect(screen.getByPlaceholderText('Leave blank to keep current')).toHaveValue('')
      })
    })
  })
})
