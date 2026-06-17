# Helpdesk — AI-Powered Ticket Management System

An AI-powered support ticket management system that automatically classifies, summarises, and responds to support emails — freeing agents for complex issues.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [Deployment](#deployment)
- [Data Model](#data-model)
- [User Roles](#user-roles)

---

## Overview

Support teams receive hundreds of emails daily. Agents manually read, classify, and respond to each ticket — slow and inconsistent. This system uses the Claude API to automate classification, generate human-friendly responses from a knowledge base, and surface AI-suggested replies, so agents only need to handle complex issues.

---

## Features

- **Email ingestion** — receives inbound support emails via Resend webhooks and creates tickets automatically
- **AI classification** — tickets are categorised as General Question, Technical Issue, or Refund Request
- **AI auto-resolution** — generates and sends personalised replies using a knowledge base
- **AI summaries** — per-ticket summaries of the conversation
- **AI-suggested replies** — agents get a suggested reply draft when composing
- **Ticket management** — list view with filtering, sorting, and pagination; detail view with full reply thread
- **User management** — admins can create, edit, and deactivate agent accounts
- **Dashboard** — overview of ticket stats and recent activity
- **Role-based access** — Admin and Agent roles with separate permissions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Tailwind CSS v4, Vite |
| UI components | shadcn/ui (radix-nova preset) |
| Client routing | React Router v7 |
| Client state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Auth (client) | better-auth client |
| HTTP client | Axios (always `withCredentials: true`) |
| Backend | Node.js + Express + TypeScript |
| Auth (server) | better-auth + express-session + connect-pg-simple |
| ORM | Prisma |
| Database | PostgreSQL |
| AI | Anthropic Claude API (via `ai` SDK) |
| Email | Resend (inbound webhooks + outbound replies) |
| Error tracking | Sentry |
| Testing (unit) | Vitest + React Testing Library |
| Testing (E2E) | Playwright |

---

## Project Structure

```
helpdesk/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Shared UI components
│       │   └── ui/          # shadcn/ui primitives
│       ├── pages/           # Route-level page components
│       ├── lib/             # Utilities (axios instance, auth client, etc.)
│       └── test/            # Shared test helpers
├── server/                  # Express backend
│   └── src/
│       ├── routes/          # Express routers (tickets, users, agents, stats, webhooks)
│       ├── middleware/       # Auth guards, async handler
│       ├── lib/             # AI agent, shared helpers
│       ├── types/           # Session type augmentation
│       ├── workers.ts       # Background job queue (classify, auto-resolve, email)
│       ├── auth.ts          # better-auth server config
│       ├── db.ts            # Prisma client singleton
│       └── boss.ts          # pg-boss worker setup
│   └── prisma/
│       ├── schema.prisma    # Database schema
│       ├── seed.ts          # Seeds admin user
│       └── migrations/      # Prisma migration history
├── packages/
│   └── core/                # Shared Zod schemas used by both client and server
│       └── src/
│           ├── index.ts     # Barrel re-export
│           └── schemas/     # Shared validation schemas
├── e2e/                     # Playwright E2E tests
├── playwright.config.ts
└── package.json             # Root workspace (npm workspaces)
```

---

## Prerequisites

- **Node.js** v20+
- **npm** v10+
- **PostgreSQL** (local instance or cloud)
- Anthropic API key (for AI features)
- Resend API key (for email features)

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd helpdesk
```

### 2. Install dependencies

From the repo root — npm workspaces install all packages at once:

```bash
npm install
```

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Fill in all values in `server/.env` (see [Environment Variables](#environment-variables) below).

### 4. Run database migrations

```bash
cd server
npm run db:migrate
```

### 5. Seed the admin user

```bash
npm run db:seed
```

The admin email and password are taken from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`.

---

## Environment Variables

All variables live in `server/.env`. Copy from `server/.env.example`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for the main database |
| `DATABASE_TEST_URL` | PostgreSQL connection string for the test database |
| `BETTER_AUTH_SECRET` | Random secret (min 32 chars) for session signing |
| `BETTER_AUTH_URL` | Server origin (`http://localhost:3000` in dev) |
| `CLIENT_URL` | Frontend origin (`http://localhost:5173` in dev) |
| `PORT` | Express server port (default `3000`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key for AI features |
| `RESEND_API_KEY` | Resend API key for email sending/receiving |
| `RESEND_FROM_EMAIL` | Sender address shown on outbound emails |
| `ADMIN_EMAIL` | Email for the seeded admin account |
| `ADMIN_PASSWORD` | Password for the seeded admin account |
| `SENTRY_DSN` | Sentry DSN for error tracking (optional) |

---

## Database

### Main database

```bash
cd server

# Apply migrations
npm run db:migrate

# Seed admin user
npm run db:seed
```

### Test database

A separate `helpdesk_test` database is used for E2E and integration tests:

```bash
# Apply migrations to test DB
npm run db:migrate:test

# Seed test DB
npm run db:seed:test
```

---

## Running the App

Open two terminals:

**Terminal 1 — Server** (http://localhost:3000)

```bash
cd server
npm run dev
```

**Terminal 2 — Client** (http://localhost:5173)

```bash
cd client
npm run dev
```

Vite proxies all `/api/*` requests from the client to the server automatically.

---

## Testing

### Component / Unit tests (Vitest + RTL)

```bash
cd client

npm test            # watch mode
npm run test:run    # single run (CI)
```

Tests live in `__tests__/` folders next to the component or page being tested.

### E2E tests (Playwright)

Make sure both the client and server are running (or let Playwright's `webServer` config start them):

```bash
# From repo root
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:report   # open last HTML report
```

E2E tests live in `e2e/` at the repo root.

---

## Deployment

| Layer | Recommended Service |
|---|---|
| React frontend | Vercel |
| Node/Express backend | Railway |
| PostgreSQL | Railway (add-on) |
| Email (inbound + outbound) | Resend |

For production, set `NODE_ENV=production` on the server. Rate limiting (via better-auth) is only active in production mode.

---

## Data Model

```
User          — id, name, email, role (ADMIN | AGENT), soft-delete
Session       — better-auth managed sessions
Ticket        — subject, body, fromName, fromEmail, status, category, assignee
Reply         — body, userType (AGENT | CUSTOMER), linked to Ticket and User
```

### Ticket statuses

| Status | Meaning |
|---|---|
| `NEW` | Just received via webhook, not yet processed |
| `PROCESSING` | AI workers are running |
| `OPEN` | Awaiting agent action |
| `RESOLVED` | Agent has responded; issue considered handled |
| `CLOSED` | Fully complete; no further action needed |

### Ticket categories

| Category | Description |
|---|---|
| `GENERAL_QUESTION` | General enquiries |
| `TECHNICAL_ISSUE` | Bug reports, access issues |
| `REFUND_REQUEST` | Billing and refund requests |

---

## User Roles

| Role | Permissions |
|---|---|
| **Admin** | Seeded at deployment; creates and manages agent accounts; full access |
| **Agent** | Created by admin; handles day-to-day ticket work; cannot manage users |

---

## Shared Core Package

Zod schemas shared between client and server live in `packages/core/src/schemas/`. Import via the `@helpdesk/core` alias — never duplicate schemas:

```ts
import { createTicketSchema, listTicketsQuerySchema } from '@helpdesk/core'
```

No install step needed — `@helpdesk/core` is a workspace dependency of both `client` and `server`.
