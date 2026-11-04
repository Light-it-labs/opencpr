import { type Request, type Response } from "express";

import { StatusCodes } from "@/config";
import { BaseLogic } from "@/logic";

export const BaseController = {
  // GET /
  getRoot: async (_req: Request, res: Response) => {
    res.status(StatusCodes.OK).send("opencpr-backend (v1.0.0)");
  },

  // GET /health
  getHealth: async (_req: Request, res: Response) => {
    const { allSystemsUp, ...status } = await BaseLogic.healthCheck();

    res
      .status(allSystemsUp ? StatusCodes.OK : StatusCodes.SERVER_ERROR)
      .json(status);
  },
};
