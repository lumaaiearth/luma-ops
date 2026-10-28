// Abnahme Pflege → „Kalender & Planung“ (Fixture-Build).
// Die Pflege-Seite hat im Abnahme-Build keine Pflegepläne (sie liest direkt
// aus der Datenbank) — geprüft wird, dass der Reiter erreichbar ist, ohne
// Absturz rendert und die drei Bereiche zeigt. Die Logik (Zuordnung,
// Terminvorschlag, Kosten) prüfen scripts/test-pflege-kalender.mjs und
// scripts/test-kalender-ics.mjs.
import { test, expect } from '@playwright/test'

test('Pflege: Reiter „Kalender & Planung“ ist erreichbar und rendert', async ({ page }) => {
  const fehler = []
  page.on('pageerror', e => fehler.push(e.message))
  await page.goto('/pflege?tab=kalender')
  const bereich = page.locator('[data-test=pflege-kalender]')
  await expect(bereich).toBeVisible({ timeout: 15000 })
  await expect(bereich).toContainText('Google-Kalender abonniert')
  await expect(bereich).toContainText('Pflegegänge ohne Kalendertermin')
  await expect(bereich).toContainText('einplanen')
  // Admin ohne abonnierten Kalender: Eingabe für die geheime Adresse
  await expect(bereich.locator('[data-test=kalender-url]')).toBeVisible()
  expect(fehler).toEqual([])
})

test('Einstellungen: alter iCal-Import ist ersetzt, keine Adresse mehr im Browser', async ({ page }) => {
  await page.goto('/settings')
  await page.evaluate(() => localStorage.setItem('luma_gcal_url', 'https://calendar.google.com/calendar/ical/x/private-y/basic.ics'))
  await page.reload()
  await expect(page.getByText('Google Kalender abonnieren (iCal)')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('link', { name: /Kalender & Planung/ })).toHaveAttribute('href', '/pflege?tab=kalender')
  expect(await page.evaluate(() => localStorage.getItem('luma_gcal_url'))).toBeNull()
})
