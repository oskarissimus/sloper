import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 5 * 60 * 1000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !isCI,
      timeout: 30_000,
    },
    {
      command: 'cd ../backend && source venv/bin/activate && uvicorn src.main:app --port 8000',
      url: 'http://localhost:8000/docs',
      reuseExistingServer: !isCI,
      timeout: 30_000,
    },
  ],
});
