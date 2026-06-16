import { z } from 'zod'

export const createReplySchema = z.object({
  body: z.string().trim().min(1, 'Reply is required'),
  bodyHtml: z.string().optional(),
})

export type CreateReplyData = z.infer<typeof createReplySchema>
