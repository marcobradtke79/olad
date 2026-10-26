import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 8787);

/** Generates the wiki's screenshots and icon images (`pnpm wiki:images`); not part of `test:e2e`. */
export default defineConfig({
  testDir: 'tests/wiki',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
    locale: 'en-US',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm build && pnpm serve:test',
    url: `http://localhost:${PORT}/config`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
