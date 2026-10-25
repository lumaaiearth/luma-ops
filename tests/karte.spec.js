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
      // Das Legendenbild kommt vom GDI-Server Berlin — geprüft wird die Anfrage,
      // nicht ob der fremde Server rechtzeitig antwortet (in der CI einmal nicht).
      const legende = page.locator('[data-test=legende] [data-test=legende-versiegelung]')
      await expect(legende).toBeAttached()
      await expect(legende).toHaveAttribute('src', /REQUEST=GetLegendGraphic.*LAYER=versieg2021/)
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

    test('In /biome steht das gewählte Objekt im Inspector, nicht in einem zweiten Panel', async ({ page, isMobile }) => {
      test.skip(route !== '/biome' || isMobile, 'Inspector neben der Karte nur am Desktop')
      await page.locator('[data-test=objekte-knopf]').click()
      const panel = page.locator('[data-test=objekte-panel]')
      const baum = panel.getByText('B-0001', { exact: false }).first()
      if (!(await baum.isVisible().catch(() => false))) {
        await panel.getByText('Testkunde A', { exact: true }).click()
        await panel.getByText('Testfläche Nord', { exact: true }).first().click()
      }
      await baum.click()
      const insp = page.locator('[data-test=inspector]')
      await expect(insp.locator('[data-test=objekt-detail]')).toBeVisible()
      await expect(insp).toContainText('Tilia cordata')
      await expect(page.locator('[data-test=objekt-detail]')).toHaveCount(1)
      await expect(page.locator('[data-test=inspector-leer]')).toHaveCount(0)
      // Schließen im Inspector gibt die Auswahl frei
      await insp.getByRole('button', { name: 'Schließen' }).click()
      await expect(page.locator('[data-test=inspector-leer]')).toBeVisible()
      await expect(page.locator('[data-test=objekt-detail]')).toHaveCount(0)
    })

    test('Statusleiste in /biome nennt, was die Karte zeigt', async ({ page, isMobile }) => {
      test.skip(route !== '/biome', 'Statusleiste gibt es nur in der BIOME-Schale')
      const leiste = page.locator('[data-test=statusleiste]')
      await expect(leiste.locator('[data-test=status-grundkarte]')).toBeVisible()
      await expect(leiste.locator('[data-test=status-massstab]')).toContainText('≈ 1:')
      await expect(leiste.locator('[data-test=status-position]')).toContainText('Mitte')
      await expect(leiste).toContainText('Bestand')
      await page.locator('[data-test=ebenen-knopf]').click()
      const panel = page.locator('[data-test=ebenen-panel]')
      await panel.locator('[data-test=grundkarte-osm]').click()
      await expect(leiste.locator('[data-test=status-grundkarte]')).toContainText('OpenStreetMap')
      await panel.locator('[data-test=ebene-flurstuecke]').click()
      await expect(leiste.locator('[data-test=status-overlays]')).toContainText('1')
      await page.keyboard.press('Escape')
      if (!isMobile) {
        const b = await karte(page).boundingBox()
        await page.mouse.move(b.x + b.width / 2, b.y + b.height - 80)
        await expect(leiste.locator('[data-test=status-position]')).toContainText('Cursor')
      }
      // In der Bestandsansicht verschwinden die Kartenangaben wieder
      await page.getByRole('button', { name: 'Bestand', exact: true }).click()
      await expect(leiste.locator('[data-test=status-grundkarte]')).toHaveCount(0)
      await expect(leiste).toContainText('Standort')
    })

    test('Feldmodus: am Telefon füllt die Karte den Bildschirm', async ({ page, isMobile }) => {
      test.skip(route !== '/biome' || !isMobile, 'Feldmodus gibt es nur am Telefon in /biome')
      const ueberlaufVorher = await page.evaluate(() => document.body.style.overflow)
      await page.locator('[data-test=feldmodus-an]').click()
      const rahmen = page.locator('[data-test=karten-rahmen]')
      const vp = page.viewportSize()
      await expect.poll(async () => (await rahmen.boundingBox())?.height).toBe(vp.height)
      const b = await karte(page).boundingBox()
      expect(b.y).toBe(0)
      expect(b.height).toBe(vp.height)
      // Seite darunter scrollt nicht mit
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
      // Zeichnen funktioniert im Vollbild (Klick landet auf der Karte, nicht versetzt)
      await zurTestflaeche(page)
      await page.locator('select[title="Projekt für neue Objekte"]').selectOption('test-nord')
      await page.locator('button[title^="Baum"]').first().click()
      await klickKarte(page, 60, 80)
      await expect(page.locator('input[value="B-0002"]')).toBeVisible()
      await page.getByRole('button', { name: 'Verwerfen' }).click()
      await page.keyboard.press('Escape')
      await page.locator('[data-test=feldmodus-aus]').click()
      await expect(page.locator('[data-test=feldmodus-aus]')).toHaveCount(0)
      // Vorheriger Zustand wiederhergestellt
      expect(await page.evaluate(() => document.body.style.overflow)).toBe(ueberlaufVorher)
    })

    test('Detailpanel zeigt Feldnamen statt interner Schlüssel', async ({ page, isMobile }) => {
      test.skip(route !== '/karte-vollbild' || isMobile, 'Seitenleiste mit Objektliste nur in der Vollbild-Karte am Desktop')
      await page.getByText('Testkunde A', { exact: true }).click()
      await page.getByText('Testfläche Nord', { exact: true }).first().click()
      await page.getByText('B-0001', { exact: false }).first().click()
      await expect(page.getByText('Verkehrssicherheit (Altangabe)')).toBeVisible()
      await expect(page.getByText('Fällung empfohlen')).toBeVisible()
      await page.getByText('Projektfläche Nord', { exact: false }).first().click()
      await expect(page.getByText(/area m2/i)).toHaveCount(0)
    })

    test('Beet zeigt seine Projektfläche, die Fläche ihre Beete', async ({ page, isMobile }) => {
      test.skip(route !== '/karte-vollbild' || isMobile, 'Seitenleiste mit Objektliste nur in der Vollbild-Karte am Desktop')
      await page.getByText('Testkunde A', { exact: true }).click()
      await page.getByText('Testfläche Nord', { exact: true }).first().click()
      await page.getByText('Staudenbeet 1', { exact: false }).first().click()
      await expect(page.locator('[data-test=flaechenbezug]')).toContainText('liegt in „Projektfläche Nord“')
      await page.getByText('Projektfläche Nord', { exact: false }).first().click()
      await expect(page.locator('[data-test=flaechenbezug]')).toContainText('Beete darin')
    })

    test('Baumliste importieren und Objekte exportieren', async ({ page }) => {
      await page.locator('[data-test=austausch-knopf]').click()
      const dialog = page.locator('[data-test=austausch-dialog]')
      await expect(dialog).toBeVisible()
      // CSV mit einem Baum in der Testfläche und einem weit weg
      const csv = 'Nr;Baumart;Breite;Länge\n7;Spitz-Ahorn;52,5160;13,3775\n8;Eiche;52,40;13,10\n'
      await dialog.locator('[data-test=import-datei]').setInputFiles({ name: 'baumliste.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
      const vorschau = dialog.locator('[data-test=import-vorschau]')
      await expect(vorschau).toContainText('2 Objekte gelesen')
      await dialog.locator('[data-test=import-projekt]').selectOption('__lage__')
      await expect(vorschau).toContainText('1 Objekte liegen bei keinem Projekt')
      await dialog.locator('[data-test=import-uebernehmen]').click()
      await expect(dialog.locator('[data-test=import-ergebnis]')).toContainText('1 Objekte gespeichert')
      // Export enthält den importierten Baum
      await dialog.locator('[data-test=export-umfang]').selectOption('test-nord')
      const [download] = await Promise.all([page.waitForEvent('download'), dialog.locator('[data-test=export-csv]').click()])
      const inhalt = await (await import('node:fs/promises')).readFile(await download.path(), 'utf8')
      expect(inhalt).toContain('Spitz-Ahorn')
      expect(inhalt).toContain('B-0001')
      expect(download.suggestedFilename()).toMatch(/\.csv$/)
    })

    test('Projekt wird aus der Lage vorgeschlagen, sonst gefragt', async ({ page }) => {
      // Ohne Projektwahl in der Leiste: Baum mitten in die Testfläche setzen.
      await zurTestflaeche(page)
      await page.locator('button[title^="Baum"]').first().click()
      await klickKarte(page, 0, 0)
      await expect(page.getByText('Baum erfassen')).toBeVisible()
      await expect(page.locator('text=Testfläche Nord').first()).toBeVisible()
      // Esc wirkt im Eingabefeld bewusst nicht — erst verwerfen, dann Modus verlassen
      await page.getByRole('button', { name: 'Verwerfen' }).click()
      await page.keyboard.press('Escape')
      // Weit weg (herausgezoomt, Rand der Karte): kein Projekt → Hinweis, kein Formular
      for (let i = 0; i < 4; i++) { await page.locator('.leaflet-control-zoom-out').click(); await page.waitForTimeout(250) }
      await page.locator('select[title="Projekt für neue Objekte"]').selectOption('')
      await page.locator('button[title^="Baum"]').first().click()
      const b = await karte(page).boundingBox()
      await page.mouse.click(b.x + 40, b.y + b.height - 60)
      await expect(page.getByText('An dieser Stelle liegt kein Projekt')).toBeVisible()
      await expect(page.getByText('Baum erfassen')).toHaveCount(0)
    })

    test('Luftbild ohne Georeferenz: Rahmen auf der Karte aufziehen', async ({ page, isMobile }) => {
      test.skip(route !== '/karte-vollbild' || isMobile, 'Seitenleiste mit Drohnenbild-Knopf am Desktop')
      await page.getByText('Testkunde A', { exact: true }).click()
      await page.getByText('Testfläche Nord', { exact: true }).first().click()
      const knopf = page.getByText('Drohnenbild', { exact: false }).first()
      await knopf.scrollIntoViewIfNeeded()
      await knopf.click()
      const dialog = page.locator('[data-test=drohnenbild-dialog]')
      // 1×1-PNG ohne Georeferenz
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
      await page.locator('#drone-file-input').setInputFiles({ name: 'befliegung.png', mimeType: 'image/png', buffer: png })
      await dialog.locator('[data-test=rahmen-aufziehen]').click()
      await expect(dialog).toBeHidden()
      await klickKarte(page, -80, -50)
      await klickKarte(page, 80, 50)
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('AUF KARTE GESETZT')).toBeVisible()
      // alle vier Koordinaten eingetragen, Datei und Bezeichnung erhalten
      const werte = await dialog.locator('input[type=number]').evaluateAll(els => els.map(e => e.value))
      expect(werte.filter(Boolean)).toHaveLength(4)
      await expect(dialog.locator('input[placeholder^="z.B. Orthomosaik"]')).toHaveValue('befliegung')
    })

    test('Luftbild liegt eckgenau, nicht achsparallel', async ({ page }) => {
      // Testbild in den Fixtures: Ecken wie ein UTM-Raster leicht gedreht
      await page.locator('button[title^="Suchen"]').first().click()
      await page.locator('input[placeholder^="Adresse, Projekt"]').fill('Testfläche Süd')
      await page.getByText('Testfläche Süd').last().click()
      await page.waitForTimeout(1200)
      await page.keyboard.press('Escape')
      const bild = page.locator('img.luma-eckenbild').first()
      await expect(bild).toBeVisible()
      const lage = async () => bild.evaluate(el => {
        const m = new DOMMatrix(getComputedStyle(el).transform)
        const w = el.naturalWidth
        const ol = m.transformPoint(new DOMPoint(0, 0)), or = m.transformPoint(new DOMPoint(w, 0))
        return { is3d: !m.is2D || getComputedStyle(el).transform.startsWith('matrix3d'), breite: Math.hypot((or.x / or.w) - (ol.x / ol.w), (or.y / or.w) - (ol.y / ol.w)), schraeg: (or.y / or.w) - (ol.y / ol.w) }
      })
      const a = await lage()
      expect(a.is3d).toBe(true)
      expect(a.breite).toBeGreaterThan(20)
      // Oberkante steigt nach rechts (Nord-Ecke rechts liegt höher) — achsparallel wäre 0
      expect(a.schraeg).toBeLessThan(-0.5)
      // Nach dem Zoomen neu eingepasst: doppelt so breit
      await page.locator('.leaflet-control-zoom-in').click()
      await page.waitForTimeout(700)
      const b = await lage()
      expect(b.breite / a.breite).toBeGreaterThan(1.8)
      expect(b.breite / a.breite).toBeLessThan(2.2)
    })

    test('Zeitvergleich: zwei Befliegungen mit Schieber', async ({ page, isMobile }) => {
      await page.locator('button[title^="Suchen"]').first().click()
      await page.locator('input[placeholder^="Adresse, Projekt"]').fill('Testfläche Süd')
      await page.getByText('Testfläche Süd').last().click()
      await page.waitForTimeout(1000)
      await page.keyboard.press('Escape')
      await page.locator('[data-test=ebenen-knopf]').click()
      const abschnitt = page.locator('[data-test=vergleich-abschnitt]')
      await abschnitt.scrollIntoViewIfNeeded()
      // Vorschlag: ältere Aufnahme links, neuere rechts
      await expect(abschnitt.locator('[data-test=vergleich-a]')).toHaveValue('test-luftbild-0')
      await expect(abschnitt.locator('[data-test=vergleich-b]')).toHaveValue('test-luftbild-1')
      await abschnitt.locator('[data-test=vergleich-start]').click()
      await expect(page.locator('[data-test=vergleich]')).toBeVisible()
      const clips = () => page.locator('.luma-eckenbild-rahmen').evaluateAll(els => els.map(e => e.style.clipPath).sort())
      await expect.poll(async () => (await clips()).filter(Boolean).length).toBe(2)
      const vorher = await clips()
      // Schieber nach links: die linke Seite wird schmaler
      await page.locator('[data-test=vergleich-regler]').fill('20')
      await expect.poll(clips).not.toEqual(vorher)
      // Schwenken verschiebt den Schnitt mit (Layer-Koordinaten) — Maus-Ziehen
      // schwenkt nur am Desktop; im Telefonprofil erwartet Leaflet Touch
      if (!isMobile) {
        const nachRegler = await clips()
        const b = await karte(page).boundingBox()
        await page.mouse.move(b.x + 100, b.y + b.height - 120)
        await page.mouse.down(); await page.mouse.move(b.x + 160, b.y + b.height - 100, { steps: 5 }); await page.mouse.up()
        await expect.poll(clips).not.toEqual(nachRegler)
      }
      await page.locator('[data-test=vergleich-ende]').click()
      await expect(page.locator('[data-test=vergleich]')).toHaveCount(0)
      await expect.poll(async () => (await clips()).filter(Boolean).length).toBe(0)
    })

    test('Orthomosaik aus GeoTIFF in der App kacheln', async ({ page, isMobile }) => {
      test.skip(route !== '/karte-vollbild' || isMobile, 'Seitenleiste mit Orthomosaik-Knopf am Desktop')
      // Echtes kleines GeoTIFF in UTM 33: 400 × 300 px à 25 cm (100 m × 75 m) an der Testfläche
      const { writeArrayBuffer } = await import('geotiff')
      const w = 400, h = 300
      const pixel = new Array(w * h * 3)
      for (let i = 0; i < w * h; i++) { pixel[i * 3] = 30 + (i % w) % 200; pixel[i * 3 + 1] = 120; pixel[i * 3 + 2] = 60 }
      const tif = Buffer.from(await writeArrayBuffer(pixel, {
        width: w, height: h, BitsPerSample: [8, 8, 8], SamplesPerPixel: 3, PhotometricInterpretation: 2,
        ModelPixelScale: [0.25, 0.25, 0], ModelTiepoint: [0, 0, 0, 389800, 5819480, 0],
        ProjectedCSTypeGeoKey: 25833, GTModelTypeGeoKey: 1, GTRasterTypeGeoKey: 1,
      }))
      await page.getByText('Testkunde A', { exact: true }).click()
      await page.getByText('Testfläche Nord', { exact: true }).first().click()
      const knopf = page.getByText('Orthomosaik', { exact: false }).first()
      await knopf.scrollIntoViewIfNeeded()
      await knopf.click()
      await page.locator('[data-test=ortho-datei]').setInputFiles({ name: 'befliegung-test.tif', mimeType: 'image/tiff', buffer: tif })
      const kopf = page.locator('[data-test=ortho-kopf]')
      await expect(kopf).toContainText('EPSG:25833')
      await expect(kopf).toContainText('25.0 cm/px')
      await expect(page.locator('[data-test=ortho-maxzoom]')).toHaveValue('19')
      await expect(page.locator('[data-test=ortho-schaetzung]')).toContainText('Kacheln')
      await page.locator('[data-test=ortho-erzeugen]').click()
      // Fertig: Dialog zu, Karte fordert die neue Kachelebene an
      await expect(page.locator('[data-test=ortho-erzeugen-bereich]')).toHaveCount(0, { timeout: 30000 })
      await expect.poll(() => page.locator('img.leaflet-tile[src*="drone-tiles/test-nord/befliegung-test/"]').count(), { timeout: 15000 }).toBeGreaterThan(0)

      // Lage prüfen: an der NW-Ecke des Bildes (UTM 389800/5819480) muss die
      // Kachel der feinsten Stufe innen deckend und außen durchsichtig sein.
      const proj4 = (await import('proj4')).default
      const [lng, lat] = proj4('+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs', 'WGS84', [389800, 5819480])
      const z = 19, n = 256 * 2 ** z, s = Math.sin(lat * Math.PI / 180)
      const gx = (lng + 180) / 360 * n, gy = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n
      const pruefung = await page.evaluate(async ({ z, gx, gy }) => {
        const kacheln = window.__abnahmeKacheln
        const pixel = async (x, y) => {
          const tx = Math.floor(x / 256), ty = Math.floor(y / 256)
          const blob = [...kacheln.entries()].find(([p]) => p.endsWith(`/${z}/${tx}/${ty}.webp`) || p.endsWith(`/${z}/${tx}/${ty}.png`))?.[1]
          if (!blob) return null
          const bmp = await createImageBitmap(blob)
          const c = new OffscreenCanvas(256, 256); const g = c.getContext('2d'); g.drawImage(bmp, 0, 0)
          return [...g.getImageData(Math.floor(x - tx * 256), Math.floor(y - ty * 256), 1, 1).data]
        }
        return { anzahl: kacheln.size, innen: await pixel(gx + 6, gy + 6), aussen: await pixel(gx - 6, gy - 6) }
      }, { z, gx, gy })
      expect(pruefung.anzahl).toBeGreaterThan(5)
      expect(pruefung.innen?.[3]).toBeGreaterThan(200)       // deckend
      expect(Math.abs(pruefung.innen[1] - 120)).toBeLessThan(12)   // Grünkanal des Testbilds
      expect(pruefung.aussen === null || pruefung.aussen[3] < 20).toBe(true)
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

    test('Mitarbeitende korrigieren eigene neue Objekte, Speichern lässt sich rückgängig machen', async ({ page }) => {
      // Als Mitarbeiter-Konto neu laden (Fixture-Schalter, nur im Abnahme-Build)
      await page.evaluate(() => localStorage.setItem('luma_abnahme_rolle', 'mitarbeiter'))
      await page.reload()
      await karte(page).waitFor()
      await zurTestflaeche(page)
      await page.locator('select[title="Projekt für neue Objekte"]').selectOption('test-nord')
      const baeume = () => page.locator('.leaflet-marker-icon').count()
      const vorher = await baeume()
      // Baum setzen und speichern → Rückgängig entfernt ihn wieder
      await page.locator('button[title^="Baum"]').first().click()
      await klickKarte(page, 90, 60)
      await page.getByRole('button', { name: /Speichern/ }).first().click()
      await page.keyboard.press('Escape')
      await expect.poll(baeume).toBe(vorher + 1)
      const hinweis = page.locator('[data-test=rueckgaengig]')
      await expect(hinweis).toContainText('gespeichert')
      await hinweis.getByRole('button', { name: 'Rückgängig' }).click()
      await expect.poll(baeume).toBe(vorher)
      // Noch einmal setzen: im Bearbeiten-Modus ist nur der eigene, neue Baum verschiebbar
      await page.locator('button[title^="Baum"]').first().click()
      await klickKarte(page, 90, 60)
      await page.getByRole('button', { name: /Speichern/ }).first().click()
      await page.keyboard.press('Escape')
      await page.locator('[data-test=bearbeiten-knopf]').click()
      await expect(page.locator('[data-test=bearbeiten-hinweis]')).toContainText('1 eigene Objekte')
      await expect(page.locator('.leaflet-marker-draggable')).toHaveCount(1)
      await page.evaluate(() => localStorage.removeItem('luma_abnahme_rolle'))
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
