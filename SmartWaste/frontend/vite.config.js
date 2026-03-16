import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [react(),
  tailwindcss(),
  wasm(),
  topLevelAwait()
  ],
  css: {
    postcss: "./postcss.config.js",
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://smartwatemobile-1.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
