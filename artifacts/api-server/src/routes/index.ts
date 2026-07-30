import { Router, type IRouter } from "express";
import healthRouter from "./health";
import householdsRouter from "./households";
import expensesRouter from "./expenses";
import guideRouter from "./guide";
import itineraryRouter from "./itinerary";
import imagesRouter from "./images";
import weatherRouter from "./weather";
import flightsRouter from "./flights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(householdsRouter);
router.use(expensesRouter);
router.use(guideRouter);
router.use(itineraryRouter);
router.use(imagesRouter);
router.use(weatherRouter);
router.use(flightsRouter);

export default router;
