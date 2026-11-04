import { Response } from "express";

import { StatusCodes } from "@/config";
import { AccessRequestsLogic } from "@/logic/admin";
import { getUser } from "@/middlewares";
import { approveAccessRequestSchema, uuidParamSchema } from "@/schemas";
import { AuthenticatedRequest } from "@/types";

export const AccessRequestsController = {
  list: async (_req: AuthenticatedRequest, res: Response) => {
    const data = await AccessRequestsLogic.list();
    res.status(StatusCodes.OK).json({ data });
  },

  approve: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = uuidParamSchema.parse(req.params);
    const validatedData = approveAccessRequestSchema.parse(req.body);

    const data = await AccessRequestsLogic.approve(
      getUser(req),
      id,
      validatedData,
    );
    res.status(StatusCodes.OK).json({ data });
  },

  reject: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = uuidParamSchema.parse(req.params);

    const data = await AccessRequestsLogic.reject(getUser(req), id);
    res.status(StatusCodes.OK).json({ data });
  },
};
