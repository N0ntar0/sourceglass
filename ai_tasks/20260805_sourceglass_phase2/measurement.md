# Last Updated: 2026-08-05 11:10

# Phase 2 ExifReader main-thread measurement

## Environment

- Node.js: v24.13.0
- Browser: Playwright Chromium 151.0.7865.0 (headless)
- ExifReader: 4.41.3
- Vite HTTPS development server with the production CSP
- Measurement: `performance.now()` immediately before and after synchronous
  `ExifReader.load(bytes, { expanded: true })`

## Normal large JPEG

Input: `fixtures/performance-large.jpg` (13,308,988 bytes). The file is a deterministic
high-entropy JPEG without a large metadata block.

```json
[
  { "bytes": 13308988, "elapsedMs": 1.5 },
  { "bytes": 13308988, "elapsedMs": 0.30000001192092896 },
  { "bytes": 13308988, "elapsedMs": 0.20000000298023224 },
  { "bytes": 13308988, "elapsedMs": 0.09999999403953552 },
  { "bytes": 13308988, "elapsedMs": 0.09999999403953552 }
]
```

## JPEG with huge XMP

Input: `fixtures/broken-huge-exif.jpg` (11,016,908 bytes). The file contains an approximately
11 MB XMP `dc:Description` value and exercises the required oversized-metadata case.

```json
[
  { "bytes": 11016908, "elapsedMs": 3250.5999999940395 },
  { "bytes": 11016908, "elapsedMs": 2855.9000000059605 },
  { "bytes": 11016908, "elapsedMs": 3001.3999999910593 },
  { "bytes": 11016908, "elapsedMs": 3603.0999999940395 },
  { "bytes": 11016908, "elapsedMs": 3764.5 }
]
```

## Outcome

The normal large file is below the 50 ms threshold. The oversized-XMP case exceeds it by a wide
margin. Per D-013 and the Phase 2 instructions, engine implementation is paused pending a design
decision about the EXIF/XMP detector execution strategy and oversized metadata handling.
