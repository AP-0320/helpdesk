import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const jobs = await p.$queryRaw`
  SELECT id, state, retry_count, output
  FROM pgboss.job
  WHERE name = 'classify-ticket'
  ORDER BY created_on DESC LIMIT 3
`
console.log(JSON.stringify(jobs, null, 2))

await p.$disconnect()
