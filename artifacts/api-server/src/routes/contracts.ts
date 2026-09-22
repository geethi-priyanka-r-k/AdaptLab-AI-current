import { Router, type IRouter } from "express";
import {
  GetAdaptiveContractParams,
  UpsertAdaptiveContractBody,
  UpsertAdaptiveContractParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { sendRouteError } from "./route-errors";
import { getWorkspaceStore } from "../services/workspace-store";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/projects/:id/contract", async (req, res) => {
  const params = GetAdaptiveContractParams.safeParse(req.params);
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
    const contract = await store.getContract(params.data.id);
    if (!contract) {
      res.status(404).json({ error: "Adaptive contract not configured" });
      return;
    }
    res.json(contract);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.put("/projects/:id/contract", async (req, res) => {
  const params = UpsertAdaptiveContractParams.safeParse(req.params);
  const body = UpsertAdaptiveContractBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid adaptive contract" });
    return;
  }

  try {
    const store = getWorkspaceStore(req.user!);
    if (!(await store.findProject(params.data.id))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(await store.saveContract(params.data.id, body.data));
  } catch (error) {
    sendRouteError(res, error);
  }
});

export default router;