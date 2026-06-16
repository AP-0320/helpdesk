import { Request, Response, NextFunction } from 'express'

export function requireWebhookSource(req: Request, res: Response, next: NextFunction): void {
  const h = req.headers

  if (h['svix-id'] && h['svix-timestamp'] && h['svix-signature']) {
    req.webhookProvider = 'resend'
    next()
    return
  }

  if (h['x-twilio-email-event-webhook-signature']) {
    req.webhookProvider = 'sendgrid'
    next()
    return
  }

  if (h['x-mailgun-signature-256'] && h['x-mailgun-token']) {
    req.webhookProvider = 'mailgun'
    next()
    return
  }

  res.status(403).json({ error: 'Request origin not allowed' })
}
