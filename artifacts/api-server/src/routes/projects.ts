import { Router, type IRouter } from "express";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectBody,
  UpdateProjectParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { sendRouteError } from "./route-errors";
import { getWorkspaceStore } from "../services/workspace-store";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/projects", async (req, res) => {
  try {
    res.json(await getWorkspaceStore(req.user!).listProjects());
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.post("/projects", async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success || !isHttpUrl(parsed.data?.applicationUrl)) {
    res.status(400).json({ error: "Invalid project details" });
    return;
  }

  try {
    res.status(201).json(await getWorkspaceStore(req.user!).createProject(parsed.data));
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.get("/projects/:id", async (req, res) => {
  const parsed = GetProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const project = await getWorkspaceStore(req.user!).findProject(parsed.data.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.patch("/projects/:id", async (req, res) => {
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (
    !params.success ||
    !body.success ||
    (body.data.applicationUrl !== undefined && !isHttpUrl(body.data.applicationUrl))
  ) {
    res.status(400).json({ error: "Invalid project details" });
    return;
  }

  try {
    const project = await getWorkspaceStore(req.user!).updateProject(
      params.data.id,
      body.data,
    );
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (error) {
    sendRouteError(res, error);
  }
});

router.delete("/projects/:id", async (req, res) => {
  const parsed = GetProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    if (!(await getWorkspaceStore(req.user!).deleteProject(parsed.data.id))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    sendRouteError(res, error);
  }
});

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default router;