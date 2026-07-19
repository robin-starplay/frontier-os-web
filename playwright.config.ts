import { defineConfig, devices } from '@playwright/test';

const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const localBaseURL = 'http://127.0.0.1:3000';
const baseURL = configuredBaseURL || localBaseURL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  outputDir: '.playwright/test-results',
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: '.playwright/report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: '.playwright/report' }]],
  webServer: configuredBaseURL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1',
        url: localBaseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
  ],
});
