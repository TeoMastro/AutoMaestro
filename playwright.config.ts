import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'path';

// Load test credentials from .env.test.local locally; in CI rely on injected env vars.
loadEnv({ path: path.resolve(__dirname, '.env.test.local') });

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: require.resolve('./tests/global-setup.ts'),
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL },
    },
    {
      name: 'tests',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
