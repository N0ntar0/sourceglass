#!/usr/bin/env bash

set -euo pipefail

readonly REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly FIXTURES_DIR="$REPOSITORY_ROOT/fixtures"
readonly MANIFESTS_DIR="$REPOSITORY_ROOT/scripts/fixtures"
readonly PUBLIC_TESTFILES_REVISION="22beccc075707475b038d8789d0136c009e43143"
readonly GENERATOR_CONFIG='{"claim_generator_info":[{"name":"Sourceglass fixture builder","version":"1.0"}]}'
readonly IPTC_BASE="http://cv.iptc.org/newscodes/digitalsourcetype"

for tool in c2patool exiftool ffmpeg curl sha256sum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Required fixture tool is unavailable: $tool" >&2
    exit 1
  fi
done

work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT

mkdir -p "$FIXTURES_DIR/official"

ffmpeg -hide_banner -loglevel error -f lavfi -i color=c=white:s=128x128 \
  -frames:v 1 "$work_dir/base.jpg"
ffmpeg -hide_banner -loglevel error -f lavfi -i color=c=white:s=128x128 \
  -frames:v 1 "$work_dir/base.png"
ffmpeg -hide_banner -loglevel error -f lavfi -i color=c=white:s=128x128 \
  -frames:v 1 "$work_dir/base.webp"
ffmpeg -hide_banner -loglevel error -f lavfi -i color=c=white:s=128x128 \
  -frames:v 1 "$work_dir/base.avif"
ffmpeg -hide_banner -loglevel error -y -f lavfi \
  -i "nullsrc=s=5000x5000,noise=alls=100:allf=u" -frames:v 1 -q:v 1 \
  "$FIXTURES_DIR/performance-large.jpg"

sign_created() {
  local source_type="$1"
  local input="$2"
  local output="$3"

  c2patool "$input" --force --config "$GENERATOR_CONFIG" --create "$source_type" \
    --output "$output" >/dev/null
}

sign_manifest() {
  local manifest="$1"
  local input="$2"
  local output="$3"

  c2patool "$input" --force --manifest "$manifest" --output "$output" >/dev/null
}

sign_created trainedAlgorithmicMedia "$work_dir/base.jpg" "$FIXTURES_DIR/c2pa-ai-trained.jpg"
sign_created compositeWithTrainedAlgorithmicMedia "$work_dir/base.jpg" "$FIXTURES_DIR/c2pa-ai-composite.jpg"
sign_created algorithmicMedia "$work_dir/base.jpg" "$FIXTURES_DIR/c2pa-algorithmic.jpg"
sign_created digitalCapture "$work_dir/base.jpg" "$FIXTURES_DIR/c2pa-capture.jpg"
sign_manifest "$MANIFESTS_DIR/c2pa-multi-action.json" "$work_dir/base.jpg" \
  "$FIXTURES_DIR/c2pa-multi-action.jpg"
sign_manifest "$MANIFESTS_DIR/c2pa-iptc-assertion.json" "$work_dir/base.jpg" \
  "$FIXTURES_DIR/c2pa-iptc-assertion.jpg"

cp "$work_dir/base.jpg" "$FIXTURES_DIR/xmp-ai-dst.jpg"
exiftool -overwrite_original \
  "-XMP-iptcExt:DigitalSourceType=$IPTC_BASE/trainedAlgorithmicMedia" \
  "$FIXTURES_DIR/xmp-ai-dst.jpg" >/dev/null

cp "$work_dir/base.jpg" "$FIXTURES_DIR/xmp-creator-aitool.jpg"
exiftool -overwrite_original -XMP-xmp:CreatorTool="OpenAI GPT Image" \
  "$FIXTURES_DIR/xmp-creator-aitool.jpg" >/dev/null

cp "$work_dir/base.jpg" "$FIXTURES_DIR/exif-software-aitool.jpg"
exiftool -overwrite_original -EXIF:Software="OpenAI GPT Image" \
  "$FIXTURES_DIR/exif-software-aitool.jpg" >/dev/null

