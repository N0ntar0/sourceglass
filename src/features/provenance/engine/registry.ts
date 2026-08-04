import { c2paDetector } from "../detectors/c2pa/detector";
import { exifDetector } from "../detectors/exif/detector";
import { xmpDetector } from "../detectors/xmp/detector";
import type { Detector } from "../types";

export const DETECTORS: readonly Detector[] = [
  c2paDetector,
  exifDetector,
  xmpDetector,
];
