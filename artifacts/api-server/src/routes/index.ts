import { Router, type IRouter } from "express";
import healthRouter from "./health";
import householdsRouter from "./households";
import expensesRouter from "./expenses";
import guideRouter from "./guide";
import itineraryRouter from "./itinerary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(householdsRouter);
router.use(expensesRouter);
router.use(guideRouter);
router.use(itineraryRouter);

export default router;
