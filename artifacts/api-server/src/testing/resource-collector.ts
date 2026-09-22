import type { Page, Request, Response } from "playwright";
import type {
  ImageEvidence,
  JavaScriptEvidence,
  ResourceEvidence,
} from "./types";

export class ResourceCollector {
  readonly resources: ResourceEvidence[] = [];
  readonly images: ImageEvidence[] = [];
  readonly scripts: JavaScriptEvidence[] = [];
  private readonly startedAt = new WeakMap<Request, number>();
  private readonly responseByUrl = new Map<string, ResourceEvidence>();

  attach(page: Page) {
    page.on("request", (request) => {
      this.startedAt.set(request, Date.now());
    });
    page.on("response", (response) => {
      void this.recordResponse(response);
    });
  }

  private async recordResponse(response: Response) {
    const request = response.request();
    const headers = response.headers();
    const contentType = headers["content-type"] ?? null;
    const contentLength = Number(headers["content-length"]);
    let bodySize: number | null = Number.isFinite(contentLength) ? contentLength : null;
    if (bodySize == null && ["script", "stylesheet", "image"].includes(request.resourceType())) {
      try {
        bodySize = (await response.body()).byteLength;
      } catch {
        bodySize = null;
      }
    }
    const record: ResourceEvidence = {
      url: response.url(),
      resourceType: request.resourceType(),
      status: response.status(),
      contentType,
      transferSize: bodySize,
      encodedBodySize: bodySize,
      decodedBodySize: null,
      durationMs: this.startedAt.has(request)
        ? Date.now() - (this.startedAt.get(request) ?? Date.now())
        : null,
      initiator: null,
    };
    this.resources.push(record);
    this.responseByUrl.set(record.url, record);
  }

  async collectPageEvidence(page: Page) {
    const pageEvidence = await page.evaluate(() => {
      const images = Array.from(document.images).map((image) => ({
        url: image.currentSrc || image.src,
        naturalWidth: image.naturalWidth || null,
        naturalHeight: image.naturalHeight || null,
        displayedWidth: image.getBoundingClientRect().width || null,
        displayedHeight: image.getBoundingClientRect().height || null,
      }));
      const entries = performance.getEntriesByType("resource").map((entry) => {
        const resource = entry as PerformanceResourceTiming;
        return {
          name: resource.name,
          duration: resource.duration,
          transferSize: resource.transferSize || null,
          decodedBodySize: resource.decodedBodySize || null,
          initiatorType: resource.initiatorType,
        };
      });
      const navigation = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const paints = performance.getEntriesByType("paint");
      return {
        images,
        entries,
        navigation: navigation
          ? {
              domContentLoaded: navigation.domContentLoadedEventEnd,
              loadEvent: navigation.loadEventEnd,
              response: navigation.responseEnd,
              transferSize: navigation.transferSize || null,
            }
          : null,
        fcp: paints.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? null,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        deviceMemory: "deviceMemory" in navigator ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null : null,
      };
    });

    for (const image of pageEvidence.images) {
      const resource = this.responseByUrl.get(image.url);
      const resourceSize = resource?.transferSize ?? null;
      this.images.push({
        ...image,
        resourceSize,
        contentType: resource?.contentType ?? null,
        policyClassification:
          resourceSize == null ? "unknown" : resourceSize <= 80_000 ? "low" : resourceSize <= 300_000 ? "medium" : "high",
      });
    }
    for (const entry of pageEvidence.entries.filter((entry) => entry.initiatorType === "script")) {
      const resource = this.responseByUrl.get(entry.name);
      this.scripts.push({
        url: entry.name,
        transferSize: entry.transferSize ?? resource?.transferSize ?? null,
        durationMs: entry.duration,
        loadingTimingMs: entry.duration,
        classification: entry.duration > 500 ? "full" : entry.duration > 150 ? "deferred" : "minimal",
      });
    }
    return pageEvidence;
  }
}