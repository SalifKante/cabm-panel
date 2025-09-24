// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react({ jsxRuntime: "automatic" })],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },
  server: {
    host: "127.0.0.1",
    port: 3031,
    strictPort: true,
    // HMR must point to the same host/port you actually open
    hmr: {
      host: "127.0.0.1",
      protocol: "ws",
      port: 3031,
    },
  },
});
