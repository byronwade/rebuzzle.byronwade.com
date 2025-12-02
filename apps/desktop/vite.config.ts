import { defineConfig } from "vite";
import electron from "vite-plugin-electron";

export default defineConfig({
  plugins: [
    electron([
      {
        // Main process entry file
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["electron", "electron-squirrel-startup"],
            },
          },
        },
      },
      {
        // Preload script
        entry: "electron/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron",
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
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
