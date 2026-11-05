import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* base "./" on purpose: the same build is served from the Pages sub-path
   (/terox/user-panel/dist/) and from a plain static server, and because the
   router is hash-based no rewrite rules or 404 hacks are needed anywhere. */
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
  server: { host: "0.0.0.0", port: 5173, allowedHosts: true }
});
