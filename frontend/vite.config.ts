import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { version } from "./package.json";

// Frontend builds into backend/dist so FastAPI serves it at "/".
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/v1/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "../backend/dist",
    emptyOutDir: true,
  },
});
