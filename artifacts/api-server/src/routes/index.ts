import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import analyzeRouter from "./analyze";
import itemsRouter from "./items";
import recommendRouter from "./recommend";
import closetAnalysisRouter from "./closet-analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(analyzeRouter);
router.use(itemsRouter);
router.use(recommendRouter);
router.use(closetAnalysisRouter);

export default router;
