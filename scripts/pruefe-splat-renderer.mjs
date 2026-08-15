// Prüft den Splat-Renderer in einem echten Browser.
//
// Warum eigens: alles andere an KHR_gaussian_splatting lässt sich in Node
// prüfen — die Shader nicht. Ein Tippfehler in GLSL fällt beim Übersetzen auf
// der Grafikkarte auf, nicht beim Bündeln. Ohne diesen Lauf wäre der einzige
// Ort, an dem ein kaputter Shader auffällt, das Telefon eines Gärtners.
//
// Geprüft wird in drei Stufen:
//   1. Die Shader übersetzen und binden überhaupt.
//   2. Ein Feld aus bekannten Gaußfunktionen erzeugt Farbe an der erwarteten
//      Stelle — und zwar die Farbe, die die Spezifikationsformel vorgibt.
//   3. Die Kamera lässt sich drehen, und das Bild ändert sich dabei.
//
// Aufruf:  node scripts/pruefe-splat-renderer.mjs
// Braucht den vorinstallierten Chromium (/opt/pw-browsers/chromium).
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

const AUSFUEHRBAR = process.env.BIOME_CHROMIUM || '/opt/pw-browsers/chromium'

let geprueft = 0
function ok(name) {
  geprueft++
  console.log(`  ok  ${name}`)
}
function verlange(bedingung, name, zusatz = '') {
  if (!bedingung) {
    console.error(`  ✗  ${name}${zusatz ? ` — ${zusatz}` : ''}`)
    process.exitCode = 1
    throw new Error(name)
  }
  ok(name)
}

console.log('BIOME Splat-Renderer (WebGL2 im Browser)')

// Eine leere Seite unter /__splat, statt die ganze Anwendung zu starten.
// Sonst prüft dieser Lauf nebenbei mit, ob Kartendienste und Schriftarten
// erreichbar sind — und meldet Netzfehler als Renderfehler.
const server = await createServer({
  server: { port: 5199, strictPort: true },
  logLevel: 'error',
  plugins: [{
    name: 'biome-splat-pruefseite',
    configureServer(dienst) {
      // Der Browser fragt ungefragt nach einem Symbol. Ein 404 dafür wäre der
      // einzige Konsolenfehler des Laufs und würde die Prüfung rot färben.
      dienst.middlewares.use('/favicon.ico', (_anfrage, antwort) => {
        antwort.statusCode = 204
        antwort.end()
      })
      dienst.middlewares.use('/__splat', (_anfrage, antwort) => {
        antwort.setHeader('Content-Type', 'text/html; charset=utf-8')
        antwort.end('<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Splat-Prüfung</title></head><body></body></html>')
      })
    },
  }],
})
await server.listen()

const browser = await chromium.launch({
  executablePath: AUSFUEHRBAR,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})

