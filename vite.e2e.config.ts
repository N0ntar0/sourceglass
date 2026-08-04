import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vite";

import baseConfig from "./vite.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    build: {
      assetsInlineLimit: 0,
      rollupOptions: {
        input: {
          app: fileURLToPath(new URL("./index.html", import.meta.url)),
          phase2Harness: fileURLToPath(
            new URL("./e2e/phase2-harness.html", import.meta.url),
          ),
        },
      },
    },
  }),
);
