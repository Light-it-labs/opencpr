import { Router } from "express";

import { KiosksController } from "@/controllers";
import { authGuard, requireRole, tryCatchWrapper } from "@/middlewares";
import { USER_ROLES } from "@/models";

export const KiosksRouter = Router();

// Kiosks never call this; it is the portal's admin-only booth list.
KiosksRouter.get(
  "/",
  authGuard(),
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(KiosksController.list),
);
KiosksRouter.post(
  "/:kioskId/heartbeat",
  tryCatchWrapper(KiosksController.heartbeat),
);
