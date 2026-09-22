import type { AdaptiveContractInput, TestRunInput } from "@workspace/api-zod";
import type {
  TestResultRecord,
  TestRunRecord,
  WorkspaceStore,
} from "../services/workspace-store";
import { runBrowser } from "./browser-runner";
import { validateEvidence } from "./validator";
import { analyzeWithGroq } from "../services/groq-service";
import { logger } from "../lib/logger";
import type { MockSutScenario, TestExecutionResult } from "./types";

function isMockScenario(value: unknown): value is MockSutScenario {
  return value === "low" || value === "medium" || value === "high";
}

export async function executeTestRun(
  store: WorkspaceStore,
  project: {
    applicationUrl: string;
  },
  run: TestRunRecord,
  contract: AdaptiveContractInput,
): Promise<TestExecutionResult> {
  await store.updateTestRunStatus(run.projectId, run.id, "running");
  const configuration = run.configuration;
  const mockSut = isMockScenario(configuration.mockSut)
    ? configuration.mockSut
    : configuration.mockSut === true
      ? run.profile
      : undefined;
  try {
    const { evidence } = await runBrowser({
      url: project.applicationUrl,
      profile: run.profile,
      device: configuration.device === "mobile" ? "mobile" : "desktop",
      mockSut,
      timeoutMs:
        typeof configuration.timeoutMs === "number" && configuration.timeoutMs > 0
          ? Math.min(configuration.timeoutMs, 120_000)
          : 30_000,
    });
    if (evidence.page.navigationError && !mockSut) {
      throw new Error(evidence.page.navigationError);
    }
    const validation = validateEvidence(contract, run.profile, evidence);
    const result: TestExecutionResult = {
      status: validation.status,
      signals: { ...evidence.browser, detected: evidence.page },
      resources: evidence.resources,
      metrics: evidence.performance,
      violations: validation.violations,
      warnings: validation.warnings,
      error: null,
      analysis: null,
    };
    await store.saveTestResult(run.projectId, run.id, result);
    await store.updateTestRunStatus(run.projectId, run.id, result.status);
    
    // Trigger AI analysis asynchronously (non-blocking)
    void (async () => {
      try {
        const analysisInput = {
          profile: run.profile,
          adaptiveContract: contract,
          observedEvidence: {
            violations: validation.violations,
            metrics: evidence.performance,
            resourceCount: evidence.resources.length,
          },
        };
        const analysis = await analyzeWithGroq(analysisInput);
        if (!("unavailable" in analysis)) {
          await store.saveTestAnalysis(run.projectId, run.id, analysis);
        }
      } catch (error) {
        logger.error({ error }, "AI analysis failed");
      }
    })();
    
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test execution failed.";
    const result: TestExecutionResult = {
      status: "failed",
      signals: {
        requestedProfile: run.profile,
        network: {
          name: "not applied",
          applied: false,
          mechanism: "not applied",
          downloadThroughputBps: null,
          uploadThroughputBps: null,
          latencyMs: null,
        },
        device: {
          name: configuration.device === "mobile" ? "mobile" : "desktop",
          viewport:
            configuration.device === "mobile"
              ? { width: 390, height: 844 }
              : { width: 1440, height: 900 },
          userAgent: null,
          deviceClass: configuration.device === "mobile" ? "mobile" : "desktop",
          hardwareConcurrency: null,
          deviceMemoryGb: null,
        },
        detected: {
          finalUrl: project.applicationUrl,
          title: "",
          consoleErrors: [],
          navigationError: message,
          isMockSut: Boolean(mockSut),
        },
      },
      resources: [],
      metrics: {
        fcpMs: null,
        lcpMs: null,
        cls: null,
        navigation: null,
        resourceCount: 0,
        javascriptTransferBytes: null,
        imageTransferBytes: null,
        totalTransferBytes: null,
      },
      violations: [],
      warnings: [],
      error: message,
      analysis: null,
    };
    await store.saveTestResult(run.projectId, run.id, result);
    await store.updateTestRunStatus(run.projectId, run.id, "failed");
    return result;
  }
}

export function resultFromExecution(
  result: TestExecutionResult,
): Omit<TestResultRecord, "runId" | "createdAt" | "updatedAt"> {
  return result;
}