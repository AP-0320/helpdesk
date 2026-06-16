# Tech Stack

## Frontend
- **React** with TypeScript
- **React Router** for client-side routing
- **Tailwind CSS** for styling

## Backend
- **Node.js** with **Express** and TypeScript

## Database
- **PostgreSQL** with **Prisma** ORM

## Auth
- Database sessions

## AI
- **Claude API** (Anthropic) — classification, summaries, suggested replies, knowledge-base-driven auto-responses

## Email
- **Resend** — outbound replies and inbound email webhooks

## Deployment

| Layer | Service |
|---|---|
| React frontend | Vercel |
| Node/Express backend | Railway |
| PostgreSQL | Railway (add-on) |
| Email (inbound + outbound) | Resend |

### Alternatives Considered

| Option | Frontend | Backend | Database | Notes |
|---|---|---|---|---|
| A (Recommended) | Vercel / Netlify | Railway | Railway PostgreSQL | Simplest setup |
| B | Vercel / Netlify | Render | Render PostgreSQL | Free tier spins down |
| C | Fly.io (nginx) | Fly.io | Fly.io Postgres | Most control, Docker-based |
| D | DigitalOcean | DigitalOcean App Platform | DO Managed PostgreSQL | Single provider, predictable pricing |
