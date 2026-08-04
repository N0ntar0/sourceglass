import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the approved product name and tagline", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Sourceglass");
    expect(markup).toContain("Inspect the provenance of an image.");
    expect(markup).toContain("Drop an image here");
    expect(markup).toContain("Your images never leave your browser");
    expect(markup).toContain('<select class="btn" aria-label="Language"');
    expect(markup).toContain("日本語");
  });
});
