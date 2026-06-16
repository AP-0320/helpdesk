import { Router, type Response } from 'express'
import { Role } from '@prisma/client'
import { createUserSchema, updateUserSchema } from '@helpdesk/core'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { prisma } from '../db'
import { auth } from '../auth'
import { AI_AGENT_EMAIL } from '../lib/aiAgent'

const router = Router()

function validationError(res: Response, error: { issues: Array<{ message: string }> }) {
  res.status(400).json({ error: error.issues[0].message })
}

function emailConflict(res: Response) {
  res.status(409).json({ error: 'A user with that email already exists' })
}

router.get('/', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, email: { not: AI_AGENT_EMAIL } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      emailVerified: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
}))

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) {
    validationError(res, result.error)
    return
  }

  const { name, email, password } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    emailConflict(res)
    return
  }

  const ctx = await auth.$context
  const hash = await ctx.password.hash(password)

  const user = await ctx.internalAdapter.createUser({
    name,
    email,
    emailVerified: false,
    role: Role.AGENT,
  } as any)

  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: hash,
  })

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  })
}))

router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = updateUserSchema.safeParse(req.body)
  if (!result.success) {
    validationError(res, result.error)
    return
  }

  const { name, email, password } = result.data
  const { id } = req.params as { id: string }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  if (email !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email } })
    if (conflict) {
      emailConflict(res)
      return
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { name, email },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
  })

  if (password) {
    const ctx = await auth.$context
    const hash = await ctx.password.hash(password)
    await prisma.account.updateMany({
      where: { userId: id, providerId: 'credential' },
      data: { password: hash },
    })
  }

  res.json(user)
}))

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (existing?.deletedAt !== null) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  if (existing.role === Role.ADMIN) {
    res.status(403).json({ error: 'Admin users cannot be deleted' })
    return
  }

  await prisma.$transaction([
    prisma.ticket.updateMany({ where: { assignedId: id }, data: { assignedId: null } }),
    prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
  ])
  res.status(204).end()
}))

export default router