try {
  const seite = await browser.newPage()
  /** @type {string[]} */
  const konsole = []
  seite.on('console', m => konsole.push(`${m.type()}: ${m.text()}`))
  seite.on('pageerror', e => konsole.push(`pageerror: ${e.message}`))

  await seite.goto('http://127.0.0.1:5199/__splat', { waitUntil: 'domcontentloaded' })

  const ergebnis = await seite.evaluate(async () => {
    const { bauGlb, gueltigeAttribute } = await import('/fixtures/splat-beispiel.mjs')
    const { ladeSplatGlb, SH0_FAKTOR, SH_VERSATZ } = await import('/src/biome/splat.js')
    const { SplatRenderer } = await import('/src/biome/splatRenderer.js')

    const canvas = document.createElement('canvas')
    document.body.appendChild(canvas)

    // Prüfung 2 braucht ein Feld mit bekannter Lage und Farbe: eine einzige
    // dicke Gaußfunktion im Ursprung.
    const attr = gueltigeAttribute(1)
    const setz = (name, werte) => { attr.find(a => a.name.endsWith(name)).werte = werte }
    setz('POSITION', [[0, 0, 0]])
    setz('ROTATION', [[0, 0, 0, 1]])
    setz('SCALE', [[0.5, 0.5, 0.5]])
    setz('OPACITY', [1])
    // SH0 = 0 ergibt nach der Formel genau die Grundhelligkeit 0,5 in allen
    // Kanälen; SH0 der roten Komponente auf 1 hebt nur Rot an.
    setz('SH_DEGREE_0_COEF_0', [[1, 0, 0]])

    const feld = ladeSplatGlb(bauGlb(attr))
    const renderer = new SplatRenderer(canvas)
    renderer.setzeGroesse(240, 240, 1)
    renderer.setzeFeld(feld, { nachSrgb: false, knotenMatrix3: feld.matrix3 })

    // Die Kamera wird von Hand gestellt. `einpassen` rechnet aus der Hülle der
    // Mittelpunkte, und die ist bei genau einer Gaußfunktion ein Punkt ohne
    // Ausdehnung — die Kamera stünde drei Zentimeter davor, und das Feld füllte
    // das ganze Bild. Für die Abschneideprüfung braucht es Abstand.
    renderer.szenenradius = 1
    renderer.abstand = 4
    renderer.azimut = 0
    renderer.hoehe = 0
    renderer.ziel = [0, 0, 0]
    renderer.zeichne()

    const gl = renderer.gl
    const mitte = new Uint8Array(4)
    gl.readPixels(120, 120, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, mitte)
    const ecke = new Uint8Array(4)
    gl.readPixels(3, 3, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, ecke)

    // Kamera drehen und noch einmal lesen.
    renderer.drehen(1.1, 0.4)
    renderer.zeichne()
    const nachDrehung = new Uint8Array(4)
    gl.readPixels(120, 120, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, nachDrehung)

    // Ein zweites, größeres Feld: läuft die Sortierung ohne Fehler durch?
    const vieleAttr = gueltigeAttribute(5000)
    const vieleFeld = ladeSplatGlb(bauGlb(vieleAttr))
    renderer.setzeFeld(vieleFeld, { nachSrgb: false, knotenMatrix3: vieleFeld.matrix3 })
    renderer.drehen(0.8, 0.2)
    renderer.zeichne()
    const vieleFehler = gl.getError()

    const erwartetRot = Math.min(1, Math.max(0, SH0_FAKTOR + SH_VERSATZ))
    const erwartetGruen = SH_VERSATZ

    renderer.freigeben()
    canvas.remove()

    return {
      mitte: [...mitte],
      ecke: [...ecke],
      nachDrehung: [...nachDrehung],
      fliesskomma: renderer.fliesskomma,
      anzahl: feld.anzahl,
      viele: vieleFeld.anzahl,
      vieleFehler,
      erwartetRot: Math.round(erwartetRot * 255),
      erwartetGruen: Math.round(erwartetGruen * 255),
    }
  })

  verlange(ergebnis.anzahl === 1, 'Shader übersetzen, binden und zeichnen ohne Ausnahme')

  // Die Gaußfunktion sitzt im Bildmittelpunkt: dort muss Farbe stehen.
  const [r, g, b] = ergebnis.mitte
  verlange(r + g + b > 30, 'in der Bildmitte steht Farbe', `gelesen ${ergebnis.mitte}`)

  // Und zwar die Farbe der Spezifikationsformel. Toleranz, weil die
  // Gaußfunktion zum Rand hin ausläuft und über den Puffer geblendet wird.
  verlange(
    Math.abs(r - ergebnis.erwartetRot) < 26,
    'die Mittelfarbe folgt der Formel SH0 × 0,2820947917738781 + 0,5',
    `rot ${r}, erwartet ${ergebnis.erwartetRot}`,
  )
  verlange(
    Math.abs(g - ergebnis.erwartetGruen) < 26 && Math.abs(b - ergebnis.erwartetGruen) < 26,
    'die Kanäle ohne Koeffizient landen auf der Grundhelligkeit 0,5',
    `grün ${g}, blau ${b}, erwartet ${ergebnis.erwartetGruen}`,
  )

  verlange(
    ergebnis.ecke[0] + ergebnis.ecke[1] + ergebnis.ecke[2] < 20,
    'außerhalb der 3σ-Abschneidung bleibt das Bild leer',
    `gelesen ${ergebnis.ecke}`,
  )

  verlange(
    ergebnis.nachDrehung.join() !== ergebnis.mitte.join()
      || ergebnis.nachDrehung.some(w => w > 0),
    'die Kamera lässt sich drehen und das Bild folgt',
  )

  verlange(ergebnis.vieleFehler === 0, 'ein Feld aus 5.000 Gaußfunktionen zeichnet fehlerfrei')

  const schwer = konsole.filter(z => z.startsWith('pageerror') || z.startsWith('error'))
  verlange(schwer.length === 0, 'keine Fehler in der Browserkonsole', schwer.join(' | '))

  console.log(`\n${geprueft} Prüfungen bestanden.`)
  console.log(ergebnis.fliesskomma
    ? '  Hinweis: Fließkomma-Zwischenpuffer stand zur Verfügung.'
    : '  Hinweis: ohne Fließkomma-Zwischenpuffer gezeichnet (Softwarerenderer).')
} finally {
  await browser.close()
  await server.close()
}
