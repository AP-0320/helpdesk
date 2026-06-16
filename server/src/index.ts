import 'dotenv/config'
import './instrument'
import * as Sentry from '@sentry/node'

const REQUIRED_ENV = [
  'CLIENT_URL',
  'BETTER_AUTH_SECRET',
  'DATABASE_URL',
  'BETTER_AUTH_URL',
] as const
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`)
}

import app from './app'
import { boss } from './boss'
import { startWorkers } from './workers'

const PORT = process.env.PORT || 3000;

(async () => {
  await boss.start()
  await startWorkers()

  app.listen(PORT, () => {
    Sentry.captureMessage(`Server running on port ${PORT}`, 'info')
  })
})()
