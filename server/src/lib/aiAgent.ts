import { prisma } from '../db'

export const AI_AGENT_EMAIL = 'ai@helpdesk.local'

export async function getAiAgent() {
  return prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } })
}
