import { fileURLToPath } from "node:url";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

interface StateCase {
  id: string;
  fixture: string;
  heading: string;
  japaneseHeading: string;
  modifier?: "result--emph" | "result--dashed";
}

async function expectHeadingInversion(page: Page): Promise<void> {
  const colors = await page.locator(".result").evaluate((result) => {
    const head = result.querySelector<HTMLElement>(".result__head");
    if (head === null) throw new Error("The result heading is missing.");
    return {
      headBackground: getComputedStyle(head).backgroundColor,
      headForeground: getComputedStyle(head).color,
      pageForeground: getComputedStyle(document.body).color,
      resultBackground: getComputedStyle(result).backgroundColor,
    };
  });
  expect(colors.headBackground).toBe(colors.pageForeground);
  expect(colors.headForeground).toBe(colors.resultBackground);
}

const states: StateCase[] = [
  {
    id: "explicit",
    fixture: "c2pa-ai-trained.jpg",
    heading: "A record indicating AI generation or AI editing was found",
    japaneseHeading: "AI生成・AI編集を示す記録が見つかりました",
    modifier: "result--emph",
  },
  {
    id: "heuristic",
    fixture: "exif-software-aitool.jpg",
    heading: "A mention of an AI tool was found",
    japaneseHeading: "AIツールに関する記述が見つかりました",
  },
  {
    id: "no-ai",
    fixture: "exif-rich-no-c2pa.jpg",
    heading: "No AI-related record was found",
    japaneseHeading: "AI生成を示す記録は見つかりませんでした",
  },
  {
    id: "no-provenance",
    fixture: "no-metadata.jpg",
    heading: "No provenance record remains",
    japaneseHeading: "来歴の記録が残っていませんでした",
    modifier: "result--dashed",
  },
];

async function inspectFixture(
  page: Page,
  state: StateCase,
  colorScheme: "light" | "dark",
  testInfo: TestInfo,
  language: "en" | "ja" = "en",
): Promise<void> {
  await page.emulateMedia({ colorScheme });
  await page.goto("/");
  if (language === "ja") {
    await page.getByLabel("Language").selectOption("ja");
  }
  const fixture = fileURLToPath(
    new URL(`../fixtures/${state.fixture}`, import.meta.url),
  );
  const selectImage = language === "ja" ? "画像を選択" : "Select Image";
  const heading = language === "ja" ? state.japaneseHeading : state.heading;
  await page.getByLabel(selectImage).setInputFiles(fixture);
  await expect(page.getByText(heading, { exact: true })).toBeVisible();

  const result = page.locator(".result");
  if (state.modifier === undefined) {
    await expect(result).not.toHaveClass(/result--(?:emph|dashed)/u);
  } else {
    await expect(result).toHaveClass(new RegExp(state.modifier, "u"));
  }
  if (state.modifier === "result--emph") {
    await expectHeadingInversion(page);
  }
  await expect(page.locator(".result__coverage").first()).toBeVisible();
  await expect(page.locator(".disclaimer")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath(`${state.id}-${language}-${colorScheme}.png`),
    fullPage: true,
  });
}

for (const state of states) {
  test(`renders ${state.id} in light mode`, async ({ page }, testInfo) => {
    await inspectFixture(page, state, "light", testInfo);
  });
}

for (const state of states) {
  test(`renders ${state.id} in Japanese`, async ({ page }, testInfo) => {
    await inspectFixture(page, state, "light", testInfo, "ja");
  });
}

test("explicit heading inversion also holds in dark mode", async ({
  page,
}, testInfo) => {
  const explicit = states[0];
  if (explicit === undefined)
    throw new Error("The explicit fixture is missing.");
  await inspectFixture(page, explicit, "dark", testInfo);
});

test("unsupported input is shown as not checked", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Select Image").setInputFiles({
    name: "fixture.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(
    page.getByText("This format cannot be inspected, so it was not checked.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("No provenance record remains", { exact: true }),
  ).toHaveCount(0);
});

test("unsupported input is shown as not checked in Japanese", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("ja");
  await page.getByLabel("画像を選択").setInputFiles({
    name: "fixture.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(
    page.getByText("この形式は解析できないため、調べていません。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("来歴の記録が残っていませんでした", { exact: true }),
  ).toHaveCount(0);
});

test("keeps the selected language after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("ja");
  await page.reload();

  await expect(page.getByLabel("Language")).toHaveValue("ja");
  await expect(
    page.getByText("画像に残された来歴情報を調べます。", { exact: true }),
  ).toBeVisible();
});
