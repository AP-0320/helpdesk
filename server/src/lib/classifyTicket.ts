import * as Sentry from '@sentry/node'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { Ticket, TicketCategory } from '@prisma/client'
import { prisma } from '../db'

const CATEGORIES = Object.values(TicketCategory)

export async function classifyTicket(ticket: Ticket): Promise<void> {
  const { text } = await generateText({
    model: google('gemini-3.1-flash-lite'),
    system: `You are a customer support classifier. Classify the ticket into exactly one of these categories: ${CATEGORIES.join(', ')}. Reply with only the category name — nothing else.`,
    prompt: `Subject: ${ticket.subject}\n\n${ticket.body}`,
  })

  const category = text.trim().toUpperCase().replace(/\s+/g, '_') as TicketCategory
  if (!CATEGORIES.includes(category)) {
    Sentry.captureMessage(`[AI Classify] Unexpected category "${text}" for ticket ${ticket.id}`, 'warning')
    return
  }

  await prisma.ticket.update({ where: { id: ticket.id }, data: { category } })
  Sentry.captureMessage(`[AI Classify] Ticket ${ticket.id} → ${category}`, 'info')
}
