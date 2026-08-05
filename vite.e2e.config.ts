import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vite";

import baseConfig from "./vite.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    build: {
      // Keep sub-4 KiB fixtures as same-origin files; strict CSP blocks fetch(data: URLs).
      assetsInlineLimit: 0,
      rollupOptions: {
        input: fileURLToPath(
          new URL("./e2e/phase2-harness.html", import.meta.url),
        ),
      },
    },
  }),
);
