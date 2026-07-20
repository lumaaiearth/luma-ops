// „App aufs Handy"-Sektion für Einstellungen & Profil.
// Anders als der flüchtige InstallPrompt-Banner ist das der dauerhafte Ort:
// - Android/Chrome: echter Install-Button (beforeinstallprompt)
// - iPhone/Safari: Schritt-für-Schritt-Anleitung (Teilen → Zum Home-Bildschirm)
// - iPhone/anderer Browser: Hinweis auf Safari + Link kopieren
// - bereits installiert (PWA standalone) oder native App: Bestätigung
import { useState, useEffect } from 'react'
import { Download, Share, Plus, Copy, Check, Smartphone } from 'lucide-react'
import { isNativeApp } from '../lib/platform.js'
import { A, SURFACE, BORDER, FG, MUTED, OK, A08 } from '../lib/theme.js'
import { MONO, SANS } from './ui.jsx'

const APP_URL = 'https://luma-biome.de'

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

const UA = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const IS_IOS =
  /iphone|ipad|ipod/i.test(UA) ||
  (/Macintosh/.test(UA) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
const IS_IOS_SAFARI = IS_IOS && !/crios|fxios|edgios|opios/i.test(UA)

export default function InstallSection() {
  const [deferred, setDeferred] = useState(() => window.__lumaInstallEvent || null)
  const [installed, setInstalled] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onPrompt = () => setDeferred(window.__lumaInstallEvent || null)
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener('luma-installable', onPrompt)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('luma-installable', onPrompt)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!deferred) return
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    window.__lumaInstallEvent = null
    if (outcome === 'accepted') setInstalled(true)
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(APP_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const Row = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
      <img src="/icon-192.png" alt="LUMA Ops" width={42} height={42} style={{ borderRadius: 11, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )

  // Native Capacitor-App oder bereits installierte PWA → nur bestätigen
  if (isNativeApp() || isStandalone() || installed) {
    return (
      <Row>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: FG }}>
          <Check size={15} color={OK} /> App ist installiert
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 1.5 }}>
          Du nutzt LUMA Ops bereits als App{isNativeApp() ? ' (native Version)' : ' (vom Home-Bildschirm)'}.
        </div>
      </Row>
    )
  }

  // Android / Desktop-Chrome mit echtem Install-Event
  if (deferred) {
    return (
      <Row>
        <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>LUMA Ops als App installieren</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 1.5 }}>
          Eigenes App-Symbol, schnellerer Start, offline nutzbar.
        </div>
        <button onClick={install}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '9px 16px', borderRadius: 8, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: SANS }}>
          <Download size={15} /> Jetzt installieren
        </button>
      </Row>
    )
  }

  // iPhone/iPad in Safari: Anleitung (Apple erlaubt keinen Install-Button)
  if (IS_IOS_SAFARI) {
    return (
      <Row>
        <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>LUMA Ops zum Home-Bildschirm hinzufügen</div>
        <ol style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: MUTED, lineHeight: 1.9 }}>
          <li>Unten in Safari <Share size={13} style={{ verticalAlign: '-2px', color: FG }} /> <strong style={{ color: FG }}>Teilen</strong> antippen</li>
          <li><span style={{ color: FG, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Plus size={13} /> „Zum Home-Bildschirm"</span> wählen</li>
          <li>Oben rechts <strong style={{ color: FG }}>Hinzufügen</strong> bestätigen</li>
        </ol>
        <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 8 }}>
          Danach startet LUMA Ops wie eine normale App — ohne Browser-Leiste.
        </div>
      </Row>
    )
  }

  // iPhone/iPad in Chrome/Firefox/Edge: geht nur über Safari
  if (IS_IOS) {
    return (
      <Row>
        <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>Installieren geht auf dem iPhone nur über Safari</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3, lineHeight: 1.6 }}>
          Öffne <strong style={{ color: FG }}>{APP_URL.replace('https://', '')}</strong> in Safari,
          dann Teilen <Share size={12} style={{ verticalAlign: '-2px' }} /> → „Zum Home-Bildschirm".
        </div>
        <button onClick={copyUrl}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '8px 14px', borderRadius: 8, background: copied ? 'transparent' : A, border: copied ? `1px solid ${A}` : 'none', color: copied ? A : 'var(--luma-on-a)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: SANS }}>
          {copied ? <><Check size={14} /> Link kopiert</> : <><Copy size={14} /> Link kopieren</>}
        </button>
      </Row>
    )
  }

  // Desktop / Browser ohne Install-Event: Hinweis fürs Handy
  return (
    <Row>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: FG }}>
        <Smartphone size={15} color={A} /> Auf dem Handy installieren
      </div>
      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3, lineHeight: 1.6 }}>
        Öffne <strong style={{ color: FG }}>{APP_URL.replace('https://', '')}</strong> auf dem Handy:
        Android/Chrome zeigt einen Installieren-Button, auf dem iPhone Safari-Teilen
        <Share size={12} style={{ verticalAlign: '-2px', margin: '0 3px' }} />→ „Zum Home-Bildschirm".
        Angemeldet bleibst du in der installierten App.
      </div>
      <div style={{ marginTop: 8, padding: '6px 10px', background: A08, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: A }}>{APP_URL.replace('https://', '')}</span>
        <button onClick={copyUrl} title="Link kopieren"
          style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: copied ? OK : MUTED, cursor: 'pointer', padding: 2 }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </Row>
  )
}
