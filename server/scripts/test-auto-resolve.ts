import 'dotenv/config'
import { prisma } from '../src/db'
import { classifyTicket } from '../src/lib/classifyTicket'
import { autoResolveTicket } from '../src/lib/autoResolveTicket'

async function main() {
  const ticket = await prisma.ticket.create({
    data: {
      subject: 'How do I change my email address?',
      body: 'Hi, I recently changed my personal email and would like to update the email address on my account. How can I do that?',
      bodyHtml: '',
      fromName: 'Daniel Brooks',
      fromEmail: 'daniel.brooks@example.com',
      toEmail: 'support@helpdesk.local',
      status: 'NEW',
    },
  })

  console.log(`\nCreated ticket ${ticket.id} — status: ${ticket.status}`)
  console.log('Running classify...\n')

  await classifyTicket(ticket)

  console.log('Running auto-resolve...\n')

  await autoResolveTicket(ticket)

  const updated = await prisma.ticket.findUnique({ where: { id: ticket.id } })
  const replies = await prisma.reply.findMany({ where: { ticketId: ticket.id } })

  console.log(`\nFinal status: ${updated?.status}`)
  if (replies.length > 0) {
    console.log('\nAI reply:\n')
    console.log(replies[0].body)
  } else {
    console.log('No reply created (ticket sent to human queue).')
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
