import { PrismaClient } from '@prisma/client'
import 'dotenv/config'
const prisma = new PrismaClient()
const tickets = await prisma.ticket.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
console.log(JSON.stringify(tickets, null, 2))
await prisma.$disconnect()
