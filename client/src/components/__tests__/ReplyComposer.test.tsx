import { screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { renderWithQueryClient } from '@/test/utils'
import { ReplyComposer } from '../ReplyComposer'

vi.mock('axios')

const DEFAULT_PROPS = { ticketId: 'ticket-1', customerName: 'Jane Customer' }

function renderComposer(props = DEFAULT_PROPS) {
  return renderWithQueryClient(<ReplyComposer {...props} />)
}

function openForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
}

function typeInTextarea(value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), {
    target: { value },
  })
}

describe('ReplyComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Polish button visibility and disabled state', () => {
    it('is present in the form alongside Send reply and Cancel', () => {
      renderComposer()
      openForm()
      expect(screen.getByRole('button', { name: 'Polish' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send reply' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('is disabled when the textarea is empty', () => {
      renderComposer()
      openForm()
      expect(screen.getByRole('button', { name: 'Polish' })).toBeDisabled()
    })

    it('is enabled once the textarea has text', () => {
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      expect(screen.getByRole('button', { name: 'Polish' })).toBeEnabled()
    })

    it('is disabled again when the textarea is cleared', () => {
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      typeInTextarea('')
      expect(screen.getByRole('button', { name: 'Polish' })).toBeDisabled()
    })
  })

  describe('while polishing', () => {
    it('shows "Polishing…" on the button while the request is in flight', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      expect(await screen.findByRole('button', { name: 'Polishing…' })).toBeDisabled()
    })

    it('disables the textarea while polishing', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      await screen.findByRole('button', { name: 'Polishing…' })
      expect(screen.getByRole('textbox', { name: 'Reply' })).toBeDisabled()
    })

    it('disables Send reply while polishing', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      await screen.findByRole('button', { name: 'Polishing…' })
      expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
    })
  })

  describe('on success', () => {
    it('POSTs to /api/tickets/polish-reply with text and customerName', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { polishedText: 'Polished reply' } })
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      await waitFor(() =>
        expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
          '/api/tickets/polish-reply',
          { text: 'rough draft', customerName: 'Jane Customer' },
          { withCredentials: true }
        )
      )
    })

    it('replaces the textarea content with the polished text', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { polishedText: 'Dear Jane, polished reply here.' } })
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: 'Reply' })).toHaveValue('Dear Jane, polished reply here.')
      )
    })

    it('restores the Polish button after success', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { polishedText: 'Polished' } })
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      expect(await screen.findByRole('button', { name: 'Polish' })).toBeInTheDocument()
    })

    it('re-enables the textarea and Send reply after success', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { polishedText: 'Polished' } })
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      await screen.findByRole('button', { name: 'Polish' })
      expect(screen.getByRole('textbox', { name: 'Reply' })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: 'Send reply' })).not.toBeDisabled()
    })
  })

  describe('on failure', () => {
    it('shows the error message when the polish request fails', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      expect(await screen.findByText('Failed to polish reply. Please try again.')).toBeInTheDocument()
    })

    it('preserves the original textarea text when polishing fails', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      await screen.findByText('Failed to polish reply. Please try again.')
      expect(screen.getByRole('textbox', { name: 'Reply' })).toHaveValue('rough draft')
    })

    it('restores the Polish button after failure', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))
      renderComposer()
      openForm()
      typeInTextarea('rough draft')
      fireEvent.click(screen.getByRole('button', { name: 'Polish' }))
      await screen.findByText('Failed to polish reply. Please try again.')
      expect(screen.getByRole('button', { name: 'Polish' })).toBeInTheDocument()
    })
  })
})
