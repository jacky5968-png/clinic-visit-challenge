import { defineConfig, devices } from '@playwright/test';
const preview = process.env.PLAYWRIGHT_PREVIEW === '1';
const baseURL = preview ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173';
export default defineConfig({
  testDir: './tests/stages-e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: 'msedge',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Edge'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: preview
      ? 'npm run preview -- --port 4173 --strictPort'
      : 'npm run dev -- --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
