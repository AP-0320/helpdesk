import * as dotenv from 'dotenv'
import * as path from 'path'
import { execSync } from 'child_process'

dotenv.config({ path: path.resolve(__dirname, '../server/.env') })

const TEST_DB_URL = process.env.DATABASE_TEST_URL
if (!TEST_DB_URL) throw new Error('DATABASE_TEST_URL not set in server/.env')

const serverDir = path.resolve(__dirname, '../server')
const childEnv: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: TEST_DB_URL }

export default async function globalSetup(): Promise<void> {
  console.log('\n[E2E] Running migrations on test DB...')
  execSync('npx prisma migrate deploy', { cwd: serverDir, env: childEnv, stdio: 'inherit' })

  console.log('[E2E] Seeding test DB...')
  execSync('npx tsx prisma/seed.ts', { cwd: serverDir, env: childEnv, stdio: 'inherit' })

  console.log('[E2E] Test DB ready.\n')
}
