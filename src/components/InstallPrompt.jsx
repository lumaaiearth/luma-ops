import { useState, useEffect } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'
import { isNativeApp } from '../lib/platform.js'

// Dezenter „App installieren"-Hinweis für die PWA.
// - Android/Chrome: fängt das beforeinstallprompt-Event ab → echter Install-Button
// - iPhone/Safari: zeigt die Anleitung (Teilen → Zum Home-Bildschirm), da iOS
//   keinen Install-Prompt anbietet
// Wird nicht angezeigt in der nativen App, wenn bereits installiert,
// oder wenn kürzlich weggetippt.

const DISMISS_KEY = 'luma-install-dismissed'
const DISMISS_DAYS = 14

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function recentlyDismissed() {
  const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
  return ts && Date.now() - ts < DISMISS_DAYS * 24 * 3600 * 1000
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !/crios|fxios|edgios/i.test(navigator.userAgent) // nur echtes Safari kann installieren

  useEffect(() => {
    if (isNativeApp() || isStandalone() || recentlyDismissed()) return

    // Android/Desktop-Chrome: Install-Event einfangen
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // Nach erfolgreicher Installation ausblenden
    const onInstalled = () => setVisible(false)
    window.addEventListener('appinstalled', onInstalled)

    // iOS bietet kein Event → direkt anzeigen
    if (isIOS) setVisible(true)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [isIOS])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === 'accepted') setVisible(false)
    else dismiss()
  }

  if (!visible) return null

  return (
    <div
      className="lu-fade-in"
      style={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 440,
        zIndex: 9997,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 16,
        background: 'var(--luma-card)',
        border: '1px solid color-mix(in srgb, var(--luma-a) 30%, transparent)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <img
        src="/icon-192.png"
        alt="LUMA Ops"
        width={40}
        height={40}
        style={{ borderRadius: 11, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--luma-fg)' }}>
          LUMA Ops installieren
        </div>
        {isIOS ? (
          <div style={{ fontSize: 12, color: 'var(--luma-muted)', lineHeight: 1.5, marginTop: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              In Safari <Share size={13} style={{ verticalAlign: '-2px' }} /> antippen, dann
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--luma-fg)' }}>
              <Plus size={13} /> „Zum Home-Bildschirm"
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--luma-muted)', lineHeight: 1.5, marginTop: 2 }}>
            Als App aufs Handy — schneller Start, offline nutzbar.
          </div>
        )}
      </div>

      {!isIOS && (
        <button
          onClick={install}
          className="lu-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'var(--luma-a)', border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
        >
          <Download size={15} /> Installieren
        </button>
      )}

      <button
        onClick={dismiss}
        aria-label="Schließen"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--luma-muted)', cursor: 'pointer', flexShrink: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  )
}
