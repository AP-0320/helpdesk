import { Router } from 'express'
import { Role } from '@prisma/client'
import { prisma } from '../db'
import { asyncHandler } from '../middleware/asyncHandler'
import { requireAuth, requireStaff } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, requireStaff, asyncHandler(async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null, role: Role.AGENT },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })
  res.json(agents)
}))

export default router
