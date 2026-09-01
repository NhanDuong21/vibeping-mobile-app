import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8791',
    locale: 'vi-VN',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'target\\release\\vibeping.exe --port 8791 --data-dir .runtime\\e2e',
    url: 'http://127.0.0.1:8791/api/v1/health',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'iphone-light',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        colorScheme: 'light',
      },
    },
    {
      name: 'iphone-dark',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        colorScheme: 'dark',
      },
    },
  ],
});
