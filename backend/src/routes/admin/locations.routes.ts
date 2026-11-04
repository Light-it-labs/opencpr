import { Router } from "express";

import { LocationsController } from "@/controllers/admin";
import { requireRole, tryCatchWrapper } from "@/middlewares";
import { USER_ROLES } from "@/models";

export const LocationsRouter = Router();
LocationsRouter.get("/", tryCatchWrapper(LocationsController.list));
LocationsRouter.post(
  "/",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(LocationsController.create),
);
LocationsRouter.patch(
  "/:id",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(LocationsController.update),
);
LocationsRouter.delete(
  "/:id",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(LocationsController.remove),
);
