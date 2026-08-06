import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',      // neue Version aktiviert sich automatisch
      injectRegister: 'auto',
      manifest: false,                 // vorhandenes public/manifest.json weiternutzen
      workbox: {
        navigateFallback: '/index.html',  // SPA-Routen auch offline
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // LoD2-Patches + Sonnen-Heatmaps (~13 MB) NICHT vorab laden — sie werden
        // nur in den Projektgebieten gebraucht und würden sonst bei jedem Deploy
        // das Mobilfunk-Volumen kosten. Stattdessen unten: Laden bei Bedarf.
        globIgnores: ['**/lod2/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // LoD2-Dachmodelle & Sonnen-Heatmaps: erst bei Nutzung laden,
            // danach offline verfügbar halten
            urlPattern: ({ url }) => url.pathname.startsWith('/lod2/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'luma-lod2',
              expiration: { maxEntries: 40, maxAgeSeconds: 90 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase-Daten (GET /rest) → offline letzter Stand
            urlPattern: ({ url }) => url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'luma-supabase-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase Storage (Fotos/Dateien)
            urlPattern: ({ url }) => url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/storage/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'luma-supabase-storage',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Kartenkacheln (Satellit/OSM) für die zuletzt besuchten Bereiche
            urlPattern: ({ url }) => /tile|arcgisonline|openstreetmap|basemaps/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'luma-map-tiles',
              expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
