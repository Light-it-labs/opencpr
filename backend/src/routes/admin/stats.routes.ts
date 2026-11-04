import { Router } from "express";

import { StatsController } from "@/controllers/admin";
import { tryCatchWrapper } from "@/middlewares";

export const StatsRouter = Router();
StatsRouter.get("/", tryCatchWrapper(StatsController.get));
// Literal paths stay above any `/:id` route added later, or that route would
// swallow them.
StatsRouter.get("/performance", tryCatchWrapper(StatsController.performance));
