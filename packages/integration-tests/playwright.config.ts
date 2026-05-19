import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// Single fixture, single browser. The plan deliberately keeps Tier 1 small:
// retries 0 in CI so flakes are visible, retries 2 locally for ergonomics.
export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node serve.mjs ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
