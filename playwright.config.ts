import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, 'server/.env') })

const TEST_DB_URL = process.env.DATABASE_TEST_URL
if (!TEST_DB_URL) {
  throw new Error('DATABASE_TEST_URL is not set in server/.env')
}

const serverEnv: Record<string, string> = {
  ...(process.env as Record<string, string>),
  DATABASE_URL: TEST_DB_URL,
  NODE_ENV: 'test',
}

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: path.resolve(__dirname, 'server'),
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: serverEnv,
    },
    {
      command: 'npm run dev',
      cwd: path.resolve(__dirname, 'client'),
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
