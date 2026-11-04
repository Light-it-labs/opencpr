import { type Request, type Response } from "express";

import { StatusCodes } from "@/config";
import { LocationsLogic } from "@/logic";

export const LocationsController = {
  // GET /locations
  list: async (_req: Request, res: Response) => {
    const data = await LocationsLogic.list();

    res.status(StatusCodes.OK).send({ data });
  },
};
