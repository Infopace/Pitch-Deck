import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Same-origin API and uploads, so one forwarded port covers the whole
      // app and CORS never comes into it. Requires VITE_API_URL=/api/v1.
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
    // Vite 5.4.12+ rejects unknown Host headers; dev tunnels need an allowance.
    allowedHosts: [".devtunnels.ms", ".trycloudflare.com", ".ngrok-free.app"],
    // Only when tunnelling: the browser reaches the dev server over https:443,
    // so HMR must be told that. Setting it unconditionally breaks HMR on plain
    // http://localhost:3000, which would try to open a socket to port 443.
    // Run `set TUNNEL=1` (or TUNNEL=1 npm run dev) before sharing a port.
    hmr: process.env.TUNNEL ? { clientPort: 443, protocol: "wss" } : undefined,
  },
});
