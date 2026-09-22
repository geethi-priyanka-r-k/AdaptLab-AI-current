import type { TestViolation, PerformanceEvidence } from "../testing/types";
import type { TestResultRecord } from "../services/workspace-store";

export type MetricChange = {
  metric: string;
  previous: number | null;
  current: number | null;
  change: number | null;
  changePercent: number | null;
  isRegression: boolean;
  isImprovement: boolean;
};

export type ViolationChange = {
  violation: TestViolation;
  status: "new" | "resolved" | "unchanged";
};

export type RegressionComparison = {
  metrics: MetricChange[];
  violations: {
    new: ViolationChange[];
    resolved: ViolationChange[];
    unchanged: ViolationChange[];
  };
  hasRegression: boolean;
  summary: string;
};

const REGRESSION_THRESHOLDS = {
  lcpMs: 500, // 500ms increase is a regression
  cls: 0.05, // 0.05 increase is a regression
  fcpMs: 300, // 300ms increase is a regression
  resourceCount: 10, // 10 more resources is a regression
  javascriptTransferBytes: 50 * 1024, // 50KB increase is a regression
  imageTransferBytes: 100 * 1024, // 100KB increase is a regression
  totalTransferBytes: 100 * 1024, // 100KB increase is a regression
};

function calculateMetricChange(
  metric: string,
  previous: number | null,
  current: number | null,
  threshold: number
): MetricChange {
  if (previous === null || current === null) {
    return {
      metric,
      previous,
      current,
      change: null,
      changePercent: null,
      isRegression: false,
      isImprovement: false,
    };
  }

  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : null;
  const isRegression = change > threshold;
  const isImprovement = change < -threshold;

  return {
    metric,
    previous,
    current,
    change,
    changePercent,
    isRegression,
    isImprovement,
  };
}

function compareViolations(
  previousViolations: TestViolation[],
  currentViolations: TestViolation[]
): {
  new: ViolationChange[];
  resolved: ViolationChange[];
  unchanged: ViolationChange[];
} {
  const previousSet = new Map(
    previousViolations.map((v) => [
      `${v.type}-${v.severity}-${v.message}`,
      v,
    ])
  );
  const currentSet = new Map(
    currentViolations.map((v) => [
      `${v.type}-${v.severity}-${v.message}`,
      v,
    ])
  );

  const newViolations: ViolationChange[] = [];
  const resolved: ViolationChange[] = [];
  const unchanged: ViolationChange[] = [];

  // Check for new violations
  for (const [key, violation] of currentSet) {
    if (!previousSet.has(key)) {
      newViolations.push({ violation, status: "new" });
    } else {
      unchanged.push({ violation, status: "unchanged" });
    }
  }

  // Check for resolved violations
  for (const [key, violation] of previousSet) {
    if (!currentSet.has(key)) {
      resolved.push({ violation, status: "resolved" });
    }
  }

  return { new: newViolations, resolved, unchanged };
}

export function compareTestResults(
  previous: TestResultRecord | null,
  current: TestResultRecord
): RegressionComparison {
  const metrics: MetricChange[] = [
    calculateMetricChange(
      "LCP",
      previous?.metrics.lcpMs ?? null,
      current.metrics.lcpMs,
      REGRESSION_THRESHOLDS.lcpMs
    ),
    calculateMetricChange(
      "CLS",
      previous?.metrics.cls ?? null,
      current.metrics.cls,
      REGRESSION_THRESHOLDS.cls
    ),
    calculateMetricChange(
      "FCP",
      previous?.metrics.fcpMs ?? null,
      current.metrics.fcpMs,
      REGRESSION_THRESHOLDS.fcpMs
    ),
    calculateMetricChange(
      "Resource Count",
      previous?.metrics.resourceCount ?? null,
      current.metrics.resourceCount,
      REGRESSION_THRESHOLDS.resourceCount
    ),
    calculateMetricChange(
      "JavaScript Transferred",
      previous?.metrics.javascriptTransferBytes ?? null,
      current.metrics.javascriptTransferBytes,
      REGRESSION_THRESHOLDS.javascriptTransferBytes
    ),
    calculateMetricChange(
      "Image Transferred",
      previous?.metrics.imageTransferBytes ?? null,
      current.metrics.imageTransferBytes,
      REGRESSION_THRESHOLDS.imageTransferBytes
    ),
    calculateMetricChange(
      "Total Transferred",
      previous?.metrics.totalTransferBytes ?? null,
      current.metrics.totalTransferBytes,
      REGRESSION_THRESHOLDS.totalTransferBytes
    ),
  ];

  const violations = compareViolations(
    previous?.violations ?? [],
    current.violations
  );

  const hasRegression =
    metrics.some((m) => m.isRegression) || violations.new.length > 0;

  const regressionCount = metrics.filter((m) => m.isRegression).length;
  const improvementCount = metrics.filter((m) => m.isImprovement).length;

  let summary = "No significant changes detected.";
  if (hasRegression) {
    summary = `${regressionCount} metric regression(s) and ${violations.new.length} new violation(s) detected.`;
  } else if (improvementCount > 0 || violations.resolved.length > 0) {
    summary = `${improvementCount} improvement(s) and ${violations.resolved.length} resolved violation(s).`;
  }

  return {
    metrics,
    violations,
    hasRegression,
    summary,
  };
}
