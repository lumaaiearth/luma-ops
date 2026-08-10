/**
 * Abnahme Welle 1 — Bäume.
 *
 * Jeder gewonnene Job wandert dauerhaft hierher. Eine Regression blockiert den
 * Merge, auch Wellen später.
 *
 * Die Budgets sind Teil der Prüfung, nicht Beiwerk: gezählt werden echte
 * Klicks, gemessen wird die Zeit von der ersten Sicht bis zur Antwort.
 *
 * Läuft gegen den Fixture-Build (VITE_BIOME_FIXTURE=1), damit die Abnahme
 * weder die Produktionsdatenbank liest noch beschreibt. Die Zahlen stammen aus
 * fixtures/ground_truth.sql — derselben Quelle, gegen die der Daten-Critic
 * prüft.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const SEITE = '/biome/baeume'

/**
 * Öffnet die Seite und wartet, bis sie wirklich steht: Ladeschirm entfernt,
 * Überschrift da, Liste gefüllt. Ohne das misst man den Aufbauzustand.
 */
async function seiteOeffnen(page) {
  await page.goto(SEITE)
  await page.getByRole('heading', { name: 'Baumkataster' }).waitFor()
  await page.locator('#luma-loader').waitFor({ state: 'detached' })
  await page.locator('[data-test="liste"] > div').first().waitFor()
}

/** Zählt Klicks mit, damit das Budget gemessen und nicht geschätzt wird. */
function klickzaehler() {
  let n = 0
  return {
    async klick(locator) { n++; await locator.click() },
    get anzahl() { return n },
  }
}

test.describe('w1-faellige-kontrollen · Bezirksamt Grünflächen', () => {
  test('nennt fünf Bäume ohne Kontrolle 2026 und hält 3 Klicks / 30 s', async ({ page }) => {
    const z = klickzaehler()
    const start = Date.now()

    await seiteOeffnen(page)

    // Die Zahl steht ohne Klick da.
    await expect(page.locator('[data-test="anzahl-offen"]')).toHaveText('5')
    await expect(page.locator('[data-test="anzahl-nie"]')).toHaveText('1')

    // Ein Klick auf den Filter liefert die Liste.
    await z.klick(page.locator('[data-test="filter-ohne_kontrolle"]'))

    for (const nr of ['B-002', 'B-005', 'B-008', 'B-011', 'B-012']) {
      await expect(page.locator(`[data-test="baum-${nr}"]`)).toBeVisible()
    }
    // Und niemanden sonst.
    await expect(page.locator('[data-test="liste"] > div')).toHaveCount(5)

    const sekunden = (Date.now() - start) / 1000
    expect(z.anzahl, `Klickbudget: ${z.anzahl} von 3`).toBeLessThanOrEqual(3)
    expect(sekunden, `Zeitbudget: ${sekunden.toFixed(1)} s von 30`).toBeLessThanOrEqual(30)
  })

  test('unterscheidet noch nie kontrolliert von keine Kontrolle in diesem Jahr', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="filter-ohne_kontrolle"]').click()

    // B-012 war noch nie dran — das ist ein anderer Sachverhalt als überfällig.
    await expect(page.locator('[data-test="baum-B-012"]').locator('[data-test="nie-kontrolliert"]'))
      .toHaveText('noch nie kontrolliert')

    // B-002 hat eine Historie, nur nicht in diesem Jahr.
    const b002 = page.locator('[data-test="baum-B-002"]')
    await expect(b002).toContainText('03.06.2025')
    await expect(b002).toContainText('keine Kontrolle in 2026')
    await expect(b002.locator('[data-test="nie-kontrolliert"]')).toHaveCount(0)
  })

  test('die Zahl trägt Bestand, Zeitraum und Stichtag bei sich', async ({ page }) => {
    await seiteOeffnen(page)
    const karte = page.locator('text=Dokumentierte Kontrollen 2026').locator('..')
    await expect(karte).toContainText('Marzahner Promenade Nord')
    await expect(karte).toContainText('01.01.2026')
    await expect(karte).toContainText('09.08.2026')
  })

  test('leitet aus dem Fehlen einer Kontrolle keinen Zustand ab', async ({ page }) => {
    await seiteOeffnen(page)
    const text = await page.locator('body').innerText()
    for (const verboten of ['gefährlich', 'nicht verkehrssicher', 'Fällung empfohlen', 'Gefahr im Verzug']) {
      expect(text, `Die Seite behauptet „${verboten}"`).not.toContain(verboten)
    }
  })
})

