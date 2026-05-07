import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

let visualizerPlugin: Plugin | undefined;
if (process.env.ANALYZE) {
  const { visualizer } = await import("rollup-plugin-visualizer");
  visualizerPlugin = visualizer({
    open: true,
    gzipSize: true,
    brotliSize: true,
    filename: "dist/stats.html",
  }) as Plugin;
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon.png", "mask-icon.svg", "offline.html"],
      manifest: false, // 使用已有的 public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/uploads\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
    visualizerPlugin,
  ].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3721,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    cssCodeSplit: true,
    target: "es2020",
    minify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("/react-router-dom/") ||
            id.includes("/react-router/")
          ) {
            return "vendor";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          if (id.includes("zustand")) {
            return "state";
          }

          if (id.includes("axios")) {
            return "http";
          }

          if (id.includes("socket.io")) {
            return "socket";
          }

          if (id.includes("dompurify") || id.includes("marked") || id.includes("highlight.js")) {
            return "markdown";
          }
        },
      },
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1200,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "zustand", "axios"],
  },
});
