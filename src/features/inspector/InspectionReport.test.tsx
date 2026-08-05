import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { setLanguage } from "../../i18n";
import type {
  C2paData,
  ExifData,
  ProvenanceReport,
  SignalBasis,
  SourceResult,
} from "../provenance";
import { InspectionReport } from "./InspectionReport";

function report(options: {
  verdict: ProvenanceReport["verdict"];
  basis?: SignalBasis | null;
  c2pa?: SourceResult<C2paData>;
  exif?: SourceResult<ExifData>;
}): ProvenanceReport {
  const c2pa = options.c2pa ?? { status: "absent" };
  const exif = options.exif ?? { status: "absent" };
  const results: Record<string, SourceResult<unknown>> = {
    c2pa,
    exif,
    xmp: { status: "absent" },
  };
  const signals =
    options.verdict === "AI_RELATED_PROVENANCE"
      ? [
          {
            id: "fixture.signal",
            source:
              c2pa.status === "present" ? ("c2pa" as const) : ("exif" as const),
            category: "ai-generation" as const,
            basis: options.basis ?? "heuristic",
            labelKey: "fixture.signal",
            evidence: { path: "fixture.path", value: "fixture value" },
          },
        ]
      : [];

  return {
    file: { name: "fixture.jpg", size: 1024, mimeType: "image/jpeg" },
    results,
    coverage: {
      ran: Object.entries(results)
        .filter(([, result]) => result.status !== "not-checked")
        .map(([id]) => id),
      skipped: [],
      failed: [],
      withMeaningfulData:
        options.verdict === "NO_PROVENANCE_INFORMATION" ? [] : ["exif"],
    },
    signals,
    verdict: options.verdict,
    basis: options.basis ?? null,
    analyzedAt: "2026-08-05T00:00:00.000Z",
    engineVersion: "0.1.0",
  };
}

const presentC2pa: SourceResult<C2paData> = {
  status: "present",
  data: {
    activeManifest: "fixture",
    manifests: {
      fixture: {
        label: "fixture",
        title: "Fixture",
        claimGenerators: ["Fixture Generator"],
        assertions: [],
      },
    },
    validation: {
      integrity: "valid",
      signerTrust: "not-evaluated",
      rawState: "Valid",
      failures: [],
    },
  },
};

const presentExif: SourceResult<ExifData> = {
  status: "present",
  data: {
    fields: {
      "exif.Software": {
        values: [
          { value: "OpenAI GPT Image", truncated: false, originalLength: 16 },
        ],
        originalCount: 1,
        arrayTruncated: false,
      },
    },
    entryCount: 1,
  },
};

