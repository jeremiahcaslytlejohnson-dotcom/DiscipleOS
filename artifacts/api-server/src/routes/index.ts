import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import readingRouter from "./reading";
import pushRouter from "./push";
import trackRouter from "./track";
import verseRouter from "./verse";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(readingRouter);
router.use(pushRouter);
router.use(trackRouter);
router.use(verseRouter);

export default router;
