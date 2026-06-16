import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth, requireStaff } from '../middleware/auth'
import { asyncHandler } from '../middleware/asyncHandler'

interface StatsRow {
  total_tickets: number
  open_tickets: number
  ai_resolved_tickets: number
  ai_resolved_percent: number
  avg_resolution_time_ms: number | null
  tickets_per_day: { date: string; count: number }[]
}

const router = Router()

router.get(
  '/',
  requireAuth,
  requireStaff,
  asyncHandler(async (_req, res) => {
    const [row] = await prisma.$queryRaw<StatsRow[]>`SELECT * FROM get_dashboard_stats()`

    res.json({
      totalTickets: row.total_tickets,
      openTickets: row.open_tickets,
      aiResolvedTickets: row.ai_resolved_tickets,
      aiResolvedPercent: row.ai_resolved_percent,
      avgResolutionTimeMs: row.avg_resolution_time_ms,
      ticketsPerDay: row.tickets_per_day,
    })
  })
)

export default router
