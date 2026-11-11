import { Router } from "express";

import { KiosksController } from "@/controllers/admin";
import { requireRole, tryCatchWrapper } from "@/middlewares";
import { USER_ROLES } from "@/models";

export const KiosksRouter = Router();
KiosksRouter.delete(
  "/:kioskId/pairing",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(KiosksController.revokePairing),
);

export const KioskPairingCodesRouter = Router();
KioskPairingCodesRouter.post(
  "/",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(KiosksController.createPairingCode),
);
