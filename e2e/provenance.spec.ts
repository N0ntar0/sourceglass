import { expect, test, type Page } from "@playwright/test";

type FixtureId =
  | "algorithmic"
  | "composite"
  | "iptc"
  | "multiAction"
  | "trained"
  | "truncated"
  | "zeroByte"
  | "noMetadata"
  | "remoteOnly"
  | "officialInvalid"
  | "officialValid"
  | "pngC2pa"
  | "webpC2pa";

interface HarnessReport {
  verdict: string;
  basis: string | null;
  signals: Array<{ source: string; basis: string; evidence: { path: string } }>;
  results: Record<
    string,
    | { status: "absent" }
    | { status: "error"; error: { code: string } }
    | {
        status: "present";
        data: {
          validation: { integrity: string; signerTrust: string };
        };
      }
  >;
}

async function inspect(
  page: Page,
  id: FixtureId,
  fullAnalysis = false,
): Promise<HarnessReport> {
  return page.evaluate(
    async ({ fixtureId, runAll }) =>
      (await window.phase2Harness.inspectFixture(
        fixtureId,
        runAll ? undefined : ["c2pa"],
      )) as unknown as HarnessReport,
    { fixtureId: id, runAll: fullAnalysis },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/phase2-harness.html");
  await expect
    .poll(() => page.evaluate(() => typeof window.phase2Harness))
    .toBe("object");
});

test("remote-only C2PA inspection makes no off-origin request", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  const report = await inspect(page, "remoteOnly", true);
  expect(report.results.c2pa?.status).toBe("absent");
  expect(report.verdict).toBe("NO_AI_RELATED_PROVENANCE_FOUND");

  const origin = new URL(page.url()).origin;
  expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual([]);
});

test("official manifests keep integrity and signer trust separate", async ({
  page,
}) => {
  const valid = await inspect(page, "officialValid");
  expect(valid.results.c2pa).toEqual(
    expect.objectContaining({
      status: "present",
      data: expect.objectContaining({
        validation: expect.objectContaining({
          integrity: "valid",
          signerTrust: "not-evaluated",
        }),
      }),
    }),
  );

  const invalid = await inspect(page, "officialInvalid");
  expect(invalid.results.c2pa).toEqual(
    expect.objectContaining({
      status: "present",
      data: expect.objectContaining({
        validation: expect.objectContaining({ integrity: "invalid" }),
      }),
    }),
  );
  expect(
    invalid.signals.filter(
      (signal) => signal.source === "c2pa" && signal.basis === "explicit",
    ),
  ).toEqual([]);
});

test("C2PA rules cover all actions, IPTC assertions, and algorithmicMedia", async ({
  page,
}) => {
  const trained = await inspect(page, "trained");
  expect(trained.verdict).toBe("AI_RELATED_PROVENANCE");
  expect(trained.basis).toBe("explicit");

  const composite = await inspect(page, "composite");
  expect(composite.verdict).toBe("AI_RELATED_PROVENANCE");
  expect(
    composite.signals.some((signal) =>
      signal.evidence.path.includes("digitalSourceType"),
    ),
  ).toBe(true);

  const multiAction = await inspect(page, "multiAction");
  expect(multiAction.verdict).toBe("AI_RELATED_PROVENANCE");
  expect(
    multiAction.signals.some((signal) =>
      signal.evidence.path.includes("actions[1]"),
    ),
  ).toBe(true);

  const iptc = await inspect(page, "iptc");
  expect(
    iptc.signals.some((signal) =>
      signal.evidence.path.includes("DigitalSourceType"),
    ),
  ).toBe(true);

  const algorithmic = await inspect(page, "algorithmic");
  expect(algorithmic.verdict).toBe("NO_AI_RELATED_PROVENANCE_FOUND");
  expect(algorithmic.signals).toEqual([]);
});

test("a JPEG without C2PA is absent", async ({ page }) => {
  const report = await inspect(page, "noMetadata");
  expect(report.results.c2pa).toEqual({ status: "absent" });
});

test("C2PA absent, invalid, and empty inputs remain separate paths", async ({
  page,
}) => {
  const absent = await inspect(page, "noMetadata");
  expect(absent.results.c2pa).toEqual({ status: "absent" });

  const invalid = await inspect(page, "truncated");
  expect(invalid.results.c2pa).toEqual(
    expect.objectContaining({
      status: "error",
      error: expect.objectContaining({ code: "C2PA_INVALID_ASSET" }),
    }),
  );

  const empty = await inspect(page, "zeroByte");
  expect(empty.results.c2pa).toEqual(
    expect.objectContaining({
      status: "error",
      error: expect.objectContaining({ code: "C2PA_UNSUPPORTED_TYPE" }),
    }),
  );
});

test("C2PA reads PNG and WebP containers", async ({ page }) => {
  for (const id of ["pngC2pa", "webpC2pa"] as const) {
    const report = await inspect(page, id);
    expect(report.results.c2pa?.status).toBe("present");
    expect(report.verdict).toBe("NO_AI_RELATED_PROVENANCE_FOUND");
  }
});
