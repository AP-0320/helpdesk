import './instrument'
import * as Sentry from '@sentry/node'
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth'
import usersRouter from './routes/users'
import agentsRouter from './routes/agents'
import webhooksRouter from './routes/webhooks'
import ticketsRouter from './routes/tickets'
import statsRouter from './routes/stats'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL!, credentials: true }))

// Better Auth must mount before express.json() — it reads its own body stream
app.all('/api/auth/*', toNodeHandler(auth))

// Webhook needs the raw body Buffer for Svix signature verification.
// Register express.raw() before express.json() so it wins for this path.
app.use('/api/webhooks/inbound-email', express.raw({ type: 'application/json' }))

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/users', usersRouter)
app.use('/api/agents', agentsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/stats', statsRouter)

// In production the built React client lives two levels above dist/
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

Sentry.setupExpressErrorHandler(app)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error' })
})

export default app
