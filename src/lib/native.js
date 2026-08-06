// Native (Capacitor) Feinschliff — läuft nur in der verpackten iOS-/Android-App,
// im Web (PWA) ein No-op. Passt die Statusleiste ans Theme an und blendet den
// nativen Splashscreen aus, sobald React gerendert hat.
import { isNativeApp, platformName } from './platform.js'

export async function initNative() {
  if (!isNativeApp()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // Hintergrund je Theme — nicht „alles außer light ist dunkel": „Sand" ist
    // ebenfalls ein helles Theme und bekam sonst helle Icons auf hellem Grund.
    const BARS = {
      forest:   { bg: '#070d12', dark: true },
      terminal: { bg: '#000000', dark: true },
      light:    { bg: '#f4f5f6', dark: false },
      sand:     { bg: '#f8f5f0', dark: false },
    }
    const bar = BARS[localStorage.getItem('luma-theme')] || BARS.light
    // Style.Dark = helle Icons (für dunklen Grund), Style.Light = dunkle Icons.
    await StatusBar.setStyle({ style: bar.dark ? Style.Dark : Style.Light })
    if (platformName() === 'android') {
      await StatusBar.setBackgroundColor({ color: bar.bg })
    }
  } catch {}
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {}
}
