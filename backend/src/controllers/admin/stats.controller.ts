import { Response } from "express";

import { StatusCodes } from "@/config";
import { StatsLogic } from "@/logic/admin";
import { getUser } from "@/middlewares";
import { performanceStatsQuerySchema, statsQuerySchema } from "@/schemas";
import { AuthenticatedRequest } from "@/types";

export const StatsController = {
  get: async (req: AuthenticatedRequest, res: Response) => {
    const query = statsQuerySchema.parse(req.query);

    const data = await StatsLogic.get(getUser(req), query);
    res.status(StatusCodes.OK).json({ data });
  },

  performance: async (req: AuthenticatedRequest, res: Response) => {
    const query = performanceStatsQuerySchema.parse(req.query);

    const data = await StatsLogic.performance(getUser(req), query);
    res.status(StatusCodes.OK).json({ data });
  },
};
