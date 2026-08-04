import {
  createC2pa,
  type C2paSdk,
  type ManifestStore,
  type Reader,
  type Settings,
  type VerifySettings,
} from '@contentauth/c2pa-web';
import workerSrc from '@contentauth/c2pa-web/c2pa_worker?url';
import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

interface VerifySettingsWithRemoteManifestFetch extends VerifySettings {
  /** Present in the bundled c2pa-rs WASM settings, but omitted from c2pa-web 0.13.1 Settings.d.ts. */
  remoteManifestFetch: boolean;
}

interface SettingsWithRemoteManifestFetch extends Settings {
  verify: VerifySettingsWithRemoteManifestFetch;
}

interface SerializedError {
  name: string;
  message: string;
  stack: string | null;
  cause: string | null;
  ownProperties: Record<string, string>;
}

interface BlockingMeasurement {
  elapsedMs: number;
  maxTimerGapMs: number;
  estimatedMaxBlockMs: number;
  longTasks: Array<{ startTime: number; duration: number }>;
}

interface ReaderOutcome {
  readerWasNull: boolean;
  error: SerializedError | null;
  manifestStore: ManifestStore | null;
}

interface SpikeResult {
  environment: {
    userAgent: string;
    crossOriginIsolated: boolean;
    wasmUrl: string;
    workerAssetUrl: string;
    workerMode: 'same-origin-url' | 'inline-blob';
  };
  initializationMs: number;
  c2paImage: ReaderOutcome;
  digitalSourceTypePdf: ReaderOutcome & { paths: Array<{ path: string; value: unknown }> };
  trustDisabled: ReaderOutcome;
  noC2paImage: ReaderOutcome;
  corruptImage: ReaderOutcome;
  zeroByteImage: ReaderOutcome;
  remoteManifestFetchSettingAccepted: ReaderOutcome;
  mainThreadMeasurements: BlockingMeasurement[];
  resourceEntries: Array<{ name: string; initiatorType: string; duration: number; transferSize: number }>;
}

declare global {
  interface Window {
    __SOURCEGLASS_SPIKE__: SpikeResult | null;
  }
}

const output = document.querySelector<HTMLPreElement>('#output');
const runButton = document.querySelector<HTMLButtonElement>('#run');

if (output === null || runButton === null) {
  throw new Error('Spike controls were not found.');
}

const outputElement = output;
const runButtonElement = runButton;

window.__SOURCEGLASS_SPIKE__ = null;

function serializeError(value: unknown): SerializedError {
  if (!(value instanceof Error)) {
    return {
      name: typeof value,
      message: String(value),
      stack: null,
      cause: null,
      ownProperties: {},
    };
  }

  const ownProperties = Object.fromEntries(
    Object.getOwnPropertyNames(value).map((key) => [key, String(Reflect.get(value, key))]),
  );

  return {
    name: value.name,
    message: value.message,
    stack: value.stack ?? null,
    cause: value.cause === undefined ? null : String(value.cause),
    ownProperties,
  };
}

