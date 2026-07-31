import { defineConfig } from "vite";
import electron from "vite-plugin-electron";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  plugins: [
    electron([
      {
        // Main process entry file - use absolute path since root is different
        entry: path.resolve(__dirname, "electron/main.ts"),
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron"),
            rollupOptions: {
              external: ["electron", "electron-squirrel-startup", "electron-store"],
            },
          },
        },
      },
      {
        // Preload script - use absolute path
        entry: path.resolve(__dirname, "electron/preload.ts"),
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron"),
            lib: {
              entry: path.resolve(__dirname, "electron/preload.ts"),
              formats: ["cjs"],
              fileName: () => "preload.js",
            },
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
        onstart(options) {
          // Notify the Electron main process to reload
          options.reload();
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer"),
      "@rebuzzle/game-logic": path.resolve(__dirname, "../../packages/game-logic/src"),
      "@rebuzzle/config": path.resolve(__dirname, "../../packages/config/src"),
    },
  },
  root: path.resolve(__dirname, "src/renderer"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/renderer/index.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
});
