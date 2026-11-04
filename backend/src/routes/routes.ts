import { Router } from "express";

import { AdminRouter } from "@/routes/admin";

import { AuthRouter } from "./auth.routes";
import { CprSessionsRouter } from "./cpr-sessions.routes";
import { KiosksRouter } from "./kiosks.routes";
import { LocationsRouter } from "./locations.routes";

const ApiRouter = Router();

// api/
ApiRouter.use("/locations", LocationsRouter);
ApiRouter.use("/cpr-sessions", CprSessionsRouter);
ApiRouter.use("/kiosks", KiosksRouter);
ApiRouter.use("/auth", AuthRouter);
ApiRouter.use("/admin", AdminRouter);

export default ApiRouter;
