import * as Sentry from '@sentry/node'
import type { Job } from 'pg-boss'
import { boss } from '../boss'
import { prisma } from '../db'
import { autoResolveTicket } from './autoResolveTicket'

export const AUTO_RESOLVE_TICKET_JOB = 'auto-resolve-ticket'

export type AutoResolveTicketData = { ticketId: string }

export async function startAutoResolveWorker(): Promise<void> {
  await boss.createQueue(AUTO_RESOLVE_TICKET_JOB)

  await boss.work<AutoResolveTicketData>(AUTO_RESOLVE_TICKET_JOB, async (jobs: Job<AutoResolveTicketData>[]) => {
    for (const job of jobs) {
      const ticket = await prisma.ticket.findUnique({ where: { id: job.data.ticketId } })
      if (!ticket) {
        Sentry.captureMessage(`[Auto-Resolve Worker] Ticket not found: ${job.data.ticketId}`, 'warning')
        continue
      }
      await autoResolveTicket(ticket)
    }
  })

  Sentry.captureMessage('[Workers] auto-resolve-ticket worker started', 'info')
}

export function enqueueAutoResolveTicket(ticketId: string): void {
  boss.send(AUTO_RESOLVE_TICKET_JOB, { ticketId }).catch((err) =>
    Sentry.captureException(err, { extra: { ticketId } })
  )
}
