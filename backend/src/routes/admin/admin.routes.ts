import { Router } from "express";

import { authGuard } from "@/middlewares";

import { AccessRequestsRouter } from "./access-requests.routes";
import { LocationsRouter } from "./locations.routes";
import { ParticipantsRouter } from "./participants.routes";
import { SessionsRouter } from "./sessions.routes";
import { StatsRouter } from "./stats.routes";
import { UsersRouter } from "./users.routes";

export const AdminRouter = Router();

// One guard for the whole tree: a route added below is protected by default.
AdminRouter.use(authGuard());

AdminRouter.use("/locations", LocationsRouter);
AdminRouter.use("/sessions", SessionsRouter);
AdminRouter.use("/participants", ParticipantsRouter);
AdminRouter.use("/stats", StatsRouter);
AdminRouter.use("/users", UsersRouter);
AdminRouter.use("/access-requests", AccessRequestsRouter);
