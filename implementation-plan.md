# Implementation Plan

## Phase 1 — Project Setup

- [ ] Initialize monorepo structure (`/client`, `/server`)
- [ ] Scaffold React + TypeScript
- [ ] Scaffold Express + TypeScript backend
- [ ] Set up PostgreSQL database

---

## Phase 2 — Auth & User Management

- [ ] Define `User` schema in Prisma (id, email, password hash, role: admin | agent)
- [ ] Seed script to create the initial admin account
- [ ] `POST /auth/login` — validate credentials, create database session
- [ ] `POST /auth/logout` — destroy session
- [ ] `GET /auth/me` — return current session user
- [ ] Auth middleware to protect backend routes
- [ ] Frontend login page
- [ ] Protected route wrapper in React Router
- [ ] Admin: list agents page
- [ ] Admin: create agent form (`POST /users`)
- [ ] Admin: deactivate agent

---

## Phase 3 — Tickets Core

- [ ] Define `Ticket` schema in Prisma (id, subject, body, status, category, assignee, timestamps)
- [ ] `GET /tickets` — list tickets with filtering (status, category) and sorting
- [ ] `GET /tickets/:id` — ticket detail
- [ ] `PATCH /tickets/:id` — update status, category, assignee
- [ ] Ticket list page with filter/sort controls
- [ ] Ticket detail page (read-only view for now)
- [ ] Status badge component (open / resolved / closed)
- [ ] Category label component

---

## Phase 4 — Email Integration

- [ ] Set up Resend account and configure inbound email webhook
- [ ] `POST /webhooks/inbound-email` — parse webhook payload, create ticket
- [ ] Handle duplicate detection (same email thread should not create duplicate tickets)
- [ ] `POST /tickets/:id/reply` — send reply email via Resend and record it on the ticket
- [ ] Store email thread messages on the ticket (define `Message` schema)
- [ ] Display message thread on ticket detail page

---

## Phase 5 — AI Features

- [ ] Integrate Claude API (add SDK, configure API key)
- [ ] AI classification — on ticket creation, call Claude to assign a category
- [ ] AI summary — generate a short summary of the ticket body
- [ ] AI suggested reply — generate a draft reply based on ticket content and knowledge base
- [ ] Display AI summary and suggested reply on ticket detail page
- [ ] Allow agent to edit suggested reply before sending
- [ ] Define knowledge base structure (static documents or DB table) and include in prompts

---

## Phase 6 — Dashboard

- [ ] `GET /dashboard/stats` — ticket counts by status and category
- [ ] Dashboard page with summary cards (open, resolved, closed counts)
- [ ] Ticket volume chart by category
- [ ] Recent tickets list on dashboard

---

## Phase 7 — Production Deployment

- [ ] Add production environment variables to Railway and Vercel
- [ ] Configure CORS for production frontend URL
- [ ] Run Prisma migrations against production database
- [ ] Run admin seed script on production database
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure Resend inbound webhook to point to production URL
- [ ] Smoke test end-to-end: receive email → create ticket → AI features → reply
