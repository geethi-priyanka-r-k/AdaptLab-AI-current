import { Router, type IRouter } from "express";
import {
  CreateTestRunBody,
  CreateTestRunParams,
  GetTestRunParams,
  ListTestRunsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { sendRouteError } from "./route-errors";
import { getWorkspaceStore } from "../services/workspace-store";
import { executeTestRun } from "../testing/test-orchestrator";
import { compareTestResults } from "../services/regression-service";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/test-profiles", async (req, res) => {
  try {
    res.json(await getWorkspaceStore(req.user!).listTestProfiles());
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get("/projects/:id/tests", async (req, res) => {
  const params = ListTestRunsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  try {
    const store = getWorkspaceStore(req.user!);
    if (!(await store.findProject(params.data.id))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(await store.listTestRuns(params.data.id));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post("/projects/:id/tests", async (req, res) => {
  const params = CreateTestRunParams.safeParse(req.params);
  const body = CreateTestRunBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid test configuration" });
    return;
  }
  try {
    const store = getWorkspaceStore(req.user!);
    if (!(await store.findProject(params.data.id))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const run = await store.createTestRun(params.data.id, body.data);
    const configuration = run.configuration;
    const shouldExecute =
      process.env.NODE_ENV !== "test" || configuration.mockSut === true || typeof configuration.mockSut === "string";
    if (shouldExecute) {
      const contract = await store.getContract(params.data.id);
      if (!contract) {
        await store.updateTestRunStatus(params.data.id, run.id, "failed");
        await store.saveTestResult(params.data.id, run.id, {
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
              name: "desktop",
              viewport: { width: 1440, height: 900 },
              userAgent: null,
              deviceClass: "desktop",
              hardwareConcurrency: null,
              deviceMemoryGb: null,
            },
            detected: {
              finalUrl: (await store.findProject(params.data.id))?.applicationUrl ?? "",
              title: "",
              consoleErrors: [],
              navigationError: "Adaptive contract is required before a test can run.",
              isMockSut: Boolean(configuration.mockSut),
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
          error: "Adaptive contract is required before a test can run.",
          analysis: null,
        });
      } else {
        const project = await store.findProject(params.data.id);
        if (project) {
          void executeTestRun(store, project, run, contract);
        }
      }
    }
    res.status(201).json(run);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get("/projects/:id/tests/:testId", async (req, res) => {
  const params = GetTestRunParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid test run id" });
    return;
  }
  try {
    const testRun = await getWorkspaceStore(req.user!).findTestRun(
      params.data.id,
      params.data.testId,
    );
    if (!testRun) {
      res.status(404).json({ error: "Test run not found" });
      return;
    }
    const result = await getWorkspaceStore(req.user!).getTestResult(params.data.id, params.data.testId);
    res.json({ ...testRun, result: result ?? null });
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get("/projects/:id/tests/:testId/compare", async (req, res) => {
  const params = GetTestRunParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid test run id" });
    return;
  }
  try {
    const store = getWorkspaceStore(req.user!);
    const testRun = await store.findTestRun(params.data.id, params.data.testId);
    if (!testRun) {
      res.status(404).json({ error: "Test run not found" });
      return;
    }

    const currentResult = await store.getTestResult(params.data.id, params.data.testId);
    if (!currentResult) {
      res.status(404).json({ error: "Test result not found" });
      return;
    }

    // Get previous test run for comparison
    const allRuns = await store.listTestRuns(params.data.id);
    const currentIndex = allRuns.findIndex((r) => r.id === params.data.testId);
    const previousRun = currentIndex > 0 ? allRuns[currentIndex - 1] : null;
    
    let previousResult = null;
    if (previousRun) {
      previousResult = await store.getTestResult(params.data.id, previousRun.id);
    }

    const comparison = compareTestResults(previousResult ?? null, currentResult);
    res.json({
      current: { id: testRun.id, profile: testRun.profile, createdAt: testRun.createdAt },
      previous: previousRun ? { id: previousRun.id, profile: previousRun.profile, createdAt: previousRun.createdAt } : null,
      comparison,
    });
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;