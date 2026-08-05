import { afterEach, describe, expect, it, vi } from "vitest";

function storage(initial?: string): Storage {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set("sourceglass.language", initial);
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("i18n", () => {
  it("uses the browser language when no selection was saved", async () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    vi.stubGlobal("localStorage", storage());

    const { getLanguage, t } = await import("./index");

    expect(getLanguage()).toBe("ja");
    expect(t("app.tagline")).toBe("画像に残された来歴情報を調べます。");
  });

  it("prefers and updates the saved selection", async () => {
    const localStorage = storage("en");
    vi.stubGlobal("navigator", { language: "ja-JP" });
    vi.stubGlobal("localStorage", localStorage);

    const { getLanguage, setLanguage, t } = await import("./index");
    expect(getLanguage()).toBe("en");

    setLanguage("ja");

    expect(localStorage.getItem("sourceglass.language")).toBe("ja");
    expect(t("result.noAi.note")).toBe(
      "これは「AIを使っていない」という意味ではありません。この種の記録は、画像を保存し直すだけで簡単に消えます。",
    );
  });

  it("replaces placeholders in the active dictionary", async () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    vi.stubGlobal("localStorage", storage());
    const { setLanguage, t } = await import("./index");

    setLanguage("ja");

    expect(t("summary.entries", { n: 3 })).toBe("3項目");
  });

  it("keeps the approved Japanese promises exact", async () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    vi.stubGlobal("localStorage", storage());
    const { t } = await import("./index");

    expect(t("result.noAi.note")).toContain(
      "これは「AIを使っていない」という意味ではありません。",
    );
    expect(t("result.none.note")).toContain(
      "この画像については、何も判断できません。",
    );
    expect(t("disclaimer.always")).toBe(
      "Sourceglass は、画像に記録された情報を読み取るだけのツールです。",
    );
  });

  it("keeps detail-table labels and status values in English", async () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    vi.stubGlobal("localStorage", storage());
    const { t } = await import("./index");

    expect(t("details.field")).toBe("Field");
    expect(t("details.value")).toBe("Value");
    expect(t("details.evidence")).toBe("Evidence");
    expect(t("status.absent")).toBe("absent");
    expect(t("status.notChecked")).toBe("not checked");
    expect(t("status.error")).toBe("error");
  });
});
