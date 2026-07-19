import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import readingRouter from "./reading";
import pushRouter from "./push";
import trackRouter from "./track";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(readingRouter);
router.use(pushRouter);
router.use(trackRouter);

export default router;
