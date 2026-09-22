import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { sendRouteError } from "./route-errors";
import { analyzeWithGroq, type GroqAnalysisInput, type GroqAnalysisOutput } from "../services/groq-service";
import { getWorkspaceStore } from "../services/workspace-store";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/analyze/:projectId/:testId", async (req: Request, res: Response) => {
  const { projectId, testId } = req.params as { projectId: string; testId: string };
  
  try {
    const store = getWorkspaceStore(req.user!);
    
    // Verify project ownership
    const project = await store.findProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Get test run and result
    const testRun = await store.findTestRun(projectId, testId);
    if (!testRun) {
      res.status(404).json({ error: "Test run not found" });
      return;
    }

    const result = await store.getTestResult(projectId, testId);
    if (!result) {
      res.status(404).json({ error: "Test result not found" });
      return;
    }

    // Get contract for context
    const contract = await store.getContract(projectId);
    if (!contract) {
      res.status(400).json({ error: "Adaptive contract required for analysis" });
      return;
    }

    // Build analysis input with only structured, non-sensitive data
    const analysisInput: GroqAnalysisInput = {
      profile: testRun.profile,
      adaptiveContract: {
        networkProfile: contract.networkProfile,
        imagePolicy: contract.imagePolicy,
        javascriptPolicy: contract.javascriptPolicy,
        featurePolicy: contract.featurePolicy,
        maxResourceSizeKb: contract.maxResourceSizeKb,
        maxLcpMs: contract.maxLcpMs,
      },
      observedEvidence: {
        violations: result.violations,
        metrics: result.metrics,
        resourceCount: result.metrics.resourceCount,
      },
    };

    // Perform analysis
    const analysis = await analyzeWithGroq(analysisInput);
    
    // Store analysis in result
    if ("unavailable" in analysis) {
      // If Groq fails, store the error but don't change the test status
      res.json({ 
        analysis: null, 
        error: analysis.error,
        unavailable: true 
      });
      return;
    }

    // Store successful analysis
    await store.saveTestAnalysis(projectId, testId, analysis);
    
    res.json({ analysis, unavailable: false });
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;
