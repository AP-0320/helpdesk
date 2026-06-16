import * as Sentry from '@sentry/node'
import type { Job } from 'pg-boss'
import { boss } from '../boss'
import { sendReplyEmail, type ReplyEmailParams } from './email'

export const SEND_REPLY_EMAIL_JOB = 'send-reply-email'

export async function startEmailWorker(): Promise<void> {
  await boss.createQueue(SEND_REPLY_EMAIL_JOB)

  await boss.work<ReplyEmailParams>(SEND_REPLY_EMAIL_JOB, async (jobs: Job<ReplyEmailParams>[]) => {
    for (const job of jobs) {
      await sendReplyEmail(job.data)
    }
  })

  Sentry.captureMessage('[Workers] send-reply-email worker started', 'info')
}

export function enqueueReplyEmail(params: ReplyEmailParams): void {
  boss.send(SEND_REPLY_EMAIL_JOB, params).catch((err) =>
    Sentry.captureException(err)
  )
}