describe("InspectionReport", () => {
  it("renders the explicit state with a heading-only emphasis", () => {
    const markup = renderToStaticMarkup(
      <InspectionReport
        report={report({
          verdict: "AI_RELATED_PROVENANCE",
          basis: "explicit",
          c2pa: presentC2pa,
        })}
      />,
    );
    expect(markup).toContain("result result--emph");
    expect(markup).toContain(
      "A record indicating AI generation or AI editing was found",
    );
    expect(markup).toContain("fixture.path");
  });

  it("renders the heuristic state without emphasis", () => {
    const markup = renderToStaticMarkup(
      <InspectionReport
        report={report({
          verdict: "AI_RELATED_PROVENANCE",
          basis: "heuristic",
          exif: presentExif,
        })}
      />,
    );
    expect(markup).toContain("A mention of an AI tool was found");
    expect(markup).not.toContain("result--emph");
  });

  it("keeps the no-AI state solid and shows coverage", () => {
    const markup = renderToStaticMarkup(
      <InspectionReport
        report={report({
          verdict: "NO_AI_RELATED_PROVENANCE_FOUND",
          exif: presentExif,
        })}
      />,
    );
    expect(markup).toContain("No AI-related record was found");
    expect(markup).not.toContain("result--dashed");
    expect(markup).toContain("Checked:");
  });

  it("does not count non-AI signals as AI-related provenance", () => {
    const nonAi = report({
      verdict: "NO_AI_RELATED_PROVENANCE_FOUND",
      exif: presentExif,
    });
    nonAi.signals = [
      {
        id: "fixture.provenance",
        source: "exif",
        category: "provenance",
        basis: "heuristic",
        labelKey: "fixture.provenance",
        evidence: { path: "fixture.path", value: "fixture value" },
      },
    ];

    const markup = renderToStaticMarkup(<InspectionReport report={nonAi} />);
    expect(markup).toContain(
      '<div class="summary__key">AI-related provenance</div><div class="summary__val summary__val--none">—</div>',
    );
    expect(markup).toContain("No AI-related record was found");
  });

  it("uses the invalid-C2PA wording for downgraded AI signals", () => {
    const invalidC2pa: SourceResult<C2paData> = {
      status: "present",
      data: {
        ...presentC2pa.data,
        validation: {
          ...presentC2pa.data.validation,
          integrity: "invalid",
          rawState: "Invalid",
        },
      },
    };
    const markup = renderToStaticMarkup(
      <InspectionReport
        report={report({
          verdict: "AI_RELATED_PROVENANCE",
          basis: "heuristic",
          c2pa: invalidC2pa,
        })}
      />,
    );

    expect(markup).toContain(
      "A record indicating AI generation or AI editing was found",
    );
    expect(markup).toContain(
      "However, this C2PA record failed its integrity checks, so its contents cannot be relied upon.",
    );
    expect(markup).toContain(
      "The C2PA record in this image failed its integrity checks. Its contents cannot be relied upon.",
    );
    expect(markup).not.toContain("Found in metadata fields such as Software.");
    expect(markup).not.toContain("result--emph");
  });

  it("renders the invalid-C2PA wording in Japanese", () => {
    const invalidC2pa: SourceResult<C2paData> = {
      status: "present",
      data: {
        ...presentC2pa.data,
        validation: {
          ...presentC2pa.data.validation,
          integrity: "invalid",
          rawState: "Invalid",
        },
      },
    };

    setLanguage("ja");
    try {
      const markup = renderToStaticMarkup(
        <InspectionReport
          report={report({
            verdict: "AI_RELATED_PROVENANCE",
            basis: "heuristic",
            c2pa: invalidC2pa,
          })}
        />,
      );

      expect(markup).toContain("AI生成・AI編集を示す記録が見つかりました");
      expect(markup).toContain(
        "ただし、この C2PA 記録は整合性チェックに失敗しています。記録された内容は信頼できません。",
      );
      expect(markup).toContain(
        "この画像の C2PA 記録は、内容の整合性チェックに失敗しました。記録された内容は信頼できません。",
      );
      expect(markup).not.toContain("result--emph");
    } finally {
      setLanguage("en");
    }
  });

  it("keeps the no-provenance state dashed and fills summary gaps", () => {
    const markup = renderToStaticMarkup(
      <InspectionReport
        report={report({ verdict: "NO_PROVENANCE_INFORMATION" })}
      />,
    );
    expect(markup).toContain("result result--dashed");
    expect(markup).toContain("No provenance record remains");
    expect(markup).toContain(
      "This file contains no EXIF, XMP, or C2PA section",
    );
    expect(markup).toContain("—");
    expect(markup).toContain(
      "Sourceglass only reads what is recorded in the image.",
    );
  });

  it("does not describe a not-checked result as a missing record", () => {
    const notChecked = report({ verdict: "NO_PROVENANCE_INFORMATION" });
    notChecked.results = {
      c2pa: { status: "not-checked", reason: "unsupported" },
      exif: { status: "not-checked", reason: "unsupported" },
      xmp: { status: "not-checked", reason: "unsupported" },
    };
    notChecked.coverage = {
      ran: [],
      skipped: [
        { id: "c2pa", reason: "unsupported" },
        { id: "exif", reason: "unsupported" },
        { id: "xmp", reason: "unsupported" },
      ],
      failed: [],
      withMeaningfulData: [],
    };

    const markup = renderToStaticMarkup(
      <InspectionReport report={notChecked} />,
    );
    expect(markup).toContain(
      "This format cannot be inspected, so it was not checked.",
    );
    expect(markup).not.toContain("No provenance record remains");
    expect(markup).not.toContain(
      "This file contains no EXIF, XMP, or C2PA section",
    );
    expect(markup).not.toContain("Where metadata usually gets lost");
  });

  it("does not change the empty state for a deferred detector", () => {
    const deferred = report({ verdict: "NO_PROVENANCE_INFORMATION" });
    deferred.results = {
      ...deferred.results,
      trustmark: { status: "not-checked", reason: "not-requested" },
    };
    deferred.coverage.skipped = [{ id: "trustmark", reason: "not-requested" }];

    const markup = renderToStaticMarkup(<InspectionReport report={deferred} />);
    expect(markup).toContain("No provenance record remains");
    expect(markup).toContain(
      "This file contains no EXIF, XMP, or C2PA section",
    );
    expect(markup).toContain("Where metadata usually gets lost");
    expect(markup).not.toContain(
      "This format cannot be inspected, so it was not checked.",
    );
    expect(markup).not.toContain("Not applicable to this format: TRUSTMARK");
  });

  it("shows an oversized metadata failure instead of a missing section", () => {
    const tooLarge = report({ verdict: "NO_PROVENANCE_INFORMATION" });
    tooLarge.results = {
      c2pa: { status: "absent" },
      exif: {
        status: "error",
        error: { code: "METADATA_TOO_LARGE", message: "too large" },
      },
      xmp: {
        status: "error",
        error: { code: "METADATA_TOO_LARGE", message: "too large" },
      },
    };
    tooLarge.coverage = {
      ran: ["c2pa"],
      skipped: [],
      failed: ["exif", "xmp"],
      withMeaningfulData: [],
    };

    const markup = renderToStaticMarkup(<InspectionReport report={tooLarge} />);
    expect(markup).toContain(
      "The metadata section was too large to read (limit 256 KiB).",
    );
    expect(markup).toContain("Could not be read: EXIF, XMP");
    expect(markup).not.toContain(
      "This file contains no EXIF, XMP, or C2PA section",
    );
  });
});
