import {
  inspectImage,
  type AnalysisInput,
  type ProvenanceReport,
} from "../src/features/provenance";

import algorithmicUrl from "../fixtures/c2pa-algorithmic.jpg?url";
import compositeUrl from "../fixtures/c2pa-ai-composite.jpg?url";
import iptcUrl from "../fixtures/c2pa-iptc-assertion.jpg?url";
import multiActionUrl from "../fixtures/c2pa-multi-action.jpg?url";
import trainedUrl from "../fixtures/c2pa-ai-trained.jpg?url";
import truncatedUrl from "../fixtures/broken-truncated.jpg?url";
import zeroByteUrl from "../fixtures/broken-zero-byte.jpg?url";
import noMetadataUrl from "../fixtures/no-metadata.jpg?url";
import remoteOnlyUrl from "../fixtures/remote-only.jpg?url";
import officialInvalidUrl from "../fixtures/official/adobe-20220124-E-uri-CA.jpg?url";
import officialValidUrl from "../fixtures/official/adobe-20220124-CA.jpg?url";
import pngC2paUrl from "../fixtures/png-c2pa.png?url";
import webpC2paUrl from "../fixtures/webp-c2pa.webp?url";

const fixtures = {
  algorithmic: { url: algorithmicUrl, mimeType: "image/jpeg" },
  composite: { url: compositeUrl, mimeType: "image/jpeg" },
  iptc: { url: iptcUrl, mimeType: "image/jpeg" },
  multiAction: { url: multiActionUrl, mimeType: "image/jpeg" },
  trained: { url: trainedUrl, mimeType: "image/jpeg" },
  truncated: { url: truncatedUrl, mimeType: "image/jpeg" },
  zeroByte: { url: zeroByteUrl, mimeType: "image/jpeg" },
  noMetadata: { url: noMetadataUrl, mimeType: "image/jpeg" },
  remoteOnly: { url: remoteOnlyUrl, mimeType: "image/jpeg" },
  officialInvalid: { url: officialInvalidUrl, mimeType: "image/jpeg" },
  officialValid: { url: officialValidUrl, mimeType: "image/jpeg" },
  pngC2pa: { url: pngC2paUrl, mimeType: "image/png" },
  webpC2pa: { url: webpC2paUrl, mimeType: "image/webp" },
} as const;

type FixtureId = keyof typeof fixtures;

async function inspectFixture(
  id: FixtureId,
  only?: string[],
): Promise<ProvenanceReport> {
  const fixture = fixtures[id];
  const response = await fetch(fixture.url);
  const bytes = await response.arrayBuffer();
  const input: AnalysisInput = {
    file: { name: id, size: bytes.byteLength, mimeType: fixture.mimeType },
    async bytes() {
      return bytes.slice(0);
    },
    async pixels() {
      throw new Error("The Phase 2 harness does not decode pixels.");
    },
  };

  return inspectImage(input, only === undefined ? undefined : { only });
}

declare global {
  interface Window {
    phase2Harness: {
      inspectFixture(id: FixtureId, only?: string[]): Promise<ProvenanceReport>;
    };
  }
}

window.phase2Harness = { inspectFixture };
