// Abnahme Karte: die Arbeitsabläufe, die im Funktionstest vom 2026-10-24
// kaputt oder unerreichbar waren. Läuft gegen den Fixture-Build
// (VITE_BIOME_FIXTURE=1, Testprojekte aus fixtures/karte.json, Speichern
// bleibt im Browser).
import { test, expect } from '@playwright/test'

const karte = (page) => page.locator('.leaflet-container').first()
async function klickKarte(page, dx, dy) {
  const b = await karte(page).boundingBox()
  await page.mouse.click(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy)
  await page.waitForTimeout(200)
}
async function zurTestflaeche(page) {
  await page.locator('button[title^="Suchen"]').first().click()
  await page.locator('input[placeholder^="Adresse, Projekt"]').fill('Testfläche Nord')
  await page.getByText('Testfläche Nord').last().click()
  await page.waitForTimeout(1200)
  await page.keyboard.press('Escape')
}

for (const route of ['/karte-vollbild', '/biome']) {
  test.describe(`Karte ${route}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(route)
      await karte(page).waitFor()
    })

    test('Ebenen: Grundkarte und Overlays sind ohne Seitenleiste erreichbar', async ({ page }) => {
      // In /biome ist die Seitenleiste ausgeblendet — vorher gab es dort
      // keine Grundkarten- und keine Overlay-Auswahl.
      const knopf = page.locator('[data-test=ebenen-knopf]')
      await expect(knopf).toBeInViewport()
      await knopf.click()
      const panel = page.locator('[data-test=ebenen-panel]')
      await expect(panel).toBeVisible()
      await panel.locator('[data-test=grundkarte-osm]').click()
      await expect(panel.locator('[data-test=grundkarte-osm]')).toHaveAttribute('aria-checked', 'true')
      await panel.locator('[data-test=grundkarte-luftbild_berlin]').click()
      await panel.locator('[data-test=ebene-flurstuecke]').click()
      await expect(panel.locator('[data-test=ebene-flurstuecke]')).toHaveAttribute('aria-pressed', 'true')
      await expect(knopf).toContainText('1')
    })

    test('Overlay zeigt Legende und Deckkraft und bleibt nach Neuladen an', async ({ page }) => {
      await page.locator('[data-test=ebenen-knopf]').click()
      const panel = page.locator('[data-test=ebenen-panel]')
      await panel.locator('[data-test=ebene-versiegelung]').click()
      // Legende sitzt auf der Karte (unten links), nicht im Panel
      await expect(page.locator('[data-test=legende] [data-test=legende-versiegelung]')).toBeVisible()
      await panel.locator('[data-test=deckkraft-versiegelung]').fill('30')
      await page.reload()
      await karte(page).waitFor()
      await page.locator('[data-test=ebenen-knopf]').click()
      await expect(page.locator('[data-test=ebenen-panel] [data-test=ebene-versiegelung]')).toHaveAttribute('aria-pressed', 'true')
      await expect(page.locator('[data-test=ebenen-panel] [data-test=deckkraft-versiegelung]')).toHaveValue('30')
    })

    test('Projektliste und Luftbild-Upload sind in der BIOME-Ansicht erreichbar', async ({ page, isMobile }) => {
      // Vorher nur in der Seitenleiste — in /biome am Desktop gab es sie nicht.
      // (Vollbild-Karte und Telefon haben die Seitenleiste bzw. „☰ Projekte“.)
      test.skip(route !== '/biome' || isMobile, 'neu nur für /biome am Desktop')
      await page.locator('[data-test=objekte-knopf]').click()
      const panel = page.locator('[data-test=objekte-panel]')
      await expect(panel).toBeVisible()
      const drohne = panel.getByText('Drohnenbild', { exact: false }).first()
      if (!(await drohne.isVisible().catch(() => false))) {
        await panel.getByText('Testkunde A', { exact: true }).click()      // Ordner aufklappen
        await panel.getByText('Testfläche Nord', { exact: true }).first().click()
      }
      await drohne.scrollIntoViewIfNeeded()
      await drohne.click()
      await expect(page.getByText('Drohnenbild hinzufügen')).toBeVisible()
    })

    test('Werkzeugleiste passt in die Karte', async ({ page }) => {
      // Vorher lief sie in der BIOME-Schale seitlich über.
      const leiste = page.locator('[data-test=ebenen-knopf]').locator('xpath=..')
      const passt = await leiste.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      expect(passt).toBe(true)
    })

    test('Beet innerhalb einer Projektfläche zeichnen und speichern', async ({ page }) => {
      // Vorher öffnete der erste Klick das Detail der Projektfläche und
      // verschluckte den Klick — ein Beet darin ließ sich nicht zeichnen.
      await zurTestflaeche(page)
      const vorher = await page.locator('.leaflet-interactive').count()
      await page.locator('select[title="Projekt für neue Objekte"]').selectOption('test-nord')
      await page.locator('button[title^="Beet / Fläche"]').first().click()
      await klickKarte(page, -40, -30); await klickKarte(page, 40, -30); await klickKarte(page, 40, 30); await klickKarte(page, -40, 30)
      await klickKarte(page, -40, -30)
      await page.locator('input[placeholder="Beet / Fläche"]').fill('Abnahmebeet')
      await page.getByRole('button', { name: /Speichern/ }).first().click()
      await expect.poll(() => page.locator('.leaflet-interactive').count()).toBeGreaterThan(vorher)
    })

    test('Baum-Serie schlägt die nächste freie Nummer vor', async ({ page }) => {
      await zurTestflaeche(page)
      await page.locator('select[title="Projekt für neue Objekte"]').selectOption('test-nord')
      await page.locator('button[title^="Baum"]').first().click()
      await klickKarte(page, 90, 60)
      // B-0001 gibt es schon in den Testdaten.
      await expect(page.locator('input[value="B-0002"]')).toBeVisible()
    })
  })
}