test.describe('w1-zahl-herkunft · ESG-Verantwortliche', () => {
  test('führt in zwei Klicks auf Quelle, Datum, Methode und Person', async ({ page }) => {
    const z = klickzaehler()
    const start = Date.now()

    await seiteOeffnen(page)
    await z.klick(page.locator('[data-test="baum-B-007"]').getByRole('button', {
      name: /Herkunft des Stammumfangs von B-007/,
    }))

    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toBeVisible()

    // Der gültige Wert, nicht der ersetzte.
    await expect(tafel).toContainText('85 cm')
    await expect(tafel).toContainText('14.04.2026')          // Datum
    await expect(tafel).toContainText('130 cm')              // Messhöhe
    await expect(tafel).toContainText('Stammumfang mit Maßband')  // Verfahren
    await expect(tafel).toContainText('Rieke Sander')        // Person
    await expect(tafel).toContainText('Baumschutzverordnung') // Quelle

    const sekunden = (Date.now() - start) / 1000
    expect(z.anzahl, `Klickbudget: ${z.anzahl} von 2`).toBeLessThanOrEqual(2)
    expect(sekunden, `Zeitbudget: ${sekunden.toFixed(1)} s von 20`).toBeLessThanOrEqual(20)
  })

  test('zeigt die Korrektur mit Vorzustand und Grund', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-007"]').getByRole('button', {
      name: /Herkunft des Stammumfangs von B-007/,
    }).click()

    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('Dieser Wert wurde korrigiert')
    await expect(tafel).toContainText('850 cm')
    await expect(tafel).toContainText('Zahlendreher')
    await expect(tafel).toContainText('nicht gelöscht')
  })

  test('zeigt in der Liste den korrigierten Wert, nicht den ersetzten', async ({ page }) => {
    await seiteOeffnen(page)
    const zeile = page.locator('[data-test="baum-B-007"]')
    await expect(zeile).toContainText('85 cm')
    await expect(zeile).not.toContainText('850 cm')
  })
})

test.describe('Datenregeln', () => {
  test('ein fehlender Stammumfang erscheint als fehlend, nicht als 0', async ({ page }) => {
    await seiteOeffnen(page)
    const b003 = page.locator('[data-test="baum-B-003"]')
    await expect(b003).toContainText('keine Angabe')
    // Kein Wert heißt: keine Zahl und keine Schaltfläche dorthin.
    await expect(b003.getByRole('button', { name: /Herkunft des Stammumfangs/ })).toHaveCount(0)
    await expect(b003).not.toContainText('0 cm,')
  })

  test('eine unbestimmte Art wird als unbestimmt gezeigt, nicht geraten', async ({ page }) => {
    await seiteOeffnen(page)
    await expect(page.locator('[data-test="baum-B-009"]').locator('[data-test="art-unbestimmt"]'))
      .toHaveText('Art unbestimmt')
  })

  test('der Bestand umfasst genau zwölf Bäume', async ({ page }) => {
    await seiteOeffnen(page)
    await expect(page.locator('[data-test="liste"] > div')).toHaveCount(12)
  })

  test('jeder angezeigte Stammumfang nennt seine Messhöhe', async ({ page }) => {
    await seiteOeffnen(page)
    // Die Messhöhe steht am einzelnen Wert, nicht in der Spaltenüberschrift:
    // sie ist eine Eigenschaft der Messung, nicht der Spalte.
    await expect(page.locator('[data-test="baum-B-001"]')).toContainText('92 cm @ 130 cm')
  })
})

test.describe('Recht', () => {
  test('sagt an jedem Baum, dass Analytik die Regelkontrolle nicht ersetzt', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    await expect(page.locator('[data-test="baum-B-001"]'))
      .toContainText('visuelle Inaugenscheinnahme durch eine fachlich qualifizierte Person')
    await expect(page.locator('[data-test="baum-B-001"]'))
      .toContainText('weder ersetzen noch ein Kontrollintervall verlängern')
  })

  test('führt keine nicht belegte Zustandsskala', async ({ page }) => {
    await seiteOeffnen(page)
    const text = await page.locator('body').innerText()
    // Die entfernte Skala und ihre Bezeichnungen dürfen nicht zurückkommen.
    for (const verboten of ['Mäßige Einschränkung', 'Starke Einschränkung', 'FLL-Zustandsstufe', 'EPS-Befall']) {
      expect(text, `Nicht belegte Bezeichnung „${verboten}" ist zurück`).not.toContain(verboten)
    }
  })

  test('nennt bei jeder Vitalitätsangabe die Quelle', async ({ page }) => {
    await seiteOeffnen(page)
    // B-001 trägt VS 0; die Stufenbezeichnung stammt wörtlich aus der Quelle.
    await expect(page.locator('[data-test="baum-B-001"]')).toContainText('VS 0 · vollkommen vital')
  })
})