cp "$work_dir/base.jpg" "$FIXTURES_DIR/exif-rich-no-c2pa.jpg"
exiftool -overwrite_original -EXIF:Software="Sourceglass Fixture Camera" \
  -EXIF:DateTimeOriginal="2026:08:05 10:00:00" -EXIF:Artist="Sourceglass" \
  -EXIF:Copyright="Sourceglass fixture" -EXIF:Make="Sourceglass" \
  -EXIF:Model="Fixture Camera" "$FIXTURES_DIR/exif-rich-no-c2pa.jpg" >/dev/null

cp "$work_dir/base.jpg" "$FIXTURES_DIR/exif-technical-only.jpg"
exiftool -overwrite_original -n -EXIF:ColorSpace=1 -EXIF:ExifImageWidth=128 \
  -EXIF:ExifImageHeight=128 "$FIXTURES_DIR/exif-technical-only.jpg" >/dev/null

cp "$work_dir/base.jpg" "$FIXTURES_DIR/no-metadata.jpg"

cp "$work_dir/base.jpg" "$FIXTURES_DIR/remote-only.jpg"
exiftool -config "$MANIFESTS_DIR/exiftool.config" -overwrite_original \
  -XMP-dcterms:Provenance="https://example.invalid/manifest.c2pa" \
  "$FIXTURES_DIR/remote-only.jpg" >/dev/null

cp "$work_dir/base.png" "$FIXTURES_DIR/png-exif.png"
exiftool -overwrite_original -EXIF:Software="Sourceglass Fixture Camera" \
  "$FIXTURES_DIR/png-exif.png" >/dev/null
cp "$work_dir/base.png" "$FIXTURES_DIR/png-xmp.png"
exiftool -overwrite_original -XMP-xmp:CreatorTool="Sourceglass Fixture Editor" \
  "$FIXTURES_DIR/png-xmp.png" >/dev/null
sign_created digitalCapture "$work_dir/base.png" "$FIXTURES_DIR/png-c2pa.png"

cp "$work_dir/base.webp" "$FIXTURES_DIR/webp-exif.webp"
exiftool -overwrite_original -EXIF:Software="Sourceglass Fixture Camera" \
  "$FIXTURES_DIR/webp-exif.webp" >/dev/null
cp "$work_dir/base.webp" "$FIXTURES_DIR/webp-xmp.webp"
exiftool -overwrite_original -XMP-xmp:CreatorTool="Sourceglass Fixture Editor" \
  "$FIXTURES_DIR/webp-xmp.webp" >/dev/null
sign_created digitalCapture "$work_dir/base.webp" "$FIXTURES_DIR/webp-c2pa.webp"

cp "$work_dir/base.avif" "$FIXTURES_DIR/avif-exif.avif"
exiftool -overwrite_original -EXIF:Software="Sourceglass Fixture Camera" \
  "$FIXTURES_DIR/avif-exif.avif" >/dev/null

head -c 64 "$work_dir/base.jpg" >"$FIXTURES_DIR/broken-truncated.jpg"
printf 'This is not an image.\n' >"$FIXTURES_DIR/broken-not-image.jpg"
: >"$FIXTURES_DIR/broken-zero-byte.jpg"

head -c 11000000 /dev/zero | tr '\0' X >"$work_dir/large-xmp.txt"
cp "$work_dir/base.jpg" "$FIXTURES_DIR/broken-huge-exif.jpg"
exiftool -overwrite_original "-XMP-dc:Description<=$work_dir/large-xmp.txt" \
  "$FIXTURES_DIR/broken-huge-exif.jpg" >/dev/null

for official_path in \
  legacy/1.4/image/jpeg/adobe-20220124-CA.jpg \
  legacy/1.4/image/jpeg/adobe-20220124-E-uri-CA.jpg; do
  curl -fsSL \
    "https://raw.githubusercontent.com/c2pa-org/public-testfiles/$PUBLIC_TESTFILES_REVISION/$official_path" \
    -o "$FIXTURES_DIR/official/${official_path##*/}"
done

find "$FIXTURES_DIR" -type f ! -name README.md ! -name SHA256SUMS -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sed "s|$REPOSITORY_ROOT/||" >"$FIXTURES_DIR/SHA256SUMS"
