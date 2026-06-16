import { config } from 'dotenv'
import { createHmac } from 'crypto'

config()

const secret = process.env.RESEND_WEBHOOK_SECRET
const secretBytes = Buffer.from(secret.replace('whsec_', ''), 'base64')

const msgId     = `msg_test_${Date.now()}`
const timestamp = Math.floor(Date.now() / 1000).toString()

const payload = JSON.stringify({
  type: 'email.received',
  created_at: new Date().toISOString(),
  data: {
    email_id: `email_test_${Date.now()}`,
    created_at: new Date().toISOString(),
    from: 'David Chen <david@example.com>',
    to: ['support@helpdesk.local'],
    subject: 'API integration throwing 500 error on POST requests',
    text: 'Hello, I am integrating your API into my app and keep getting a 500 Internal Server Error when sending POST requests to the /orders endpoint. I have checked my payload and auth token and both look correct. The GET requests work fine. Can you help me debug this?',
  },
})

const signature = createHmac('sha256', secretBytes)
  .update(`${msgId}.${timestamp}.${payload}`)
  .digest('base64')

const res = await fetch('http://localhost:3000/api/webhooks/inbound-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'svix-id':        msgId,
    'svix-timestamp': timestamp,
    'svix-signature': `v1,${signature}`,
  },
  body: payload,
})

const body = await res.json()
console.log('Status :', res.status)
console.log('Response:', JSON.stringify(body, null, 2))
