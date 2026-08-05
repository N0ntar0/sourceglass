import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const headersPath = fileURLToPath(
  new URL("./public/_headers", import.meta.url),
);

/**
 * Cloudflare Pages とローカル開発で同一の CSP を使うため、_headers を唯一の定義元として読む。
 * 規定のヘッダーが見つからない場合は、安全でない状態で起動せず設定エラーにする。
 */
function readContentSecurityPolicy(): string {
  const headerLine = readFileSync(headersPath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.startsWith("Content-Security-Policy:"));

  if (headerLine === undefined) {
    throw new Error("Content-Security-Policy is missing from public/_headers.");
  }

  return headerLine.slice("Content-Security-Policy:".length).trim();
}

const responseHeaders = {
  "Content-Security-Policy": readContentSecurityPolicy(),
};

export default defineConfig({
  plugins: [basicSsl(), react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    headers: responseHeaders,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    headers: responseHeaders,
  },
});
