import { Router } from "express";

import { UsersController } from "@/controllers/admin";
import { requireRole, tryCatchWrapper } from "@/middlewares";
import { USER_ROLES } from "@/models";

export const UsersRouter = Router();
UsersRouter.get(
  "/",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(UsersController.list),
);
UsersRouter.post(
  "/",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(UsersController.invite),
);
UsersRouter.patch(
  "/:id",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(UsersController.update),
);
UsersRouter.delete(
  "/:id",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(UsersController.revoke),
);
