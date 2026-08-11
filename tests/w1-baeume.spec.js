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
    // Der Tag der Nachmessung, nicht der Tag der Ersterfassung. Bis 2026-08-10
    // stand hier 14.04. neben „Jonas Feldmann" — eine Paarung, die es nie gab.
    await expect(tafel).toContainText('22.04.2026')          // Datum
    await expect(tafel).toContainText('130 cm')              // Messhöhe
    await expect(tafel).toContainText('Stammumfang mit Maßband')  // Verfahren
    await expect(tafel).toContainText('Jonas Feldmann')      // Person
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
    // Der Vorzustand trägt seine eigene Person und sein eigenes Datum.
    await expect(tafel).toContainText('Rieke Sander')
    await expect(tafel).toContainText('14.04.2026')
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
    // Nur der belegte Teil: Fernerkundung und Sensorik ersetzen die
    // Inaugenscheinnahme nicht. Ein Verlängerungsverbot behauptet BIOME nicht
    // mehr — BAUM-DE-12 lässt längere wie kürzere Intervalle ausdrücklich zu,
    // solange sie begründet und dokumentiert sind. Siehe die Runde-3-Tests.
    // Der Satz steht jetzt getrennt und ist als LUMA-Festlegung ausgewiesen:
    // keine der Quellen sagt, was die Kontrolle NICHT ersetzen kann — sie sagen
    // nur, was genügt. Siehe die Runde-4-Tests.
    await expect(page.locator('[data-test="baum-B-001"] [data-test="luma-festlegung"]'))
      .toContainText('Festlegung von LUMA, nicht aus einer Quelle')
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


