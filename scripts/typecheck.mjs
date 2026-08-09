// Typprüfung mit klarem Geltungsbereich.
//
// TypeScript folgt Importen und prüft dadurch auch Altdateien mit, die noch
// nicht typsauber sind. Ein Lauf, der deshalb immer rot ist, ist kein Gate.
//
// Deshalb: geprüft wird alles, gescheitert wird an Befunden im
// Geltungsbereich (src/biome/). Befunde außerhalb werden gezählt und
// ausgegeben, damit sie sichtbar bleiben und nicht stillschweigend wachsen.
// Der Geltungsbereich wächst mit jeder Welle.
import { execFileSync } from 'node:child_process'

const BEREICH = 'src/biome/'

let ausgabe = ''
try {
  ausgabe = execFileSync('npx', ['tsc', '-p', 'tsconfig.json', '--noEmit'], { encoding: 'utf8' })
} catch (e) {
  ausgabe = (e.stdout || '') + (e.stderr || '')
}

const zeilen = ausgabe.split('\n').filter(z => /\(\d+,\d+\): error TS/.test(z))
const drin = zeilen.filter(z => z.startsWith(BEREICH))
const draussen = zeilen.filter(z => !z.startsWith(BEREICH))

if (draussen.length) {
  console.log(`${draussen.length} Typbefund(e) außerhalb von ${BEREICH} — nicht im Gate, aber notiert:`)
  for (const z of draussen.slice(0, 20)) console.log('  · ' + z)
  if (draussen.length > 20) console.log(`  … und ${draussen.length - 20} weitere`)
  console.log('')
}

if (drin.length) {
  console.error(`Typprüfung ROT — ${drin.length} Befund(e) in ${BEREICH}:`)
  for (const z of drin) console.error('  ✗ ' + z)
  process.exit(1)
}

console.log(`Typprüfung grün für ${BEREICH}`)
