import { Router } from "express";

import { LocationsController } from "@/controllers";
import { tryCatchWrapper } from "@/middlewares";

export const LocationsRouter = Router();

LocationsRouter.get("/", tryCatchWrapper(LocationsController.list));
