import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import settingsRouter from "./settings";
import templatesRouter from "./templates";
import versionsRouter from "./versions";
import deploymentsRouter from "./deployments";
import creditsRouter from "./credits";
import helpRouter from "./help";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(helpRouter);
router.use(templatesRouter);
router.use(versionsRouter);
router.use(deploymentsRouter);
router.use(creditsRouter);
router.use(projectsRouter);
router.use(settingsRouter);

export default router;
