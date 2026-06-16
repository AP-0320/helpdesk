import { z } from 'zod'

export const Role = {
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
} as const

export type Role = (typeof Role)[keyof typeof Role]

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
})

export type CreateUserData = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .trim()
    .refine((v) => v === '' || v.length >= 8, {
      message: 'Password must be at least 8 characters',
    }),
})

export type UpdateUserData = z.infer<typeof updateUserSchema>
