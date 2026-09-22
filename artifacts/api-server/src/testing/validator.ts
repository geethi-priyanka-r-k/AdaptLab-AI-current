import type {
  AdaptiveContractInput,
} from "@workspace/api-zod";
import type {
  ImageEvidence,
  ObservedEvidence,
  TestProfileKey,
  TestViolation,
  ValidationResult,
} from "./types";

function policyRank(value: string) {
  return value === "low" || value === "minimal" || value === "reduced"
    ? 1
    : value === "medium" || value === "deferred" || value === "normal"
      ? 2
      : value === "high" || value === "full"
        ? 3
        : 0;
}

function imageClassification(image: ImageEvidence) {
  if (image.resourceSize == null) return image.policyClassification;
  if (image.resourceSize <= 80_000) return "low";
  if (image.resourceSize <= 300_000) return "medium";
  return "high";
}

export function classifyImageBehavior(image: ImageEvidence) {
  return imageClassification(image);
}

export function validateEvidence(
  contract: AdaptiveContractInput,
  profile: TestProfileKey,
  evidence: ObservedEvidence,
): ValidationResult {
  const violations: TestViolation[] = [];
  const warnings: string[] = [];
  const references: string[] = [];
  const actualImagePolicy =
    evidence.images.length === 0
      ? "unknown"
      : evidence.images
          .map(imageClassification)
          .sort((a, b) => policyRank(b) - policyRank(a))[0];
  if (actualImagePolicy !== "unknown" && policyRank(actualImagePolicy) > policyRank(contract.imagePolicy)) {
    violations.push({
      type: "IMAGE_POLICY_MISMATCH",
      severity: "medium",
      expected: contract.imagePolicy,
      actual: actualImagePolicy,
      message: `Observed image behavior exceeds the ${contract.imagePolicy} image policy.`,
      evidenceReferences: evidence.images.map((image) => image.url),
    });
    references.push(...evidence.images.map((image) => image.url));
  }

  const expectedJsRank = policyRank(contract.javascriptPolicy);
  const actualJsRank = evidence.scripts.length
    ? Math.max(...evidence.scripts.map((script) => policyRank(script.classification)))
    : 0;
  if (actualJsRank > expectedJsRank) {
    violations.push({
      type: "JAVASCRIPT_POLICY_MISMATCH",
      severity: "medium",
      expected: contract.javascriptPolicy,
      actual: evidence.scripts[0]?.classification ?? "unknown",
      message: `Observed JavaScript loading exceeds the ${contract.javascriptPolicy} JavaScript policy.`,
      evidenceReferences: evidence.scripts.map((script) => script.url),
    });
    references.push(...evidence.scripts.map((script) => script.url));
  }

  const oversized = evidence.resources.filter(
    (resource) => resource.transferSize != null && resource.transferSize > contract.maxResourceSizeKb * 1024,
  );
  if (oversized.length) {
    violations.push({
      type: "RESOURCE_SIZE_EXCEEDED",
      severity: "high",
      expected: contract.maxResourceSizeKb * 1024,
      actual: Math.max(...oversized.map((resource) => resource.transferSize ?? 0)),
      message: `${oversized.length} resource(s) exceed the configured resource budget.`,
      evidenceReferences: oversized.map((resource) => resource.url),
    });
    references.push(...oversized.map((resource) => resource.url));
  }

  if (evidence.performance.lcpMs != null && evidence.performance.lcpMs > contract.maxLcpMs) {
    violations.push({
      type: "LCP_THRESHOLD_EXCEEDED",
      severity: "high",
      expected: contract.maxLcpMs,
      actual: evidence.performance.lcpMs,
      message: "Largest Contentful Paint exceeds the configured threshold.",
      evidenceReferences: [evidence.page.finalUrl],
    });
    references.push(evidence.page.finalUrl);
  } else if (evidence.performance.lcpMs == null) {
    warnings.push("LCP was unavailable in the browser performance timeline.");
  }

  if (profile !== contract.profile) {
    warnings.push(`Run profile ${profile} differs from contract profile ${contract.profile}.`);
  }
  if (evidence.page.consoleErrors.length) {
    warnings.push(`${evidence.page.consoleErrors.length} browser console error(s) were observed.`);
  }
  return {
    status: violations.length ? "violated" : "passed",
    violations,
    warnings,
    evidenceReferences: [...new Set(references)],
  };
}