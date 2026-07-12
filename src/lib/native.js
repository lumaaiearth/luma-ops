// Native (Capacitor) Feinschliff — läuft nur in der verpackten iOS-/Android-App,
// im Web (PWA) ein No-op. Passt die Statusleiste ans Theme an und blendet den
// nativen Splashscreen aus, sobald React gerendert hat.
import { isNativeApp, platformName } from './platform.js'

export async function initNative() {
  if (!isNativeApp()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const dark = (localStorage.getItem('luma-theme') || 'light') !== 'light'
    // Style.Dark = helle Icons (für dunklen Grund), Style.Light = dunkle Icons.
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
    if (platformName() === 'android') {
      await StatusBar.setBackgroundColor({ color: dark ? '#080f14' : '#eef0ec' })
    }
  } catch {}
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {}
}
