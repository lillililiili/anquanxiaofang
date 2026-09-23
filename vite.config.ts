import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: "index.html",
        design: "design-preview.html"
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      ignored: [
        "**/.venv-yolo26/**",
        "**/training/**",
        "**/output/**",
        "**/outputs/**",
        "**/server/models/**"
      ]
    },
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/ws": {
        target: "ws://127.0.0.1:8080",
        ws: true
      }
    }
  }
});
