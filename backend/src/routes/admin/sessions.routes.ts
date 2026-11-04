import { Router } from "express";

import { SessionsController } from "@/controllers/admin";
import { tryCatchWrapper } from "@/middlewares";

export const SessionsRouter = Router();
SessionsRouter.get("/", tryCatchWrapper(SessionsController.list));
SessionsRouter.get("/:id", tryCatchWrapper(SessionsController.get));
