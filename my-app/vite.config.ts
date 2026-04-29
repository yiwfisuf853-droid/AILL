import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// --- Conditional bundle visualizer (only when ANALYZE=true) ---
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
  plugins: [react(), visualizerPlugin].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React core
          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("/react-router-dom/") ||
            id.includes("/react-router/")
          ) {
            return "vendor";
          }

          // Icons
          if (id.includes("lucide-react")) {
            return "icons";
          }

          // State management
          if (id.includes("zustand")) {
            return "state";
          }

          // Markdown editor is lazy-loaded; no manual chunk needed
        },
      },
    },
    // Gzip size report hint in build output
    reportCompressedSize: true,
  },
});
