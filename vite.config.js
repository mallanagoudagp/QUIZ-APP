import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies /api/* to the local Express server (server/dev-server.js),
// so the frontend always calls a relative /api/generate path — in dev and in
// production (Vercel) alike. The LLM API key never reaches the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.PORT || 8787}`,
        changeOrigin: true
      }
    }
  }
});