test.describe('Zugänglichkeit', () => {
  test('keine axe-Verstöße nach WCAG 2.1 AA', async ({ page }) => {
    await seiteOeffnen(page)

    const ergebnis = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const befunde = ergebnis.violations.map(v => `${v.id} (${v.nodes.length}×): ${v.help}`)
    expect(befunde, befunde.join('\n')).toEqual([])
  })

  test('ist mit der Tastatur bedienbar', async ({ page }) => {
    await seiteOeffnen(page)

    // Bis zum ersten Filter tabben und ihn mit der Tastatur auslösen.
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab')
      const test = await page.evaluate(() => document.activeElement?.getAttribute('data-test'))
      if (test === 'filter-ohne_kontrolle') break
    }
    const fokus = await page.evaluate(() => document.activeElement?.getAttribute('data-test'))
    expect(fokus, 'Der Filter ist per Tastatur nicht erreichbar').toBe('filter-ohne_kontrolle')

    await page.keyboard.press('Enter')
    await expect(page.locator('[data-test="liste"] > div')).toHaveCount(5)
  })

  test('Tippziele sind mindestens 44 px hoch', async ({ page }) => {
    await seiteOeffnen(page)
    const knoepfe = page.getByRole('button', { name: /Details zu / })
    const n = await knoepfe.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) {
      const box = await knoepfe.nth(i).boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('Runde 2 · was die Critics beanstandet haben', () => {
  test('macht aus dem Kalenderjahr keine Fälligkeitsaussage', async ({ page }) => {
    await seiteOeffnen(page)
    // Der Hinweistext selbst enthält das Wort „Fälligkeitsaussage" — er wird
    // hier ausgenommen, geprüft wird alles andere.
    const text = await page.evaluate(() => {
      const kopie = document.body.cloneNode(true)
      kopie.querySelectorAll('[data-test="kein-faelligkeitsurteil"]').forEach(el => el.remove())
      return kopie.innerText
    })
    // „offen" war eine Fälligkeitsaussage, die kein Dokument deckt.
    expect(text, 'Das Wort „offen" ist zurück').not.toMatch(/\boffen\b/i)
    expect(text, 'Die Seite behauptet eine Fälligkeit').not.toMatch(/fällig/i)
    expect(text).not.toMatch(/überfällig/i)
    // Und die Seite sagt ausdrücklich, was sie nicht behauptet.
    await expect(page.locator('[data-test="kein-faelligkeitsurteil"]'))
      .toContainText('keine Fälligkeitsaussage')
    await expect(page.locator('[data-test="kein-faelligkeitsurteil"]'))
      .toContainText('nicht nach dem Kalenderjahr')
  })

  test('jeder angezeigte Wert führt zu seiner Herkunft', async ({ page }) => {
    await seiteOeffnen(page)
    const zeile = page.locator('[data-test="baum-B-001"]')
    for (const was of ['Artnamens', 'Stammumfangs', 'letzten Kontrolle', 'Vitalitätsstufe']) {
      const knopf = zeile.getByRole('button', { name: new RegExp(`Herkunft (des|der) ${was}`) })
      await expect(knopf, `${was} hat keinen Weg zur Herkunft`).toHaveCount(1)
      await knopf.click()
      const tafel = page.getByRole('dialog', { name: /Herkunft/ })
      await expect(tafel).toBeVisible()
      // Jede Herkunft nennt Verfahren und Person — oder sagt, dass sie fehlen.
      await expect(tafel).toContainText('Verfahren')
      await expect(tafel).toContainText('Person')
      await page.keyboard.press('Escape')
      await expect(tafel).toHaveCount(0)
    }
  })

  test('auch Pflanzjahr und Koordinate sind rückverfolgbar', async ({ page }) => {
    await seiteOeffnen(page)
    const zeile = page.locator('[data-test="baum-B-001"]')
    await zeile.getByRole('button', { name: /Details zu B-001/ }).click()
    for (const was of ['des Pflanzjahrs', 'des Standorts']) {
      const knopf = zeile.getByRole('button', { name: new RegExp(`Herkunft ${was}`) })
      await expect(knopf, `${was} hat keinen Weg zur Herkunft`).toHaveCount(1)
    }
  })

  test('nennt die Art der Kontrolle', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    await expect(page.locator('[data-test="baum-B-001"]')).toContainText('Regelkontrolle')
  })

  test('kennzeichnet den deutschen Namen als nicht normiert', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    await expect(page.locator('[data-test="baum-B-001"]')).toContainText('nicht normiert, ohne Quelle')
  })

  test('sagt beim Artnamen, dass die Trefferqualität fehlt', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Herkunft des Artnamens/ }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('Trefferqualität')
    await expect(tafel).toContainText('keine Angabe')
    await expect(tafel).toContainText('10.15468/39omei')
  })

  test('der Herunterladen-Knopf sagt, wie viele Zeilen die Datei bekommt', async ({ page }) => {
    await seiteOeffnen(page)
    await expect(page.locator('[data-test="export"]')).toContainText('(12)')
    await page.locator('[data-test="filter-ohne_kontrolle"]').click()
    await expect(page.locator('[data-test="export"]')).toContainText('(5)')
  })

  test('die Herkunftstafel hält den Fokus und schließt mit Escape', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-007"]').getByRole('button', { name: /Herkunft des Stammumfangs/ }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toBeVisible()
    // Der Fokus liegt im Dialog und bleibt beim Tabben darin.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const drin = await page.evaluate(() => !!document.activeElement?.closest('[data-test="herkunftstafel"]'))
      expect(drin, 'Der Fokus ist aus dem Dialog gesprungen').toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(tafel).toHaveCount(0)
  })
})
