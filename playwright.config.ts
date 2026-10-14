import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 8787);
const EXAMPLES_PORT = 5173;

export default defineConfig({
  testDir: 'tests/e2e',
  // Tests share one test server whose data the save cycle mutates: run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'pnpm build && pnpm serve:test',
      url: `http://localhost:${PORT}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `pnpm exec vite --port ${EXAMPLES_PORT} --strictPort`,
      url: `http://localhost:${EXAMPLES_PORT}/examples/`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
