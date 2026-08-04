# Sourceglass

**Open-source image provenance inspector.**

No uploads. No AI APIs. No accounts.
Your images never leave your browser.

> **Status: in development (pre-alpha).** Nothing here is released yet.
> The design is settled and recorded in [`ai_tasks/`](./ai_tasks/); implementation is in progress.

[日本語](./README.ja.md)

---

## What Sourceglass is

Sourceglass reads the provenance information that is *actually recorded* inside an image
file — C2PA Content Credentials, EXIF, and XMP — and shows you what it found.

It answers questions like:

- Was this image made with software that recorded what it did?
- Does it carry C2PA Content Credentials?
- Is there provenance data that explicitly indicates AI generation or AI editing?
- What other metadata survived?

## What Sourceglass is **not**

**Sourceglass does not determine whether an image is AI-generated.**
It inspects provenance information embedded in the image.

It does not look at pixels and guess. It will never show you
"AI probability: 87%", and it will never tell you an image is "not AI".
Those claims cannot be made honestly from the information available, so Sourceglass
does not make them.

The absence of AI-related provenance does not prove that an image was not generated or
edited using AI. Metadata is trivially removed — most of it disappears the moment an
image is posted to a social network.

---

## Privacy

Sourceglass is a static web application. There is no server, no database, and no account.
Everything runs in your browser.

- **No uploads** — your image is never transmitted anywhere
- **No AI APIs** — no LLM, no third-party detection service
- **No accounts, no tracking of your images or results**
- All analysis code, including the C2PA WebAssembly module, is served from the same origin

### Verifiable privacy

We would rather prove this than claim it. Sourceglass enforces it two ways:

1. **Content Security Policy.** The app is served with a CSP that restricts every fetch to
   its own origin. A request to a third party would be blocked by the browser, not merely
   discouraged by us.
2. **An automated test.** A Playwright test records every network request made during a
   full analysis run and fails the build if any of them leave the origin.

Both run in CI. If you do not trust the claim, read
[`e2e/privacy.spec.ts`](./e2e/privacy.spec.ts) and the CSP in [`public/_headers`](./public/_headers).

---

## Supported formats

JPEG · PNG · WebP

AVIF and HEIC are read on a best-effort basis where the underlying parser supports them.

## Supported provenance

| Source | What is read |
| --- | --- |
| **C2PA** | Manifests, claims, assertions, actions, `digitalSourceType`, generator/software, validation state |
| **EXIF** | Software, dates, Artist, Copyright, camera make/model |
| **XMP** | Creator tool, history, editing information, IPTC extension fields |

---

## How the AI-related result is determined

Sourceglass does not scan text for the word "AI". It reads the fields that the C2PA and
IPTC specifications actually define for this purpose.

The primary signal is `digitalSourceType`, using the IPTC NewsCodes vocabulary:

| Value | Meaning | Treated as |
| --- | --- | --- |
| `trainedAlgorithmicMedia` | Created by generative AI | **AI-related** |
| `compositeWithTrainedAlgorithmicMedia` | Contains generative AI elements | **AI-related** |
| `algorithmicMedia` | Algorithmically generated, *not* AI (e.g. CG) | **Not AI-related** |
| `digitalCapture` | Captured with a camera | Not AI-related |

It is read from `c2pa.actions` / `c2pa.actions.v2` assertions, from the
`stds.iptc.photo-metadata` assertion, and from `Iptc4xmpExt:DigitalSourceType` in XMP.

Findings are separated by how strong the evidence is:

- **explicit** — a formal declaration in C2PA or IPTC fields
- **heuristic** — an AI tool name appearing in a free-text field such as EXIF `Software`.
  This is reported, but always labelled as unverified, because such fields can be edited
  by anyone.

Every finding is shown together with the exact field it came from, so you can check the
reasoning yourself.

---

## Results

Sourceglass reports one of three outcomes. None of them is a verdict about the image.

| Outcome | Meaning |
| --- | --- |
| **AI-related provenance found** | A record indicating AI generation or editing was present. Sourceglass does not guarantee that the record itself is truthful. |
| **No AI-related record found** | Nothing in the provenance data indicated AI. This does **not** mean AI was not used. |
| **No provenance record remains** | Nothing usable was found. Nothing can be concluded about this image. |

Sourceglass also shows **what it checked**, because "not found" means nothing without
knowing where it looked.

---

## Known limitations

- **The absence of provenance proves nothing.** Metadata is removed by re-saving, resizing,
  screenshotting, and by nearly every social platform.
- **Metadata can be forged.** A record saying an image was captured by a camera does not
  make it true. Sourceglass reports what is recorded, not whether it is honest.
- **No trust evaluation.** Sourceglass does not currently evaluate whether a C2PA signer is
  on a trust list. It reports the validation state it is given, and says so.
- **No remote manifests.** C2PA manifests stored remotely rather than embedded are not
  fetched, and therefore not detected. This is a deliberate consequence of not making
  network requests.
- **Pixel-level watermarks are not yet checked.** See the roadmap below.

---

## Roadmap

| Version | Scope |
| --- | --- |
| **v0.1** | Metadata layer — EXIF, XMP, C2PA |
| **v0.2** | Pixel layer — [TrustMark](https://github.com/adobe/trustmark) watermark decoding, run locally |
| **v0.3** | Undecided — likely a public detector plugin API |
| Future | SynthID, if and when a local detector for images is published |

Watermarks matter because they survive the re-encoding that destroys metadata. Decoding one
is still a fact, not a guess: either the payload comes out intact or it does not.

Full reasoning: [`ai_tasks/20260804_sourceglass_mvp_design/roadmap.md`](./ai_tasks/20260804_sourceglass_mvp_design/roadmap.md)

---

## Tech stack

- **Vite** + **TypeScript** (strict) + **React**
- [`@contentauth/c2pa-web`](https://github.com/contentauth/c2pa-js) — C2PA reading and validation (WebAssembly)
- [`ExifReader`](https://github.com/mattiasw/ExifReader) — EXIF / XMP / IPTC parsing

Dependencies are kept deliberately small. No UI framework, no i18n library, no state
library. Nothing that phones home.

The analysis engine lives in `src/features/provenance/` and has no dependency on React or
the DOM, so it can be extracted as a standalone package later.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build       # static output in dist/
npm run test        # engine tests (Vitest)
npm run test:e2e    # privacy verification (Playwright)
npm run typecheck
```

The build output is a plain static site. Host it anywhere that can serve files and set
headers.

## Contributing

Contributions are welcome, with one hard rule:

**No feature may guess.** Anything that infers AI usage from image content — a classifier,
a heuristic on pixels, a third-party detection API — is out of scope permanently. That is
not a limitation of the current version; it is what Sourceglass is.

If you are working on this repo with an AI coding agent, read [`AGENTS.md`](./AGENTS.md) first.

## License

MIT — see [`LICENSE`](./LICENSE).

Third-party components are listed in [`NOTICE`](./NOTICE), including:

- `@contentauth/c2pa-web` — MIT
- `ExifReader` — MPL-2.0 (used unmodified; file-level copyleft does not extend to this project)
- C2PA public test files used as fixtures — CC BY-SA, redistributed unmodified
