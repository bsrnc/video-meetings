import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// The API this app talks to. The e2e specs intercept every request to it, so
// nothing has to be listening here — but the origin has to be fixed for the
// intercept patterns to match, rather than whatever `.env.local` happens to
// hold on the machine running the tests.
export const API_URL = 'http://localhost:3101';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    // A real environment variable beats `.env.local`, so the app under test
    // always points at the origin the specs intercept. Reusing a server that
    // happens to be on this port would skip this env entirely (Playwright
    // returns before it ever launches the command), leaving the app pointed at
    // a real API and every intercept pattern missing — so it is never reused.
    env: {
      NEXT_PUBLIC_API_URL: API_URL,
      // Its own dist dir, so this server can run alongside `npm run dev:web`
      // (see the note in next.config.ts).
      NEXT_DIST_DIR: '.next-e2e',
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
