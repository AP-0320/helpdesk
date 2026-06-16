declare global {
  namespace Express {
    interface Request {
      webhookProvider?: 'resend' | 'sendgrid' | 'mailgun'
    }
  }
}

export {}
