import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envLocalPath = path.resolve(__dirname, '.env.local');
const isDevelopment = fs.existsSync(envLocalPath);

dotenv.config(isDevelopment ? { path: envLocalPath } : {});

// One host for the suite, the readiness probe and the server the probe waits
// for. Deriving the probe from the same value the tests navigate to keeps the
// two from drifting apart, and the trailing slash is dropped so the probe path
// cannot become `//en`.
const appURL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');

export default defineConfig({
  testDir: './tests',
  /*
    `tests/unit/` belongs to `node --test`, and Playwright's default testMatch
    (`**\/*.@(spec|test).?(c|m)[jt]s?(x)`) would otherwise collect those files and
    report "no tests found in file" for each one - a red run that says nothing
    about the product.

    The path is a directory rather than a file list so that a unit test added
    later is excluded by default instead of by remembering to update this line.
    Nothing under `tests/unit/` drives a browser, so there is nothing here for
    Playwright to run; `npm run test:unit` is the runner for those files.
  */
  testIgnore: '**/unit/**',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: appURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  // Playwright owns the server in CI too, so the suite is self-contained instead
  // of depending on an already-deployed URL: it starts the production server
  // built by the same workflow and waits for a page that actually renders.
  // Locally it still starts `next dev` and adopts whatever is on :3000.
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: `${appURL}/en`,
    // The 60s default has to cover a cold `next dev` start, which compiles the
    // first route on demand before it can answer at all.
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
