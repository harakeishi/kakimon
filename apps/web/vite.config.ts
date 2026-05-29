import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "kakimon — 君と育つモンスター",
        short_name: "kakimon",
        description: "勉強でモンスターを育てる学習アプリ",
        theme_color: "#fbbf24",
        background_color: "#fef3c7",
        display: "standalone",
        orientation: "portrait",
        lang: "ja",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,json}"],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
