import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { auth } from '../src/auth'

const prisma = new PrismaClient()

const AI_AGENT_EMAIL = 'ai@helpdesk.local'

async function main() {
  const email = process.env.ADMIN_EMAIL!
  const password = process.env.ADMIN_PASSWORD!

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin already exists: ${email} — skipping`)
  } else {
    const ctx = await auth.$context
    const hash = await ctx.password.hash(password)

    const user = await ctx.internalAdapter.createUser({
      email,
      name: 'Admin',
      emailVerified: true,
      role: Role.ADMIN,
    } as any)

    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: hash,
    })

    console.log(`Admin seeded: ${email} (role: ${Role.ADMIN})`)
  }

  const existingAi = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } })
  if (existingAi) {
    console.log(`AI agent already exists — skipping`)
  } else {
    const ctx = await auth.$context
    await ctx.internalAdapter.createUser({
      email: AI_AGENT_EMAIL,
      name: 'AI',
      emailVerified: true,
      role: Role.AGENT,
    } as any)
    console.log(`AI agent seeded: ${AI_AGENT_EMAIL}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
