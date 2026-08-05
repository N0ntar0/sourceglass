import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "spike/",
      "coverage/",
      "playwright-report/",
      "test-results/",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat["recommended-latest"],
  },
  {
    files: ["src/features/provenance/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "react-dom/*"],
              message: "解析エンジンは UI に依存しない（AGENTS.md §2.1）。",
            },
            {
              group: ["../../inspector/*", "**/features/inspector/*"],
              message: "provenance → inspector の逆方向 import は禁止。",
            },
            {
              group: ["../../platform/*", "**/platform/*"],
              message: "DOM 依存は注入する。platform を直接 import しない。",
            },
          ],
        },
      ],
    },
  },
);
