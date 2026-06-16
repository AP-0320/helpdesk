import * as Sentry from '@sentry/node'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface ReplyEmailParams {
  to: string
  toName: string
  subject: string
  body: string
  bodyHtml: string | null
}

export async function sendReplyEmail(params: ReplyEmailParams): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    Sentry.captureMessage(`[Email] RESEND_FROM_EMAIL is not set — skipping email to ${params.to}`, 'error')
    return
  }
  const { error } = await resend.emails.send({
    from,
    to: `${params.to}`,
    subject: `Re: ${params.subject}`,
    text: params.body,
    ...(params.bodyHtml ? { html: params.bodyHtml } : {}),
  })

  if (error) {
    Sentry.captureException(new Error(`[Email] Failed to send reply email to ${params.to}`), { extra: { error } })
  }
}
