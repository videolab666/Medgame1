import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Мильна Хвиля',
        short_name: 'Мильна Хвиля',
        description: 'Гра для маленьких пацієнтів: мий мікробів, збирай вітаміни',
        lang: 'uk',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1f5063',
        background_color: '#ebfaf2',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: 'index.html',
        // Music, sound effects and voice are cached on first play, not precached,
        // so the first visit from a QR code stays light.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/(music|sfx|voice)\/[^/]+\.mp3$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mylna-audio',
              expiration: { maxEntries: 60 },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
});
