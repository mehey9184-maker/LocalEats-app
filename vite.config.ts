import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 6000000,
        },
        manifest: {
          short_name: "LocalEats",
          name: "LocalEats | Local's Best Kota & Braai",
          icons: [
            {
              src: "/logo.png?v=2",
              type: "image/png",
              sizes: "192x192"
            },
            {
              src: "/logo.png?v=2",
              type: "image/png",
              sizes: "512x512"
            }
          ],
          start_url: ".",
          display: "standalone",
          theme_color: "#FF6B00",
          background_color: "#ffffff"
        },
        devOptions: {
          enabled: false,
          type: 'module'
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
