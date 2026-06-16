import { Webhook } from 'svix'
import 'dotenv/config'
const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET)
const payload = JSON.stringify({ type: 'email.received' })
const headers = wh.sign('msg_test_1', new Date(), payload)
console.log(JSON.stringify(headers, null, 2))
