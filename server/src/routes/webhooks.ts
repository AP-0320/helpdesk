import * as Sentry from '@sentry/node'
import { Router } from 'express'
import { Webhook } from 'svix'
import { resendInboundWebhookSchema } from '@helpdesk/core'
import { prisma } from '../db'
import { asyncHandler } from '../middleware/asyncHandler'
import { requireWebhookSource } from '../middleware/webhookSource'
import { parseFromAddress } from '../lib/parseFromAddress'
import { enqueueClassifyTicket, enqueueAutoResolveTicket } from '../workers'
import { getAiAgent } from '../lib/aiAgent'

const router = Router()

router.post(
  '/inbound-email',
  requireWebhookSource,
  asyncHandler(async (req, res) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (!secret) {
      Sentry.captureMessage('RESEND_WEBHOOK_SECRET is not set', 'error')
      res.status(500).end()
      return
    }

    const rawBody = (req.body as Buffer).toString('utf-8')

    const wh = new Webhook(secret)
    try {
      wh.verify(rawBody, {
        'svix-id': req.headers['svix-id'] as string,
        'svix-timestamp': req.headers['svix-timestamp'] as string,
        'svix-signature': req.headers['svix-signature'] as string,
      })
    } catch {
      res.status(400).json({ error: 'Invalid webhook signature' })
      return
    }

    const parsed = resendInboundWebhookSchema.safeParse(JSON.parse(rawBody))
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', issues: parsed.error.issues })
      return
    }

    const { data: event } = parsed

    const existing = await prisma.ticket.findUnique({
      where: { resendEmailId: event.data.email_id },
    })
    if (existing) {
      res.status(200).json({ id: existing.id })
      return
    }

    let body = ''
    let bodyHtml = ''
    try {
      const emailRes = await fetch(
        `https://api.resend.com/emails/receiving/${event.data.email_id}`,
        { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
      )
      if (emailRes.ok) {
        const emailData = (await emailRes.json()) as { text?: string; html?: string }
        body = emailData.text ?? ''
        bodyHtml = emailData.html ?? ''
      } else {
        Sentry.captureMessage(`Failed to fetch email body for ${event.data.email_id}: ${emailRes.status}`, 'warning')
      }
    } catch (err) {
      Sentry.captureException(err)
    }

    const { name: fromName, email: fromEmail } = parseFromAddress(event.data.from)
    const toEmail = event.data.to[0] ?? ''

    const aiAgent = await getAiAgent()

    const ticket = await prisma.ticket.create({
      data: {
        subject: event.data.subject || '(No Subject)',
        body,
        bodyHtml,
        fromName,
        fromEmail,
        toEmail,
        resendEmailId: event.data.email_id,
        status: 'NEW',
        assignedId: aiAgent?.id ?? null,
      },
    })

    res.status(200).json({ id: ticket.id })

    enqueueClassifyTicket(ticket.id)

    enqueueAutoResolveTicket(ticket.id)
  })
)

export default router
