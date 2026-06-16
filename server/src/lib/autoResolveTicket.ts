import * as Sentry from '@sentry/node'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { Ticket } from '@prisma/client'
import { prisma } from '../db'
import { enqueueReplyEmail } from '../workers'

const knowledgeBase = readFileSync(join(__dirname, '../../knowledge-base.md'), 'utf-8')

const autoResolveSchema = z.object({
  canResolve: z.boolean(),
  answer: z.string(),
})

export async function autoResolveTicket(ticket: Ticket): Promise<void> {
  const firstName = ticket.fromName.split(' ')[0]

  await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'PROCESSING' } })

  try {
    const { object } = await generateObject({
      model: google('gemini-3.1-flash-lite'),
      schema: autoResolveSchema,
      system: `You are a professional customer support assistant. Use ONLY the knowledge base below to answer customer questions.

${knowledgeBase}

Rules:
- Set canResolve to true ONLY if the knowledge base directly answers the customer's question.
- Set canResolve to false if ANY escalation rule applies: legal threats, refund requested outside the 30-day window, chargeback or payment dispute, account security concerns, or low confidence.
- Set canResolve to false if the topic is not covered by the knowledge base.
- When canResolve is true, write a complete, properly formatted email reply in the answer field following these guidelines:
  - Open with "Hi ${firstName}," on its own line
  - Write in a warm, professional, and customer-friendly tone
  - Use clear paragraphs; use bullet points or numbered lists where appropriate; do NOT use markdown bold (**text**) or any other markdown formatting
  - End with a closing line (e.g. "If you have any other questions, feel free to reach out.")
  - Sign off with:
    Warm regards,
    Support Team
    support@helpdesk.local
- When canResolve is false, leave answer as an empty string.`,
      prompt: `Subject: ${ticket.subject}\n\n${ticket.body}`,
    })

    if (object.canResolve && object.answer) {
      await prisma.reply.create({
        data: {
          body: object.answer,
          bodyHtml: null,
          userType: 'AGENT',
          userId: null,
          ticketId: ticket.id,
        },
      })
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'RESOLVED' } })

      enqueueReplyEmail({
        to: ticket.fromEmail,
        toName: ticket.fromName,
        subject: ticket.subject,
        body: object.answer,
        bodyHtml: null,
      })

      Sentry.captureMessage(`[AI Auto-Resolve] Ticket ${ticket.id} resolved automatically`, 'info')
    } else {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'OPEN', assignedId: null },
      })
      Sentry.captureMessage(`[AI Auto-Resolve] Ticket ${ticket.id} requires human attention`, 'info')
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    Sentry.captureException(err, { extra: { ticketId: ticket.id } })
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'OPEN', assignedId: null },
    })
  }
}
