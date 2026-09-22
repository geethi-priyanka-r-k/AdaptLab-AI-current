import { chromium, type BrowserContext, type Page } from "playwright";
import { createBrowserConfiguration, markNetworkApplied } from "./environment-profiles";
import { ResourceCollector } from "./resource-collector";
import type { BrowserConfiguration, MockSutScenario, ObservedEvidence, TestProfileKey } from "./types";
import { mockSutHtml } from "./mock-sut";
import { validateSutUrl } from "./url-policy";
import { collectPerformance } from "./performance-collector";

type BrowserRunInput = {
  url: string;
  profile: TestProfileKey;
  device?: "desktop" | "mobile";
  mockSut?: MockSutScenario;
  timeoutMs?: number;
};

async function applyNetworkConditions(context: BrowserContext, configuration: BrowserConfiguration) {
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const client = await context.newCDPSession(page);
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: configuration.network.downloadThroughputBps,
      uploadThroughput: configuration.network.uploadThroughputBps,
      latency: configuration.network.latencyMs,
    });
    return true;
  } catch {
    return false;
  }
}

export async function runBrowser(input: BrowserRunInput): Promise<{
  evidence: ObservedEvidence;
}> {
  const configuration = createBrowserConfiguration(input.profile, input.device);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: configuration.device.viewport,
    ...(configuration.device.userAgent ? { userAgent: configuration.device.userAgent, isMobile: true } : {}),
  });
  const page = await context.newPage();
  const networkApplied = await applyNetworkConditions(context, configuration);
  const actualConfiguration = markNetworkApplied(configuration, networkApplied);
  const collector = new ResourceCollector();
  collector.attach(page);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  let navigationError: string | null = null;
  try {
    if (input.mockSut) {
      await page.setContent(mockSutHtml(input.mockSut), { waitUntil: "load", timeout: input.timeoutMs ?? 30_000 });
    } else {
      validateSutUrl(input.url);
      await page.goto(input.url, { waitUntil: "networkidle", timeout: input.timeoutMs ?? 30_000 });
    }
  } catch (error) {
    navigationError = error instanceof Error ? error.message : "Navigation failed.";
  }
  await page.waitForTimeout(100);
  const pageTimeline = await collector.collectPageEvidence(page);
  const performance = await collectPerformance(page, collector.resources);
  const title = await page.title().catch(() => "");
  const evidence: ObservedEvidence = {
    browser: {
      ...actualConfiguration,
      device: {
        ...actualConfiguration.device,
        hardwareConcurrency: pageTimeline.hardwareConcurrency,
        deviceMemoryGb: pageTimeline.deviceMemory,
      },
    },
    resources: collector.resources,
    images: collector.images,
    scripts: collector.scripts,
    performance: {
      ...performance,
      fcpMs: pageTimeline.fcp,
    },
    page: {
      finalUrl: page.url(),
      title,
      consoleErrors,
      navigationError,
      isMockSut: Boolean(input.mockSut),
    },
  };
  await browser.close();
  return { evidence };
}