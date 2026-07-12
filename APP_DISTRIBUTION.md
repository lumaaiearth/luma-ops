# LUMA Ops als App — Verteilung

LUMA Ops läuft in **zwei Ausbaustufen** aus **einer Codebasis**:

1. **PWA (Browser-App):** `luma-biome.de` im Browser öffnen → „Zum Home-Bildschirm hinzufügen". Läuft im Vollbild, offline, mit eigenem Icon. Kostenlos, kein Store, Updates sofort beim Push auf `main`. Ideal für Mitarbeiter.
2. **Native App (Capacitor):** derselbe Web-Build, verpackt als echte iOS-/Android-App → App Store / Play Store / TestFlight / interne Verteilung. Für Store-Präsenz (v. a. kundenseitig) oder native Features.

Beides nutzt dieselben `dist/`-Dateien — es gibt **keinen zweiten Code**.

---

## Alltag: Web-Update

Nichts Neues. `npm run build`, nach `main` pushen → GitHub Pages deployt luma-biome.de. Die PWA aktualisiert sich bei den Mitarbeitern automatisch. Weil die native App denselben Web-Stand lädt, profitieren **auch installierte Apps** von Web-Updates — nur *native* Änderungen (Icons, Plugins, App-Version) brauchen einen neuen Store-Build.

---

## Native App bauen

### Voraussetzungen
- **Android:** [Android Studio](https://developer.android.com/studio) (Windows / Mac / Linux)
- **iOS:** ein **Mac** mit **Xcode** + Apple Developer Program (99 $/Jahr)

### Web-Build in die nativen Projekte kopieren
```bash
npm run sync          # = npm run build && npx cap sync
```

### Android → APK/AAB
```bash
npm run open:android  # öffnet Android Studio
```
In Android Studio: *Build → Generate Signed Bundle / APK*.
- **`.aab`** → Play Store hochladen
- **`.apk`** → direkt per Link an Mitarbeiter verteilen (Android erlaubt Installation aus unbekannter Quelle)

### iOS → App Store / TestFlight
```bash
npm run open:ios      # öffnet Xcode (nur auf dem Mac)
```
In Xcode: Signing-Team wählen (App-ID **`de.luma.ops`**), dann *Product → Archive → Distribute App*.
- **TestFlight** → interne Tester (kein öffentlicher Store nötig)
- **App Store** → öffentliche Veröffentlichung (Review ~1–3 Tage)

> Capacitor 8 nutzt für iOS den **Swift Package Manager** — kein CocoaPods/`pod install` mehr nötig.

---

## App-Icons / Splash neu erzeugen

Alle Icons werden aus dem LUMA-Markenzeichen (grünes „LU") gerendert — quellenrein, ohne externe Datei:
```bash
npm run icons         # rendert PWA- + native Icons/Splash und synct sie
```
Der Generator liegt in `scripts/gen-icons.mjs`, die Master-Assets in `assets/`.
Passt du Farben/Form an, hier ändern und `npm run icons` erneut laufen lassen.

> Hinweis: `@capacitor/assets` wird bewusst **nicht** genutzt — dessen altes gebündeltes `sharp` lädt libvips per GitHub-Download, was hinter Firmen-Proxys scheitert. Der eigene Generator vermisst die Platzhalter und überschreibt sie passgenau.

---

## Google-Kalender-Sync in der nativen App

Der Live-Sync nutzt Googles OAuth-Popup (GSI). Google **blockt diesen Login in App-internen WebViews** ("disallowed_useragent"). In der App wird der Verbinden-Button daher durch einen Hinweis ersetzt; Mitarbeiter nutzen dort den **iCal-Import** (Einstellungen → Google Kalender Import) oder verbinden einmalig über die Web-Version.

**Vollen nativen Sync später aktivieren** (optional):
1. In der [Google Cloud Console](https://console.cloud.google.com/) für das bestehende Projekt zusätzliche OAuth-Clients anlegen: **iOS** (Bundle-ID `de.luma.ops`) und **Android** (Package `de.luma.ops` + SHA-1).
2. Plugin `@codetrix-studio/capacitor-google-auth` (oder `@capacitor/browser` mit Redirect-Flow) einbauen und in `src/lib/gcal.js` / `src/lib/platform.js` einen nativen Pfad ergänzen.

Das erfordert Zugriff auf euer Google-Projekt und ist daher als Folgeschritt dokumentiert, nicht Teil dieses Setups.

---

## Was liegt wo

| Pfad | Zweck |
|---|---|
| `capacitor.config.json` | App-ID, Name, Splash-Konfiguration |
| `android/` | natives Android-Projekt (in Android Studio öffnen) |
| `ios/` | natives iOS-Projekt (in Xcode öffnen, Mac) |
| `assets/` | Master-Icons/Splash für die Generierung |
| `scripts/gen-icons.mjs` | Icon-/Splash-Generator |
| `public/manifest.json`, `public/icon-*.png` | PWA-Installation |

Kopierte Web-Assets und Build-Artefakte in `android/`/`ios/` sind bewusst per `.gitignore` ausgeschlossen — sie entstehen neu bei jedem `npx cap sync`.
