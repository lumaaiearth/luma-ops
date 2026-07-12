// Plattform-Erkennung für Capacitor.
// Auf dem Web (PWA / luma-biome.de) liefert isNativeApp() false,
// in der verpackten iOS-/Android-App true.
import { Capacitor } from '@capacitor/core'

export const isNativeApp = () => Capacitor.isNativePlatform()
export const platformName = () => Capacitor.getPlatform() // 'ios' | 'android' | 'web'
