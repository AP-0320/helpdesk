const { config } = require('dotenv')
const { spawnSync } = require('child_process')
const { resolve } = require('path')

config({ path: resolve(process.cwd(), '.env') })
const url = process.env.DATABASE_TEST_URL
if (!url) throw new Error('DATABASE_TEST_URL not set in server/.env')

const [, , ...args] = process.argv
const result = spawnSync(args[0], args.slice(1), {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
  shell: true,
})
process.exit(result.status ?? 1)
