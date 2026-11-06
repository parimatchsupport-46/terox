import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* base "./" — the admin panel is served from its own Vercel URL,
   hash-based router so no rewrite rules needed */
export default defineConfig({
  base: "./",
  plugins: [react()],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2018",
    assetsInlineLimit: 0,
    cssCodeSplit: false
  },
  server: { host: "0.0.0.0", port: 5174, allowedHosts: true }
});
