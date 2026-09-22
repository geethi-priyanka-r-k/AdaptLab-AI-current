import type { Page } from "playwright";
import type { ResourceEvidence, PerformanceEvidence } from "./types";

export async function collectPerformance(
  page: Page,
  resources: ResourceEvidence[],
): Promise<PerformanceEvidence> {
  const timeline = await page.evaluate(() => {
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const layoutShifts = performance.getEntriesByType("layout-shift") as Array<
      PerformanceEntry & { value?: number; hadRecentInput?: boolean }
    >;
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return {
      lcp: lcpEntries.at(-1)?.startTime ?? null,
      cls: layoutShifts.reduce(
        (total, entry) => total + (entry.hadRecentInput ? 0 : entry.value ?? 0),
        0,
      ),
      navigation: navigation
        ? {
            domContentLoadedMs: navigation.domContentLoadedEventEnd || null,
            loadEventMs: navigation.loadEventEnd || null,
            responseMs: navigation.responseEnd || null,
            transferSize: navigation.transferSize || null,
          }
        : null,
    };
  });
  const byType = (type: string) =>
    resources
      .filter((resource) => resource.resourceType === type)
      .reduce((sum, resource) => sum + (resource.transferSize ?? 0), 0);
  const total = resources.reduce((sum, resource) => sum + (resource.transferSize ?? 0), 0);
  return {
    fcpMs: null,
    lcpMs: timeline.lcp,
    cls: timeline.cls,
    navigation: timeline.navigation,
    resourceCount: resources.length,
    javascriptTransferBytes: byType("script") || null,
    imageTransferBytes: byType("image") || null,
    totalTransferBytes: total || null,
  };
}