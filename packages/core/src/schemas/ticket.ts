import { z } from 'zod'

export const TicketStatus = {
  NEW:        'NEW',
  PROCESSING: 'PROCESSING',
  OPEN:       'OPEN',
  RESOLVED:   'RESOLVED',
  CLOSED:     'CLOSED',
} as const
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus]

export const VisibleTicketStatus = {
  OPEN:     'OPEN',
  RESOLVED: 'RESOLVED',
  CLOSED:   'CLOSED',
} as const
export type VisibleTicketStatus = (typeof VisibleTicketStatus)[keyof typeof VisibleTicketStatus]

export const TicketCategory = {
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  TECHNICAL_ISSUE: 'TECHNICAL_ISSUE',
  REFUND_REQUEST: 'REFUND_REQUEST',
} as const
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory]

export const resendInboundWebhookSchema = z.object({
  type: z.literal('email.received'),
  created_at: z.string(),
  data: z.object({
    email_id: z.string(),
    created_at: z.string(),
    from: z.string(),
    to: z.array(z.string()).min(1),
    cc: z.array(z.string()).optional().default([]),
    bcc: z.array(z.string()).optional().default([]),
    message_id: z.string().optional(),
    subject: z.string(),
    attachments: z
      .array(
        z.object({
          id: z.string(),
          filename: z.string(),
          content_type: z.string(),
        })
      )
      .optional()
      .default([]),
  }),
})
export type ResendInboundWebhookPayload = z.infer<typeof resendInboundWebhookSchema>

export const ticketSortableColumns = ['subject', 'fromName', 'fromEmail', 'status', 'category', 'createdAt'] as const

export const listTicketsQuerySchema = z.object({
  sortBy:    z.enum(ticketSortableColumns).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status:    z.enum(VisibleTicketStatus).optional(),
  category:  z.enum(TicketCategory).optional(),
  search:    z.string().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(100).default(10),
})
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>

export const ticketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  bodyHtml: z.string(),
  fromName: z.string(),
  fromEmail: z.string(),
  toEmail: z.string(),
  status: z.enum(TicketStatus),
  category: z.enum(TicketCategory).nullable(),
  assignedId: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
})
export type Ticket = z.infer<typeof ticketSchema>

export const assignTicketSchema = z.object({
  assignedId: z.string().nullable(),
})
export type AssignTicketData = z.infer<typeof assignTicketSchema>

export const updateTicketSchema = z.object({
  status:     z.enum(VisibleTicketStatus).optional(),
  category:   z.enum(TicketCategory).nullable().optional(),
  assignedId: z.string().nullable().optional(),
})
export type UpdateTicketData = z.infer<typeof updateTicketSchema>

export const createTicketSchema = z.object({
  subject:   z.string().trim().min(1, 'Subject is required'),
  body:      z.string().trim().min(1, 'Message is required'),
  fromName:  z.string().trim().min(1, 'Name is required'),
  fromEmail: z.string().trim().email('Enter a valid email'),
})
export type CreateTicketData = z.infer<typeof createTicketSchema>
