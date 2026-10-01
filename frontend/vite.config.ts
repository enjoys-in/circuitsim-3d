import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Frontend builds into backend/dist so FastAPI serves it at "/".
export default defineConfig({
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
