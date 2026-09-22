import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import dashboardRouter from "./dashboard";
import contractsRouter from "./contracts";
import testsRouter from "./tests";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(dashboardRouter);
router.use(contractsRouter);
router.use(testsRouter);
router.use(aiRouter);

export default router;
