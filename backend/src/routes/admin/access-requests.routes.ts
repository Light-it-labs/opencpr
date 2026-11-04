import { Router } from "express";

import { AccessRequestsController } from "@/controllers/admin";
import { requireRole, tryCatchWrapper } from "@/middlewares";
import { USER_ROLES } from "@/models";

export const AccessRequestsRouter = Router();
AccessRequestsRouter.get(
  "/",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(AccessRequestsController.list),
);
AccessRequestsRouter.post(
  "/:id/approve",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(AccessRequestsController.approve),
);
AccessRequestsRouter.post(
  "/:id/reject",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(AccessRequestsController.reject),
);
