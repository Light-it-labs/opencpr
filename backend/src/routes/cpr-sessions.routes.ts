import { Router } from "express";

import { CprSessionsController } from "@/controllers";
import { kioskAuth, tryCatchWrapper } from "@/middlewares";

export const CprSessionsRouter = Router();

CprSessionsRouter.post(
  "/",
  kioskAuth(),
  tryCatchWrapper(CprSessionsController.create),
);

// Declared before /:id so "claim" is never parsed as a numeric id.
CprSessionsRouter.get(
  "/:publicId/claim",
  tryCatchWrapper(CprSessionsController.getClaim),
);
CprSessionsRouter.post(
  "/:publicId/claim",
  tryCatchWrapper(CprSessionsController.claim),
);

CprSessionsRouter.get("/:id", tryCatchWrapper(CprSessionsController.get));
