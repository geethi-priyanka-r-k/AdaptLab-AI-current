import type { BrowserConfiguration, TestProfileKey } from "./types";

const profiles = {
  low: {
    name: "Slow 3G",
    downloadThroughputBps: 500_000,
    uploadThroughputBps: 500_000,
    latencyMs: 400,
  },
  medium: {
    name: "Fast 3G",
    downloadThroughputBps: 1_600_000,
    uploadThroughputBps: 750_000,
    latencyMs: 150,
  },
  high: {
    name: "4G",
    downloadThroughputBps: 9_000_000,
    uploadThroughputBps: 3_000_000,
    latencyMs: 40,
  },
} satisfies Record<
  TestProfileKey,
  {
    name: string;
    downloadThroughputBps: number;
    uploadThroughputBps: number;
    latencyMs: number;
  }
>;

const mobileUserAgent =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36";

export function createBrowserConfiguration(
  profile: TestProfileKey,
  device: "desktop" | "mobile" = "desktop",
): BrowserConfiguration {
  const network = profiles[profile];
  const isMobile = device === "mobile";
  return {
    requestedProfile: profile,
    network: {
      ...network,
      applied: false,
      mechanism: "chromium CDP Network.emulateNetworkConditions",
    },
    device: {
      name: device,
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      userAgent: isMobile ? mobileUserAgent : null,
      deviceClass: device,
      hardwareConcurrency: null,
      deviceMemoryGb: null,
    },
  };
}

export function markNetworkApplied(
  configuration: BrowserConfiguration,
  applied: boolean,
): BrowserConfiguration {
  return {
    ...configuration,
    network: { ...configuration.network, applied },
  };
}

export function getProfile(profile: TestProfileKey) {
  return profiles[profile];
}