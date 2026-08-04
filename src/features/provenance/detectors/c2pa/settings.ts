import type { Settings, VerifySettings } from "@contentauth/c2pa-web";

interface VerifySettingsWithNetworkDefense extends VerifySettings {
  remoteManifestFetch: boolean;
  ocspFetch: boolean;
}

interface SettingsWithNetworkDefense extends Settings {
  verify: VerifySettingsWithNetworkDefense;
}

/**
 * The unpublished flags are defense in depth only. CSP `connect-src 'self'` remains the guarantee
 * that image-related data cannot be sent to another origin.
 */
export const C2PA_SETTINGS: SettingsWithNetworkDefense = {
  verify: {
    verifyAfterReading: true,
    verifyTrust: true,
    remoteManifestFetch: false,
    ocspFetch: false,
  },
};
