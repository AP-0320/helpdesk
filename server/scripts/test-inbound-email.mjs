/**
 * Sends a signed test inbound-email webhook to the local server.
 * Pass --duplicate to resend the same email_id (tests idempotency).
 * Usage: node scripts/test-inbound-email.mjs [--duplicate]
 */
import { Webhook } from 'svix'
import 'dotenv/config'

const secret = process.env.RESEND_WEBHOOK_SECRET
if (!secret) {
  console.error('RESEND_WEBHOOK_SECRET is not set in .env')
  process.exit(1)
}

const isDuplicate = process.argv.includes('--duplicate')
const emailId = isDuplicate ? 'test-fixed-id-for-idempotency' : `test-${Date.now()}`

const payload = JSON.stringify({
  type: 'email.received',
  created_at: new Date().toISOString(),
  data: {
    email_id: emailId,
    created_at: new Date().toISOString(),
    from: 'Jane Customer <jane@example.com>',
    to: ['support@helpdesk.com'],
    cc: [],
    bcc: [],
    message_id: '<test123@mail.example.com>',
    subject: 'I need help with my order',
    attachments: [],
  },
})

const wh = new Webhook(secret)
const msgId = `msg_test_${Date.now()}`
const now = new Date()
const timestamp = Math.floor(now.getTime() / 1000).toString()
const signature = wh.sign(msgId, now, payload)

const res = await fetch('http://localhost:3000/api/webhooks/inbound-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'svix-id': msgId,
    'svix-timestamp': timestamp,
    'svix-signature': signature,
  },
  body: payload,
})

const text = await res.text()
console.log(`Status: ${res.status}`)
console.log('Response:', text)
