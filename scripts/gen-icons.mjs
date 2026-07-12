// LUMA Ops — App-Icon & Splash Generator (PWA + native iOS/Android)
//
// Rendert alle Icon-/Splash-Assets aus dem LUMA-Markenzeichen:
// grünes "LU" (#001219) auf Akzentgrün (#09BE60) bzw. dunklem Grund (#080f14).
// Die "LU"-Glyphe ist als Vektorpfad gezeichnet → keinerlei Font-Abhängigkeit.
//
// Warum eigener Generator statt @capacitor/assets? Dessen gebündeltes altes sharp
// lädt libvips per GitHub-Download, was hinter Proxys scheitert. Dieser Generator
// vermisst die von `npx cap add` erzeugten Platzhalter und überschreibt sie passgenau.
//
// Nutzung:  npm i --no-save sharp && node scripts/gen-icons.mjs
//   1) PWA-Icons  → public/
//   2) Master     → assets/   (Referenz/Reproduzierbarkeit)
//   3) Nativ      → android/ und ios/  (falls per `cap add` vorhanden)

import sharp from 'sharp'
import { mkdirSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const assets = join(root, 'assets')
mkdirSync(assets, { recursive: true })

const GREEN = '#09BE60'
const INK = '#001219'
const DARK_RGBA = { r: 8, g: 15, b: 20, alpha: 1 } // #080f14 — Marken-Dunkelgrund

// "LU"-Markenzeichen als zentrierter Vektorpfad auf 1024er-Canvas.
// Strichbreite 92, runde Enden — visueller Mittelpunkt = 512/512.
const MARK = `
  <g fill="none" stroke="${INK}" stroke-width="92" stroke-linecap="round" stroke-linejoin="round">
    <path d="M242,300 L242,724 L462,724"/>
    <path d="M582,300 L582,624 Q582,724 682,724 Q782,724 782,624 L782,300"/>
  </g>`

const svgSquare = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${GREEN}"/>${MARK}</svg>`

const svgRounded = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="230" ry="230" fill="${GREEN}"/>${MARK}</svg>`

// Adaptive-Icon-Vordergrund: "LU" mit extra Rand (skaliert um den Mittelpunkt),
// damit es in Androids runder/quadratischer Sicherheitszone nicht beschnitten wird.
const svgForeground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512,512) scale(0.72) translate(-512,-512)">${MARK}</g></svg>`

const svgBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${GREEN}"/></svg>`

const renderSquare = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png()

// Splash beliebiger Größe: dunkler Grund + zentriertes grünes Tile (~42 % der kürzeren Seite).
async function splashBuf(w, h) {
  const tile = await renderSquare(svgRounded, Math.round(Math.min(w, h) * 0.42)).toBuffer()
  return sharp({ create: { width: w, height: h, channels: 4, background: DARK_RGBA } })
    .composite([{ input: tile, gravity: 'center' }]).png().toBuffer()
}
async function splashFile(w, h, out) {
  await sharp(await splashBuf(w, h)).toFile(out)
}

async function dims(file) {
  const m = await sharp(file).metadata()
  return { w: m.width, h: m.height }
}

// Alle PNGs unter dir rekursiv einsammeln.
function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (name.endsWith('.png')) acc.push(p)
  }
  return acc
}

async function pwaAndMaster() {
  await renderSquare(svgSquare, 192).toFile(join(pub, 'icon-192.png'))
  await renderSquare(svgSquare, 512).toFile(join(pub, 'icon-512.png'))
  await renderSquare(svgSquare, 180).toFile(join(pub, 'apple-touch-icon.png'))
  await renderSquare(svgSquare, 32).toFile(join(pub, 'favicon-32.png'))

  await renderSquare(svgSquare, 1024).toFile(join(assets, 'icon-only.png'))
  await renderSquare(svgForeground, 1024).toFile(join(assets, 'icon-foreground.png'))
  await renderSquare(svgBackground, 1024).toFile(join(assets, 'icon-background.png'))
  await splashFile(2732, 2732, join(assets, 'splash-dark.png'))
  console.log('✓ PWA-Icons (public/) & Master-Assets (assets/)')
}

// Native Platzhalter (von `cap add` erzeugt) passgenau überschreiben.
async function native() {
  let n = 0
  for (const dir of ['android/app/src/main/res', 'ios/App/App/Assets.xcassets']) {
    for (const file of walk(join(root, dir))) {
      const b = basename(file)
      const { w, h } = await dims(file)
      if (b.startsWith('ic_launcher_foreground')) {
        await renderSquare(svgForeground, w).toFile(file)
      } else if (b === 'ic_launcher.png' || b.startsWith('ic_launcher_round') || file.includes('AppIcon')) {
        await renderSquare(svgSquare, w).toFile(file)
      } else if (b === 'splash.png' || file.includes('Splash.imageset')) {
        await splashFile(w, h, file)
      } else {
        continue
      }
      n++
    }
  }
  console.log(n ? `✓ ${n} native Assets (android/ + ios/) überschrieben` : '– keine nativen Plattformen gefunden (cap add zuerst)')
}

async function main() {
  await pwaAndMaster()
  await native()
}

main().catch((e) => { console.error(e); process.exit(1) })
