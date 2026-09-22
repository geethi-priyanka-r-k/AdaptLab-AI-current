import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { sendRouteError } from "./route-errors";
import { getWorkspaceStore } from "../services/workspace-store";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/dashboard/summary", async (req, res) => {
  try {
    const data = GetDashboardSummaryResponse.parse(
      await getWorkspaceStore(req.user!).getDashboardSummary(),
    );
    res.json(data);
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;