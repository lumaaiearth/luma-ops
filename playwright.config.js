// Abnahme-Suite für den Gauntlet-Loop.
//
// Jeder gewonnene Job wandert dauerhaft hierher. Eine Regression in einem
// bereits gewonnenen Job blockiert den Merge, auch Wellen später.
//
// Browser: BIOME_CHROMIUM, falls gesetzt; sonst /opt/pw-browsers/chromium,
// wenn vorhanden (frühere Loop-Umgebung); sonst Playwrights eigenes Chromium
// (`npx playwright install chromium`, lokal unter Windows und in der CI).
// Die Suite fährt ausschließlich die lokale App.
import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const CHROMIUM = process.env.BIOME_CHROMIUM
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

const PORT = Number(process.env.BIOME_PORT || 4173)
const BASE = process.env.BIOME_BASE_URL || `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests',
  outputDir: './.playwright/results',
  // Budgets sind Teil der Aufgabe. Ein Test, der ewig warten darf, misst nichts.
  timeout: 60_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '.playwright/ergebnis.json' }],
    ['html', { outputFolder: '.playwright/bericht', open: 'never' }],
  ],
  use: {
    baseURL: BASE,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    launchOptions: {
      executablePath: CHROMIUM,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Die Crew arbeitet auf dem Telefon. Mobile Jobs werden mobil gemessen.
      name: 'mobil',
      use: { ...devices['Pixel 7'], isMobile: true, hasTouch: true },
    },
  ],
  webServer: process.env.BIOME_BASE_URL ? undefined : {
    command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
