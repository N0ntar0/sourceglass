import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const headersFileUrl = new URL("../public/_headers", import.meta.url);
const remoteOnlyFixture = fileURLToPath(
  new URL("../fixtures/remote-only.jpg", import.meta.url),
);

async function expectedContentSecurityPolicy(): Promise<string> {
  const headerLine = (await readFile(headersFileUrl, "utf8"))
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.startsWith("Content-Security-Policy:"));

  if (headerLine === undefined) {
    throw new Error("Content-Security-Policy is missing from public/_headers.");
  }

  return headerLine.slice("Content-Security-Policy:".length).trim();
}

test("initial load stays on-origin and serves the production CSP", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  const response = await page.goto("/");
  expect(response).not.toBeNull();
  expect(response?.headers()["content-security-policy"]).toBe(
    await expectedContentSecurityPolicy(),
  );

  await expect(page.getByText("Sourceglass", { exact: true })).toBeVisible();

  const baseOrigin = new URL(page.url()).origin;
  const offOriginRequests = requests.filter(
    (url) => new URL(url).origin !== baseOrigin,
  );
  expect(offOriginRequests).toEqual([]);
});

test("image inspection stays on-origin", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await page.getByLabel("Select Image").setInputFiles(remoteOnlyFixture);
  await expect(
    page.getByText("No AI-related record was found", { exact: true }),
  ).toBeVisible();

  const baseOrigin = new URL(page.url()).origin;
  expect(requests.filter((url) => new URL(url).origin !== baseOrigin)).toEqual(
    [],
  );
});
