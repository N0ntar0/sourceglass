import { Icon, type IconName } from "../../components/Icon";
import { t } from "../../i18n";
import { getC2pa, getExif, type ProvenanceReport } from "../provenance";
import { isAiRelatedSignal } from "./isAiRelatedSignal";

interface ResultPresentation {
  heading: string;
  note?: string;
  icon: IconName;
  className: string;
  emptyReason?: string;
}

function detectorLabel(id: string): string {
  return id.toUpperCase();
}

function hasUnsupported(report: ProvenanceReport): boolean {
  return Object.values(report.results).some(
    (result) =>
      result.status === "not-checked" && result.reason === "unsupported",
  );
}

function hasInvalidC2paAiSignal(report: ProvenanceReport): boolean {
  const c2pa = getC2pa(report);
  return (
    c2pa.status === "present" &&
    c2pa.data.validation.integrity === "invalid" &&
    report.signals.some(
      (signal) => signal.source === "c2pa" && isAiRelatedSignal(signal),
    )
  );
}

function hasErrorCode(report: ProvenanceReport, code: string): boolean {
  return Object.values(report.results).some(
    (result) => result.status === "error" && result.error.code === code,
  );
}

function emptyReason(report: ProvenanceReport): string | undefined {
  if (hasUnsupported(report)) return t("emptyReason.notChecked");
  if (hasErrorCode(report, "METADATA_TOO_LARGE")) {
    return t("emptyReason.tooLarge", { limit: "256 KiB" });
  }

  const exif = getExif(report);
  if (
    exif.status === "present" &&
    !report.coverage.withMeaningfulData.includes("exif")
  ) {
    return t("emptyReason.technicalOnly", { n: exif.data.entryCount });
  }

  const hasError = Object.values(report.results).some(
    (result) => result.status === "error",
  );
  return hasError ? undefined : t("emptyReason.noSegment");
}

function presentation(report: ProvenanceReport): ResultPresentation {
  if (report.verdict === "AI_RELATED_PROVENANCE") {
    if (report.basis === "explicit") {
      return {
        heading: t("result.ai.explicit.heading"),
        note: t("result.ai.explicit.note"),
        icon: "warn",
        className: "result result--emph",
      };
    }
    if (hasInvalidC2paAiSignal(report)) {
      return {
        heading: t("result.ai.explicit.heading"),
        note: t("result.ai.tampered.note"),
        icon: "warn",
        className: "result",
      };
    }
    return {
      heading: t("result.ai.heuristic.heading"),
      note: t("result.ai.heuristic.note"),
      icon: "warn",
      className: "result",
    };
  }

  if (report.verdict === "NO_AI_RELATED_PROVENANCE_FOUND") {
    return {
      heading: t("result.noAi.heading"),
      note: t("result.noAi.note"),
      icon: "none",
      className: "result",
    };
  }

  const reason = emptyReason(report);
  if (hasUnsupported(report)) {
    return {
      heading: t("emptyReason.notChecked"),
      icon: "info",
      className: "result result--dashed",
    };
  }
  return {
    heading: t("result.none.heading"),
    note: t("result.none.note"),
    icon: "info",
    className: "result result--dashed",
    emptyReason: reason,
  };
}

function Coverage({ report }: { report: ProvenanceReport }) {
  const unsupported = report.coverage.skipped.filter(
    ({ reason }) => reason === "unsupported",
  );
  const lines = [
    report.coverage.ran.length > 0
      ? t("coverage.checked", {
          list: report.coverage.ran.map(detectorLabel).join(", "),
        })
      : undefined,
    report.coverage.failed.length > 0
      ? t("coverage.failed", {
          list: report.coverage.failed.map(detectorLabel).join(", "),
        })
      : undefined,
    unsupported.length > 0
      ? t("coverage.skipped", {
          list: unsupported.map(({ id }) => detectorLabel(id)).join(", "),
        })
      : undefined,
  ].filter((line): line is string => line !== undefined);

  return (
    <div className="stack stack--tight">
      {lines.map((line) => (
        <p className="result__coverage" key={line}>
          {line}
        </p>
      ))}
    </div>
  );
}

function IntegrityNotes({ report }: { report: ProvenanceReport }) {
  const c2pa = getC2pa(report);
  if (c2pa.status !== "present") return null;

  return (
    <div className="stack stack--tight">
      {c2pa.data.validation.integrity === "invalid" ? (
        <p className="result__note">{t("integrity.invalid")}</p>
      ) : null}
      {c2pa.data.validation.signerTrust === "not-evaluated" ? (
        <p className="result__note">{t("trust.notEvaluated")}</p>
      ) : null}
    </div>
  );
}

export function ResultPanel({ report }: { report: ProvenanceReport }) {
  const result = presentation(report);
  return (
    <section className="stack stack--tight" aria-labelledby="result-label">
      <div className="eyebrow" id="result-label">
        {t("section.result")}
      </div>
      <div className={result.className} data-verdict={report.verdict}>
        <div className="result__head">
          <Icon name={result.icon} />
          <div className="result__title">{result.heading}</div>
        </div>
        <div className="result__body">
          <div className="stack stack--tight">
            {result.note === undefined ? null : (
              <p className="result__note">{result.note}</p>
            )}
            {result.emptyReason === undefined ? null : (
              <p className="result__note">{result.emptyReason}</p>
            )}
            <IntegrityNotes report={report} />
            <Coverage report={report} />
          </div>
        </div>
      </div>
    </section>
  );
}
