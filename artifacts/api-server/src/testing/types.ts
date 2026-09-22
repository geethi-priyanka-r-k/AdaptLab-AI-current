export type TestProfileKey = "low" | "medium" | "high";
export type TestMethod =
  | "adaptive_behavior"
  | "performance"
  | "resource"
  | "full_validation";

export type BrowserConfiguration = {
  requestedProfile: TestProfileKey;
  network: {
    name: string;
    applied: boolean;
    mechanism: string;
    downloadThroughputBps: number | null;
    uploadThroughputBps: number | null;
    latencyMs: number | null;
  };
  device: {
    name: "desktop" | "mobile";
    viewport: { width: number; height: number };
    userAgent: string | null;
    deviceClass: "desktop" | "mobile";
    hardwareConcurrency: number | null;
    deviceMemoryGb: number | null;
  };
};

export type ResourceEvidence = {
  url: string;
  resourceType: string;
  status: number | null;
  contentType: string | null;
  transferSize: number | null;
  encodedBodySize: number | null;
  decodedBodySize: number | null;
  durationMs: number | null;
  initiator: string | null;
};

export type ImageEvidence = {
  url: string;
  naturalWidth: number | null;
  naturalHeight: number | null;
  displayedWidth: number | null;
  displayedHeight: number | null;
  resourceSize: number | null;
  contentType: string | null;
  policyClassification: "low" | "medium" | "high" | "unknown";
};

export type JavaScriptEvidence = {
  url: string;
  transferSize: number | null;
  durationMs: number | null;
  loadingTimingMs: number | null;
  classification: "minimal" | "deferred" | "full" | "unknown";
};

export type PerformanceEvidence = {
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  navigation: {
    domContentLoadedMs: number | null;
    loadEventMs: number | null;
    responseMs: number | null;
    transferSize: number | null;
  } | null;
  resourceCount: number;
  javascriptTransferBytes: number | null;
  imageTransferBytes: number | null;
  totalTransferBytes: number | null;
};

export type ObservedEvidence = {
  browser: BrowserConfiguration;
  resources: ResourceEvidence[];
  images: ImageEvidence[];
  scripts: JavaScriptEvidence[];
  performance: PerformanceEvidence;
  page: {
    finalUrl: string;
    title: string;
    consoleErrors: string[];
    navigationError: string | null;
    isMockSut: boolean;
  };
};

export type TestViolation = {
  type:
    | "IMAGE_POLICY_MISMATCH"
    | "JAVASCRIPT_POLICY_MISMATCH"
    | "FEATURE_POLICY_MISMATCH"
    | "RESOURCE_SIZE_EXCEEDED"
    | "LCP_THRESHOLD_EXCEEDED"
    | "OTHER_PERFORMANCE_THRESHOLD";
  severity: "low" | "medium" | "high";
  expected: string | number;
  actual: string | number | null;
  message: string;
  evidenceReferences: string[];
};

export type ValidationResult = {
  status: "passed" | "violated";
  violations: TestViolation[];
  warnings: string[];
  evidenceReferences: string[];
};

export type TestExecutionResult = {
  status: "passed" | "violated" | "failed";
  signals: BrowserConfiguration & { detected: ObservedEvidence["page"] };
  resources: ResourceEvidence[];
  metrics: PerformanceEvidence;
  violations: TestViolation[];
  warnings: string[];
  error: string | null;
  analysis: {
    summary: string;
    rootCause: string;
    impact: string;
    explanation: string;
    recommendations: string[];
  } | null;
};

export type MockSutScenario = "low" | "medium" | "high";