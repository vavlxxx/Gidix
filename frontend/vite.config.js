import { realpathSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = realpathSync(fileURLToPath(new URL(".", import.meta.url)));
process.chdir(root);

export default defineConfig({
  root,
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("index.html", import.meta.url))
    }
  },
  optimizeDeps: {
    noDiscovery: true,
    include: ["react", "react-dom", "react-dom/client", "leaflet", "react-leaflet", "@react-leaflet/core"]
  },
  server: {
    port: 3000,
    host: "0.0.0.0"
  }
});
