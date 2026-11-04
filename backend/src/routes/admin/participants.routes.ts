import { Router } from "express";

import { ParticipantsController } from "@/controllers/admin";
import { requireRole, tryCatchWrapper } from "@/middlewares";
import { USER_ROLES } from "@/models";

export const ParticipantsRouter = Router();
ParticipantsRouter.get("/", tryCatchWrapper(ParticipantsController.list));
// Before any `/:id` route so "export" is never read as an id.
ParticipantsRouter.get(
  "/export",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(ParticipantsController.exportCsv),
);
ParticipantsRouter.delete(
  "/:id",
  requireRole(USER_ROLES.admin),
  tryCatchWrapper(ParticipantsController.remove),
);
