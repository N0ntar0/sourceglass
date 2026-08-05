import type { C2paSdk } from "@contentauth/c2pa-web";

import { C2PA_SETTINGS } from "./settings";

let sdkPromise: Promise<C2paSdk> | undefined;

async function createSdk(): Promise<C2paSdk> {
  const [sdkModule, wasmModule, workerModule] = await Promise.all([
    import("@contentauth/c2pa-web"),
    import("@contentauth/c2pa-web/resources/c2pa.wasm?url"),
    import("@contentauth/c2pa-web/c2pa_worker?url"),
  ]);

  return sdkModule.createC2pa({
    wasmSrc: wasmModule.default,
    workerSrc: new URL(workerModule.default, import.meta.url),
    settings: C2PA_SETTINGS,
  });
}

export function getC2paSdk(): Promise<C2paSdk> {
  sdkPromise ??= createSdk();
  return sdkPromise;
}
