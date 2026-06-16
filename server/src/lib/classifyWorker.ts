import * as Sentry from '@sentry/node'
import type { Job } from 'pg-boss'
import { boss } from '../boss'
import { prisma } from '../db'
import { classifyTicket } from './classifyTicket'

export const CLASSIFY_TICKET_JOB = 'classify-ticket'

export type ClassifyTicketData = { ticketId: string }

export async function startClassifyWorker(): Promise<void> {
  await boss.createQueue(CLASSIFY_TICKET_JOB)

  await boss.work<ClassifyTicketData>(CLASSIFY_TICKET_JOB, async (jobs: Job<ClassifyTicketData>[]) => {
    for (const job of jobs) {
      const ticket = await prisma.ticket.findUnique({ where: { id: job.data.ticketId } })
      if (!ticket) {
        Sentry.captureMessage(`[Classify Worker] Ticket not found: ${job.data.ticketId}`, 'warning')
        continue
      }
      try {
        await classifyTicket(ticket)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        Sentry.captureException(err, { extra: { ticketId: job.data.ticketId } })
      }
    }
  })

  Sentry.captureMessage('[Workers] classify-ticket worker started', 'info')
}

export function enqueueClassifyTicket(ticketId: string): void {
  boss.send(CLASSIFY_TICKET_JOB, { ticketId }).catch((err) =>
    Sentry.captureException(err, { extra: { ticketId } })
  )
}
