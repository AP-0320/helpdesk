import * as Sentry from '@sentry/node'
import { PgBoss } from 'pg-boss'

export const boss = new PgBoss(process.env.DATABASE_URL!)

boss.on('error', (err) => Sentry.captureException(err))