/* ═══════════════════════════════════════════════════════════════════════════
   Runde 3 — Befunde des Methoden-Critics.

   Jeder dieser Tests hält eine Behauptung fest, die die Oberfläche einmal
   aufgestellt hat, ohne sie belegen zu können. Sie stehen hier, damit sie
   nicht zurückkommen.
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Runde 3 · nichts Unbelegtes auf dem Schirm', () => {
  test('keine Lagegenauigkeit ohne Bezugsebene', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    const zeile = page.locator('[data-test="baum-B-001"]')

    // „± 3 m" war frei erfunden: das Register hält ausdrücklich fest, dass für
    // die Berliner Quelle keine Meterangabe belegbar ist.
    await expect(zeile).not.toContainText('± 3')
    await expect(zeile).not.toContainText('±\u00a03')

    await zeile.getByRole('button', { name: /Herkunft des Standorts von B-001/ }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('Lagegenauigkeit')
    await expect(tafel).toContainText('keine Angabe')
    await expect(tafel).toContainText('ohne Bezugsebene')
  })

  test('der Kontrollhinweis behauptet kein Verlängerungsverbot', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    const zeile = page.locator('[data-test="baum-B-001"]')

    // BAUM-DE-12 wörtlich: „In begründeten und zu dokumentierenden Fällen
    // können jedoch sowohl längere als auch kürzere Kontrollintervalle möglich
    // sein." Ein Verlängerungsverbot gibt es also nicht.
    await expect(zeile).not.toContainText('Kontrollintervall verlängern')
    await expect(zeile).toContainText('begründeten und zu dokumentierenden Fällen')
    // Der Ersatz-Satz steht seit Runde 4 getrennt und als Festlegung von LUMA
    // beschriftet — die Quellen sagen, was genügt, nicht was nicht genügt.
    await expect(zeile.locator('[data-test="luma-festlegung"]'))
      .toContainText('als Ersatz für diese Kontrolle an')
  })

  test('die Vitalitätsstufe trägt ihr Datum in der Liste', async ({ page }) => {
    await seiteOeffnen(page)
    const b001 = page.locator('[data-test="baum-B-001"]')
    await expect(b001.locator('[data-test="vitalitaet-datum"]')).toContainText('12.05.2026')
    // Ein Baum ohne Beurteilung bekommt auch kein Datum angedichtet.
    await expect(page.locator('[data-test="baum-B-002"] [data-test="vitalitaet-datum"]')).toHaveCount(0)
  })

  test('die Vitalitätstafel nennt die fehlende Kalibrierhilfe', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', {
      name: /Herkunft der Vitalitätsstufe von B-001/,
    }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('Kalibrierung')
    await expect(tafel).toContainText('keine Vergleichsbilder')
    await expect(tafel).toContainText('12.05.2026')
    await expect(tafel).toContainText('Roloff')
  })
})

test.describe('Runde 3 · Mehrstämmigkeit', () => {
  test('B-011 zeigt den stärksten Stamm statt „keine Angabe"', async ({ page }) => {
    await seiteOeffnen(page)
    const b011 = page.locator('[data-test="baum-B-011"]')
    await expect(b011).toContainText('58 cm')
    await expect(b011.locator('[data-test="stamm-hinweis"]')).toContainText('stärkster von 3 Stämmen')
    // Der entfernte Gesamtumfang darf nirgends wieder auftauchen.
    await expect(b011).not.toContainText('74 cm')
  })

  test('die Stammtafel nennt Stammnummer, Anzahl und die maßgebliche Regel', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-011"]').getByRole('button', {
      name: /Herkunft des stärksten Stamms von B-011/,
    }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('Nr. 1 von 3 erfassten')
    await expect(tafel).toContainText('mindestens einer der Stämme')
    await expect(tafel).toContainText('nicht die Summe')
  })

  test('B-011 zählt nicht als Baum ohne Stammumfang', async ({ page }) => {
    await seiteOeffnen(page)
    await page.getByRole('button', { name: /Ohne Stammumfang/ }).click()
    await expect(page.locator('[data-test="liste-status"]')).toContainText('1 von 12')
    await expect(page.locator('[data-test="baum-B-003"]')).toBeVisible()
    await expect(page.locator('[data-test="baum-B-011"]')).toHaveCount(0)
  })

  test('eine nicht erhobene Stammform wird als nicht erhoben gezeigt', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-012"]').getByRole('button', { name: /Details zu B-012/ }).click()
    const b012 = page.locator('[data-test="baum-B-012"]')
    await expect(b012.locator('[data-test="stammform-fehlt"]')).toContainText('nicht erhoben')
    await expect(b012.locator('[data-test="stammform-fehlt"]')).toContainText('80 cm oder 50 cm')
  })

  test('eine erhobene Stammform steht als Tatsache da', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    await expect(page.locator('[data-test="baum-B-001"] [data-test="stammform"]')).toContainText('einstämmig')

    await page.locator('[data-test="baum-B-011"]').getByRole('button', { name: /Details zu B-011/ }).click()
    const b011 = page.locator('[data-test="baum-B-011"] [data-test="stammform"]')
    await expect(b011).toContainText('mehrstämmig')
    await expect(b011).toContainText('3 Stämme erfasst')
    await expect(b011).toContainText('stärkster 58 cm')
  })
})


/* ═══════════════════════════════════════════════════════════════════════════
   Runde 4 — Befunde des Methoden-Critics gegen den Stand von Runde 3.

   Der schwerste: drei von fünf Taxonschlüsseln zeigten auf eine andere Art.
   3189866 ist *Acer negundo*, nicht *Acer platanoides*. Gegen den belegten
   GBIF-Endpunkt nachgeprüft, nicht geglaubt.
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Runde 4 · Taxonschlüssel tragen ihren Nachweis', () => {
  test('die widerlegten Kennungen sind nirgends mehr zu sehen', async ({ page }) => {
    await seiteOeffnen(page)
    for (const nr of ['B-001', 'B-005', 'B-011', 'B-012']) {
      await page.locator(`[data-test="baum-${nr}"]`).getByRole('button', {
        name: new RegExp(`Herkunft des Artnamens von ${nr}`),
      }).click()
      const tafel = page.getByRole('dialog', { name: /Herkunft/ })
      const text = await tafel.innerText()
      for (const falsch of ['3189866', '5332048', '5361896']) {
        expect(text, `Widerlegte Kennung ${falsch} steht bei ${nr}`).not.toContain(falsch)
      }
      await page.keyboard.press('Escape')
    }
  })

  test('Acer platanoides trägt den aufgelösten Schlüssel samt Trefferqualität', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-005"]').getByRole('button', {
      name: /Herkunft des Artnamens von B-005/,
    }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('3189846')
    await expect(tafel).toContainText('100 von 100')
    await expect(tafel).toContainText('EXACT')
    await expect(tafel).toContainText('ACCEPTED')
    await expect(tafel).toContainText('10.08.2026')
    // Das Zitat trägt das Abrufdatum, wie die Quelle es vorschreibt.
    await expect(tafel).toContainText('accessed via GBIF.org on')
  })

  test('ein unbestimmter Baum bekommt keinen Nachweis angedichtet', async ({ page }) => {
    await seiteOeffnen(page)
    const b009 = page.locator('[data-test="baum-B-009"]')
    await expect(b009.locator('[data-test="art-unbestimmt"]')).toBeVisible()
    await expect(b009.getByRole('button', { name: /Herkunft des Artnamens/ })).toHaveCount(0)
  })
})

test.describe('Runde 4 · keine Rechtsaussage ohne Quelle', () => {
  test('nennt keine Artenschutzprüfung nach § 44', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-003"]').getByRole('button', {
      name: /Herkunft der letzten Kontrolle von B-003/,
    }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    // Das Wort kommt im gesamten Standards-Register nicht vor; § 44 enthält
    // Verbote, keinen Verfahrensschritt.
    await expect(tafel).not.toContainText('Artenschutzprüfung')
    await expect(tafel).not.toContainText('§ 44')
  })

  test('nennt stattdessen die belegte Sperrfrist samt Ausnahme', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-003"]').getByRole('button', {
      name: /Herkunft der letzten Kontrolle von B-003/,
    }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('§ 39 Abs. 5 BNatSchG')
    await expect(tafel).toContainText('1. März bis zum 30. September')
    await expect(tafel).toContainText('Gewährleistung der Verkehrssicherheit')
    // Der bundesrechtliche Grundfall wird als solcher benannt.
    await expect(tafel).toContainText('bundesrechtliche Grundfall')
  })

  test('die Vitalitätstafel nennt den Rang ihrer Quelle', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', {
      name: /Herkunft der Vitalitätsstufe von B-001/,
    }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('Verfahrensvorschlag des Urhebers')
    await expect(tafel).toContainText('keine Norm')
  })
})

test.describe('Runde 4 · Koordinaten und Bezugssystem', () => {
  test('das Bezugssystem nennt die vorgeschriebene Schreibweise', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    await page.locator('[data-test="baum-B-001"]').getByRole('button', {
      name: /Herkunft des Standorts von B-001/,
    }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('http://www.opengis.net/def/crs/EPSG/0/4326')
  })

  test('die Nachkommastellen werden nicht als Genauigkeit ausgegeben', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    await page.locator('[data-test="baum-B-001"]').getByRole('button', {
      name: /Herkunft des Standorts von B-001/,
    }).click()
    const tafel = page.getByRole('dialog', { name: /Herkunft/ })
    await expect(tafel).toContainText('Datum-Ensemble')
    await expect(tafel).toContainText('keine Aussage über die Genauigkeit')
  })
})

test.describe('Runde 4 · die Spalte sagt, was sie zeigt', () => {
  test('B-011 steht unter „Stärkster Stamm", nicht unter „Stammumfang"', async ({ page }) => {
    await seiteOeffnen(page)
    const b011 = page.locator('[data-test="baum-B-011"]')
    await expect(b011).toContainText('Stärkster Stamm')
    // Zwei Bezugsgrößen mit zwei Rechtsschwellen dürfen nicht dieselbe
    // Überschrift tragen.
    await expect(b011).not.toContainText('STAMMUMFANG')
    const b001 = page.locator('[data-test="baum-B-001"]')
    await expect(b001).toContainText('Stammumfang')
  })

  test('der Kopf nennt einen Stichtag, keinen Stand', async ({ page }) => {
    await seiteOeffnen(page)
    const kopf = page.locator('header')
    await expect(kopf).toContainText('Stichtag')
    await expect(kopf).not.toContainText('Stand ')
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   Die drei Flächen — Umbau nach dem Vorbild aus refs/design/google-earth.md.

   GE-02 trennt die Rollen: links Karteninhalt (was ist geladen), rechts
   Inspector (was ist ausgewählt), Mitte der Inhalt. GE-03 setzt die
   Provenienz permanent nach unten. Die Tests halten diese Rollentrennung
   fest — sie ist der Grund für den Umbau, nicht seine Verzierung.
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Karteninhalt · alle elf Domänen, auch die leeren', () => {
  test('nennt jede Domäne, auch die ohne Daten', async ({ page }) => {
    await seiteOeffnen(page)
    const inhalt = page.locator('[data-test="karteninhalt"]')
    await expect(inhalt).toBeVisible()
    for (const name of ['Bäume', 'Vegetationsflächen', 'Boden und Bodenleben',
      'Fauna und Habitatstrukturen', 'Klima und Sensorik', 'Fernerkundung',
      'Maßnahmen und Wirkung']) {
      await expect(inhalt).toContainText(name)
    }
  })

  test('eine leere Ebene sagt „nichts erfasst" statt zu fehlen', async ({ page }) => {
    await seiteOeffnen(page)
    // Gruppen ohne Daten sind zugeklappt — der Gruppenname steht trotzdem da.
    await page.locator('[data-test="ebenengruppe-g-vegetation"] summary').click()
    const veg = page.locator('[data-test="ebene-e-vegetation"]')
    await expect(veg).toContainText('nichts erfasst')
    // Und sie lässt sich nicht einschalten — es gibt nichts einzuschalten.
    await expect(veg.getByRole('switch')).toBeDisabled()
  })

  test('die bespielte Ebene trägt Zahl und Stichtag an der Zeile', async ({ page }) => {
    await seiteOeffnen(page)
    const baeume = page.locator('[data-test="ebene-e-baeume"]')
    await expect(baeume).toContainText('12 Bäume')
    await expect(baeume).toContainText('Stichtag')
    await expect(baeume.getByRole('switch')).toBeEnabled()
  })

  test('eine Gruppe mit sich ausschließenden Ebenen sagt das', async ({ page }) => {
    await seiteOeffnen(page)
    const boden = page.locator('[data-test="ebenengruppe-g-boden"]')
    await expect(boden).toContainText('Nur eine Ebene gleichzeitig')
  })
})

test.describe('Inspector · eine Fläche für beide Auswahlfälle', () => {
  test('sagt im Leerzustand, wozu er da ist', async ({ page }) => {
    await seiteOeffnen(page)
    await expect(page.locator('[data-test="inspector-leer"]')).toContainText('Nichts ausgewählt')
  })

  test('eine gewählte leere Ebene nennt den Grund', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="ebenengruppe-g-vegetation"] summary').click()
    await page.getByRole('button', { name: /Vegetationsflächen im Inspector öffnen/ }).click()
    const insp = page.locator('[data-test="inspector"]')
    await expect(insp).toContainText('Ebene')
    await expect(insp.locator('[data-test="ebene-leer"]')).toContainText('Welle 2')
  })

  test('ein gewählter Baum steht mit denselben Werten wie in der Liste', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    const insp = page.locator('[data-test="inspector"]')
    await expect(insp).toContainText('B-001')
    await expect(insp).toContainText('92 cm')
    await expect(insp).toContainText('VS 0')
    await expect(insp).toContainText('einstämmig')
  })

  test('auch im Inspector führt jeder Wert zu seiner Herkunft', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-001"]').getByRole('button', { name: /Details zu B-001/ }).click()
    const insp = page.locator('[data-test="inspector"]')
    // Dieselbe Regel wie in der Liste — es sind dieselben Bauteile.
    const werte = insp.locator('[data-herkunft="1"]')
    expect(await werte.count()).toBeGreaterThanOrEqual(3)
    await werte.first().click()
    await expect(page.getByRole('dialog', { name: /Herkunft/ })).toBeVisible()
  })

  test('ein mehrstämmiger Baum zeigt auch hier den stärksten Stamm', async ({ page }) => {
    await seiteOeffnen(page)
    await page.locator('[data-test="baum-B-011"]').getByRole('button', { name: /Details zu B-011/ }).click()
    const insp = page.locator('[data-test="inspector"]')
    await expect(insp).toContainText('Stärkster Stamm')
    await expect(insp).toContainText('58 cm')
    await expect(insp).toContainText('mehrstämmig')
  })
})

test.describe('Statusleiste · Provenienz permanent', () => {
  test('nennt Standort, Stichtag, Bezugssystem und Ebenenbilanz', async ({ page }) => {
    await seiteOeffnen(page)
    const leiste = page.locator('[data-test="statusleiste"]')
    await expect(leiste).toContainText('Stichtag')
    await expect(leiste).toContainText('EPSG:4326')
    // Die Bilanz sagt, wie viel vom Datenkern bespielt ist. Ohne sie wirkt
    // eine Oberfläche mit einer gefüllten Ebene vollständiger, als sie ist.
    await expect(leiste).toContainText('Ebenen mit Daten')
    await expect(leiste).toContainText('von 11')
  })
})

test.describe('Sprunglink', () => {
  test('ist erst sichtbar, wenn er den Fokus hat — und zeigt dann auf den Bestand', async ({ page }) => {
    await seiteOeffnen(page)
    const link = page.getByRole('link', { name: 'Zum Bestand springen' })

    // Ohne Fokus liegt er außerhalb des Bildschirms und stört niemanden.
    const vorher = await link.boundingBox()
    expect(vorher?.x ?? 0, 'Der Sprunglink steht sichtbar im Weg').toBeLessThan(0)

    await link.focus()
    await expect(link).toBeFocused()
    const nachher = await link.boundingBox()
    expect(nachher?.x ?? -1, 'Der Sprunglink bleibt bei Fokus unsichtbar').toBeGreaterThanOrEqual(0)

    // Und er führt an der Ebenenleiste vorbei, nicht irgendwohin.
    await expect(link).toHaveAttribute('href', '#biome-bestand')
    await expect(page.locator('#biome-bestand')).toBeVisible()
  })
})

test.describe('Eine Oberfläche, zwei Ansichten', () => {
  test('BIOME™ öffnet mit der Karte, nicht mit der Liste', async ({ page }) => {
    await page.goto('/biome')
    await page.getByRole('heading', { name: 'Karte' }).waitFor()
    await page.locator('#luma-loader').waitFor({ state: 'detached' })
    // Links und rechts bleiben dieselben Flächen — das ist der Sinn der
    // Dreiteilung: die Ansicht wechselt, der Rahmen nicht.
    await expect(page.locator('[data-test="karteninhalt"]')).toBeVisible()
    await expect(page.locator('[data-test="statusleiste"]')).toBeVisible()
    await expect(page.locator('[data-test="ansicht-karte"]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('die Karte sagt, dass sie aus einer anderen Quelle liest', async ({ page }) => {
    await page.goto('/biome')
    await page.getByRole('heading', { name: 'Karte' }).waitFor()
    await page.locator('#luma-loader').waitFor({ state: 'detached' })
    const hinweis = page.locator('[data-test="karte-hinweis"]')
    await expect(hinweis).toContainText('map_features')
    await expect(hinweis).toContainText('keine Korrekturkette')
  })

  test('der Umschalter führt ohne Seitenwechsel zum Bestand und zurück', async ({ page }) => {
    await page.goto('/biome')
    await page.getByRole('heading', { name: 'Karte' }).waitFor()
    await page.locator('#luma-loader').waitFor({ state: 'detached' })

    await page.locator('[data-test="ansicht-liste"]').click()
    await expect(page.getByRole('heading', { name: 'Baumkataster' })).toBeVisible()
    await expect(page.locator('[data-test="baum-B-001"]')).toBeVisible()
    // Kein Seitenwechsel: der Weg bleibt derselbe, es sind zwei Sichten auf
    // denselben Bestand und nicht zwei Bestände.
    expect(new URL(page.url()).pathname).toBe('/biome')

    await page.locator('[data-test="ansicht-karte"]').click()
    await expect(page.getByRole('heading', { name: 'Karte' })).toBeVisible()
  })

  test('/biome/baeume öffnet weiterhin direkt im Bestand', async ({ page }) => {
    await seiteOeffnen(page)
    await expect(page.locator('[data-test="ansicht-liste"]')).toHaveAttribute('aria-pressed', 'true')
  })
})
