import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import sessionInfoRouter from "./session-info";
import eventsRouter from "./events";
import readingRouter from "./reading";
import pushRouter from "./push";
import pushTestRouter from "./push-test";
import remindersRouter from "./reminders";
import trackRouter from "./track";
import verseRouter from "./verse";
import accountRouter from "./account";
import rhythmRouter from "./rhythm";
import settingsRouter from "./settings";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(sessionInfoRouter);
router.use(accountRouter);
router.use(rhythmRouter);
router.use(settingsRouter);
router.use(feedbackRouter);
router.use(eventsRouter);
router.use(readingRouter);
router.use(pushRouter);
router.use(pushTestRouter);
router.use(remindersRouter);
router.use(trackRouter);
router.use(verseRouter);

export default router;
