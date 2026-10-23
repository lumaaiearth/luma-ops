// Regressionstest für speicherOrt() in src/lib/speicherUrl.js
//
//   node scripts/test-speicher-url.mjs
//
// speicherOrt entscheidet, welche URLs signiert werden. Eine fremde URL, die
// fälschlich als Speicher-URL gilt, würde nicht mehr angezeigt; eine
// Speicher-URL, die nicht erkannt wird, bliebe öffentlich abrufbar.
import { speicherOrt } from '../src/lib/speicherUrl.js'
import { SUPABASE_URL } from '../src/lib/supabase.js'

let ok = 0, fehler = 0
function pruefe(bedingung, text) {
  if (bedingung) { ok++; console.log(`  ok  ${text}`) }
  else { fehler++; console.log(`  FEHLER  ${text}`) }
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const S = `${SUPABASE_URL}/storage/v1/object`

pruefe(gleich(speicherOrt(`${S}/public/job-photos/abc123/foto1.jpg`), { bucket: 'job-photos', pfad: 'abc123/foto1.jpg' }),
  'öffentliche URL → Bucket und Pfad')
pruefe(gleich(speicherOrt(`${S}/sign/job-photos/task_x/f.jpg?token=eyJ`), { bucket: 'job-photos', pfad: 'task_x/f.jpg' }),
  'bereits signierte URL → Bucket und Pfad ohne Token')
pruefe(gleich(speicherOrt(`${S}/public/job-photos/taskfile_1/Plan%20B%C3%BCro.pdf`), { bucket: 'job-photos', pfad: 'taskfile_1/Plan Büro.pdf' }),
  'kodierter Dateiname wird dekodiert')
pruefe(speicherOrt('https://lh3.googleusercontent.com/a/profilbild') === null, 'Google-Profilbild bleibt fremd')
pruefe(speicherOrt('data:image/png;base64,AAAA') === null, 'data:-URL bleibt fremd')
pruefe(speicherOrt('blob:https://luma-biome.de/1234') === null, 'blob:-URL (wartender Upload) bleibt fremd')
pruefe(speicherOrt('https://andere.supabase.co/storage/v1/object/public/job-photos/a.jpg') === null, 'anderes Supabase-Projekt bleibt fremd')
pruefe(speicherOrt(null) === null && speicherOrt(undefined) === null && speicherOrt('') === null, 'leere Werte → null')

console.log(`\n═══ Speicher-URL: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
