import * as Sentry from '@sentry/node'
import { Router } from 'express'
import { Prisma, Role, TicketStatus } from '@prisma/client'
import { z } from 'zod'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { listTicketsQuerySchema, updateTicketSchema, createReplySchema, createTicketSchema } from '@helpdesk/core'
import { prisma } from '../db'
import { requireAuth, requireStaff } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { enqueueReplyEmail, enqueueClassifyTicket, enqueueAutoResolveTicket } from '../workers'
import { getAiAgent } from '../lib/aiAgent'

const router = Router()

router.post(
  '/',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const result = createTicketSchema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0].message })
      return
    }

    const { subject, body, fromName, fromEmail } = result.data
    const aiAgent = await getAiAgent()

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        body,
        bodyHtml: '',
        fromName,
        fromEmail,
        toEmail: process.env.RESEND_FROM_EMAIL ?? 'support@helpdesk.local',
        status: 'NEW',
        assignedId: aiAgent?.id ?? null,
      },
    })

    res.status(201).json({ id: ticket.id })

    enqueueClassifyTicket(ticket.id)
    enqueueAutoResolveTicket(ticket.id)
  })
)

router.get(
  '/',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const result = listTicketsQuerySchema.safeParse(req.query)
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0].message })
      return
    }

    const { sortBy, sortOrder, status, category, search, page, pageSize } = result.data

    const where: Prisma.TicketWhereInput = {}
    if (status) {
      where.status = status
    } else {
      where.status = { notIn: [TicketStatus.NEW, TicketStatus.PROCESSING] }
    }
    if (category) where.category = category
    if (search) {
      where.OR = [
        { subject:   { contains: search, mode: 'insensitive' } },
        { fromName:  { contains: search, mode: 'insensitive' } },
        { fromEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy =
      sortBy === 'category'
        ? { category: { sort: sortOrder, nulls: 'last' as const } }
        : { [sortBy]: sortOrder }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          subject: true,
          body: true,
          bodyHtml: true,
          fromName: true,
          fromEmail: true,
          toEmail: true,
          status: true,
          category: true,
          assignedId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.ticket.count({ where }),
    ])

    res.json({
      tickets,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    })
  })
)

router.get(
  '/:id',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        subject: true,
        body: true,
        bodyHtml: true,
        fromName: true,
        fromEmail: true,
        toEmail: true,
        status: true,
        category: true,
        assignedId: true,
        assignee: { select: { id: true, name: true, email: true } },
        createdAt: true,
      },
    })
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }
    res.json(ticket)
  })
)

router.patch(
  '/:id',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const result = updateTicketSchema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0].message })
      return
    }

    const { assignedId, status, category } = result.data

    if (assignedId !== undefined && assignedId !== null) {
      const agent = await prisma.user.findUnique({
        where: { id: assignedId },
        select: { id: true, role: true, deletedAt: true },
      })
      if (!agent || agent.deletedAt !== null || agent.role !== Role.AGENT) {
        res.status(400).json({ error: 'Assignee not found' })
        return
      }
    }

    const existing = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    })
    if (!existing) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        ...(status     !== undefined && { status }),
        ...(category   !== undefined && { category }),
        ...(assignedId !== undefined && { assignedId }),
      },
      select: {
        id: true,
        subject: true,
        body: true,
        bodyHtml: true,
        fromName: true,
        fromEmail: true,
        toEmail: true,
        status: true,
        category: true,
        assignedId: true,
        assignee: { select: { id: true, name: true, email: true } },
        createdAt: true,
      },
    })
    res.json(ticket)
  })
)

router.get(
  '/:id/replies',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    })
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }

    const replies = await prisma.reply.findMany({
      where: { ticketId: req.params.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        body: true,
        bodyHtml: true,
        userType: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    })
    res.json(replies)
  })
)

router.post(
  '/:id/replies',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const result = createReplySchema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0].message })
      return
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true, fromEmail: true, fromName: true, subject: true },
    })
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }

    const userId = res.locals.session.user.id
    const reply = await prisma.reply.create({
      data: {
        body: result.data.body,
        bodyHtml: result.data.bodyHtml ?? null,
        ticketId: req.params.id,
        userId,
        userType: 'AGENT',
      },
      select: {
        id: true,
        body: true,
        bodyHtml: true,
        userType: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    })

    enqueueReplyEmail({
      to: ticket.fromEmail,
      toName: ticket.fromName,
      subject: ticket.subject,
      body: result.data.body,
      bodyHtml: result.data.bodyHtml ?? null,
    })

    res.status(201).json(reply)
  })
)

router.post(
  '/:id/summarize',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }

    const lines = [
      `Customer (${ticket.fromName}): ${ticket.body}`,
      ...ticket.replies.map((r) => {
        const author =
          r.userType === 'AGENT'
            ? `Agent (${r.user?.name ?? 'Unknown'})`
            : `Customer (${ticket.fromName})`
        return `${author}: ${r.body}`
      }),
    ].join('\n\n')

    let summary: string
    try {
      const { text } = await generateText({
        model: google('gemini-3.5-flash'),
        system:
          'You are a helpful assistant that summarizes customer support tickets. Summarize the issue and conversation history in 2–4 concise sentences.',
        prompt: `Subject: ${ticket.subject}\n\n${lines}`,
      })
      summary = text
    } catch (err) {
      Sentry.captureException(err)
      res.status(500).json({ error: 'AI service failed. Please try again.' })
      return
    }

    res.json({ summary })
  })
)

const polishSchema = z.object({
  text: z.string().trim().min(1, 'Text is required'),
  customerName: z.string().trim().min(1, 'Customer name is required'),
})

router.post(
  '/polish-reply',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const result = polishSchema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0].message })
      return
    }

    const agentName = res.locals.session.user.name as string
    const { text: draftText, customerName } = result.data

    let polishedText: string
    try {
      const { text } = await generateText({
        model: google('gemini-3.5-flash'),
        system: `You are a professional customer support writer.
Polish the given reply draft to be clear, concise, and friendly.
Always address the customer by their first name (${customerName}) at the start.
Always end the reply with this exact signature on its own lines:

Regards,
${agentName}
helpdesk.local

Return only the polished email text with no explanation.`,
        prompt: draftText,
      })
      polishedText = text
    } catch (err) {
      Sentry.captureException(err)
      res.status(500).json({ error: 'AI service failed. Please try again.' })
      return
    }

    res.json({ polishedText })
  })
)

export default router