async function fetchBlob(path: string, type: string): Promise<Blob> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Fixture fetch failed: ${response.status} ${response.statusText}`);
  }
  return new Blob([await response.arrayBuffer()], { type });
}

async function readBlob(
  sdk: C2paSdk,
  format: string,
  blob: Blob,
  settings?: Settings,
): Promise<ReaderOutcome> {
  let reader: Reader | null = null;
  try {
    reader = await sdk.reader.fromBlob(format, blob, settings);
    if (reader === null) {
      return { readerWasNull: true, error: null, manifestStore: null };
    }
    return {
      readerWasNull: false,
      error: null,
      manifestStore: await reader.manifestStore(),
    };
  } catch (error: unknown) {
    return { readerWasNull: false, error: serializeError(error), manifestStore: null };
  } finally {
    await reader?.free();
  }
}

function findKey(value: unknown, targetKey: string, path = '$'): Array<{ path: string; value: unknown }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findKey(item, targetKey, `${path}[${index}]`));
  }
  if (value === null || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    const current = key === targetKey ? [{ path: childPath, value: child }] : [];
    return [...current, ...findKey(child, targetKey, childPath)];
  });
}

async function measureMainThread<T>(operation: () => Promise<T>): Promise<[T, BlockingMeasurement]> {
  const timerGaps: number[] = [];
  const longTasks: Array<{ startTime: number; duration: number }> = [];
  let previousTick = performance.now();
  const intervalMs = 4;
  const timer = window.setInterval(() => {
    const now = performance.now();
    timerGaps.push(now - previousTick);
    previousTick = now;
  }, intervalMs);

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      longTasks.push({ startTime: entry.startTime, duration: entry.duration });
    }
  });

  try {
    observer.observe({ type: 'longtask', buffered: false });
  } catch {
    // Chrome supports Long Tasks; retaining timer-gap data keeps this harness usable elsewhere.
  }

  const startedAt = performance.now();
  try {
    const result = await operation();
    await new Promise<void>((resolve) => window.setTimeout(resolve, intervalMs * 2));
    const elapsedMs = performance.now() - startedAt;
    const maxTimerGapMs = timerGaps.length === 0 ? 0 : Math.max(...timerGaps);
    return [
      result,
      {
        elapsedMs,
        maxTimerGapMs,
        estimatedMaxBlockMs: Math.max(0, maxTimerGapMs - intervalMs),
        longTasks,
      },
    ];
  } finally {
    window.clearInterval(timer);
    observer.disconnect();
  }
}

async function run(): Promise<void> {
  runButtonElement.disabled = true;
  outputElement.textContent = 'Running…';

  let sdk: C2paSdk | null = null;
  try {
    performance.clearResourceTimings();
    const initializationStartedAt = performance.now();
    const canUseWorkerUrl = window.location.protocol === 'https:';
    sdk = await createC2pa({
      wasmSrc,
      ...(canUseWorkerUrl ? { workerSrc: new URL(workerSrc, window.location.href) } : {}),
    });
    const activeSdk = sdk;
    const initializationMs = performance.now() - initializationStartedAt;

    const [c2paBlob, noC2paBlob, complexBlob, invalidAssertionBlob, pdfBlob] = await Promise.all([
      fetchBlob('/fixtures/adobe-20220124-CA.jpg', 'image/jpeg'),
      fetchBlob('/fixtures/adobe-20220124-A.jpg', 'image/jpeg'),
      fetchBlob('/fixtures/adobe-20220124-CAIAIIICAICIICAIICICA.jpg', 'image/jpeg'),
      fetchBlob('/fixtures/adobe-20220124-E-uri-CA.jpg', 'image/jpeg'),
      fetchBlob('/fixtures/adobe-20240110-single_manifest_store.pdf', 'application/pdf'),
    ]);

    const c2paImage = await readBlob(activeSdk, 'image/jpeg', c2paBlob);
    const digitalSourceTypePdfBase = await readBlob(activeSdk, 'application/pdf', pdfBlob);
    const digitalSourceTypePdf = {
      ...digitalSourceTypePdfBase,
      paths: findKey(digitalSourceTypePdfBase.manifestStore, 'digitalSourceType'),
    };
    const trustDisabled = await readBlob(activeSdk, 'image/jpeg', c2paBlob, {
      verify: { verifyTrust: false, verifyAfterReading: true },
    });
    const noC2paImage = await readBlob(activeSdk, 'image/jpeg', noC2paBlob);
    const corruptImage = await readBlob(
      activeSdk,
      'image/jpeg',
      new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20, 0x43, 0x32])], {
        type: 'image/jpeg',
      }),
    );
    const zeroByteImage = await readBlob(activeSdk, 'image/jpeg', new Blob([], { type: 'image/jpeg' }));

    const remoteManifestSettings: SettingsWithRemoteManifestFetch = {
      verify: { remoteManifestFetch: false, verifyAfterReading: true, verifyTrust: true },
    };
    const remoteManifestFetchSettingAccepted = await readBlob(
      activeSdk,
      'image/jpeg',
      invalidAssertionBlob,
      remoteManifestSettings,
    );

    const mainThreadMeasurements: BlockingMeasurement[] = [];
    for (let index = 0; index < 5; index += 1) {
      const [, measurement] = await measureMainThread(() =>
        readBlob(activeSdk, 'image/jpeg', complexBlob),
      );
      mainThreadMeasurements.push(measurement);
    }

    const resourceEntries = performance.getEntriesByType('resource').map((entry) => {
      const resource = entry as PerformanceResourceTiming;
      return {
        name: resource.name,
        initiatorType: resource.initiatorType,
        duration: resource.duration,
        transferSize: resource.transferSize,
      };
    });

    const result: SpikeResult = {
      environment: {
        userAgent: navigator.userAgent,
        crossOriginIsolated,
        wasmUrl: new URL(wasmSrc, window.location.href).href,
        workerAssetUrl: new URL(workerSrc, window.location.href).href,
        workerMode: canUseWorkerUrl ? 'same-origin-url' : 'inline-blob',
      },
      initializationMs,
      c2paImage,
      digitalSourceTypePdf,
      trustDisabled,
      noC2paImage,
      corruptImage,
      zeroByteImage,
      remoteManifestFetchSettingAccepted,
      mainThreadMeasurements,
      resourceEntries,
    };

    window.__SOURCEGLASS_SPIKE__ = result;
    outputElement.textContent = JSON.stringify(result, null, 2);
    console.log('SOURCEGLASS_SPIKE_RESULT', result);
  } catch (error: unknown) {
    const serialized = serializeError(error);
    outputElement.textContent = JSON.stringify(serialized, null, 2);
    console.error('SOURCEGLASS_SPIKE_FAILED', serialized);
  } finally {
    sdk?.dispose();
    runButtonElement.disabled = false;
  }
}

runButtonElement.addEventListener('click', () => {
  void run();
});
