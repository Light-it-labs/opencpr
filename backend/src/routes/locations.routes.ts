import { Router } from "express";
import { LocationsController } from "src/controllers/locations.controller";

import { tryCatchWrapper } from "@/middlewares";

export const LocationsRouter = Router();

LocationsRouter.get("/", tryCatchWrapper(LocationsController.list));
