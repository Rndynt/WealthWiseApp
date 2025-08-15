// vite.config.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Dapatkan __dirname di modul ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  // 1) Setup plugin dasar
  const plugins = [
    react(),
    runtimeErrorOverlay(),
  ];

  // 2) Tambahkan Cartographer hanya di dev Replit
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
  ) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographer());
  }

  // 3) Kembalikan konfigurasi lengkap
  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      // Output static files ke dist/public
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,

      // Paksa menggunakan esbuild untuk JS & CSS minification
      minify: "esbuild",
      cssMinify: "esbuild",

      // Target modern environment agar import.meta & top-level await jalan
      target: "esnext",
      rollupOptions: {
        output: {
          format: "esm",
        },
      },
      chunkSizeWarningLimit: 1000
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
