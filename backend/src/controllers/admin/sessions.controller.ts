import { Response } from "express";

import { StatusCodes } from "@/config";
import { SessionsLogic } from "@/logic/admin";
import { getUser } from "@/middlewares";
import { idParamSchema, listAdminSessionsQuerySchema } from "@/schemas";
import { AuthenticatedRequest } from "@/types";

export const SessionsController = {
  list: async (req: AuthenticatedRequest, res: Response) => {
    const query = listAdminSessionsQuerySchema.parse(req.query);

    const result = await SessionsLogic.list(getUser(req), query);
    res.status(StatusCodes.OK).json(result);
  },

  get: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const data = await SessionsLogic.get(getUser(req), id);
    res.status(StatusCodes.OK).json({ data });
  },
};
