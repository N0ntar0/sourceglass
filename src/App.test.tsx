import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the approved product name and tagline", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Sourceglass");
    expect(markup).toContain("Inspect the provenance of an image.");
  });
});
