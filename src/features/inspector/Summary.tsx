import {
  getC2pa,
  getExif,
  getXmp,
  type MetadataField,
  type ProvenanceReport,
} from "../provenance";
import { t } from "../../i18n";

interface SummaryRow {
  label: string;
  value: string;
  empty: boolean;
}

function firstValue(field: MetadataField | undefined): string | undefined {
  return field?.values[0]?.value;
}

function rows(report: ProvenanceReport): SummaryRow[] {
  const c2pa = getC2pa(report);
  const exif = getExif(report);
  const xmp = getXmp(report);
  const empty = t("summary.empty");
  const software =
    (exif.status === "present"
      ? firstValue(exif.data.fields["exif.Software"])
      : undefined) ??
    (xmp.status === "present"
      ? firstValue(xmp.data.fields["xmp.CreatorTool"])
      : undefined) ??
    (c2pa.status === "present"
      ? Object.values(c2pa.data.manifests).flatMap(
          (manifest) => manifest.claimGenerators,
        )[0]
      : undefined);

  return [
    {
      label: t("summary.c2pa"),
      value: c2pa.status === "present" ? t("summary.found") : empty,
      empty: c2pa.status !== "present",
    },
    {
      label: t("summary.aiRelated"),
      value: report.signals.length > 0 ? t("summary.found") : empty,
      empty: report.signals.length === 0,
    },
    {
      label: t("summary.software"),
      value: software ?? empty,
      empty: software === undefined,
    },
    {
      label: t("summary.exif"),
      value:
        exif.status === "present"
          ? t("summary.entries", { n: exif.data.entryCount })
          : empty,
      empty: exif.status !== "present",
    },
    {
      label: t("summary.xmp"),
      value:
        xmp.status === "present"
          ? t("summary.entries", { n: xmp.data.entryCount })
          : empty,
      empty: xmp.status !== "present",
    },
  ];
}

export function Summary({ report }: { report: ProvenanceReport }) {
  return (
    <section className="stack stack--tight" aria-labelledby="summary-heading">
      <div className="eyebrow" id="summary-heading">
        {t("section.provenance")}
      </div>
      <div className="summary">
        {rows(report).map((row) => (
          <div className="summary__row" key={row.label}>
            <div className="summary__key">{row.label}</div>
            <div
              className={`summary__val${row.empty ? " summary__val--none" : ""}`}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
