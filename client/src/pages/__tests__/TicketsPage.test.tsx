import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { renderWithQueryClient } from '@/test/utils'
import TicketsPage from '../TicketsPage'

vi.mock('axios')

function renderPage() {
  return renderWithQueryClient(<TicketsPage />)
}

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockResolvedValue({ data: { tickets: [], total: 0, page: 1, pageSize: 10, pageCount: 0 } })
  })

  it('renders the "Tickets" heading', () => {
    renderPage()
    expect(screen.getByText('Tickets')).toBeInTheDocument()
  })

  it('renders the page description', () => {
    renderPage()
    expect(screen.getByText('All support tickets received by email')).toBeInTheDocument()
  })
})
