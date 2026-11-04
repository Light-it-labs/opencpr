import { Response } from "express";

import { StatusCodes } from "@/config";
import { UsersLogic } from "@/logic/admin";
import { getUser } from "@/middlewares";
import { inviteUserSchema, updateUserSchema, uuidParamSchema } from "@/schemas";
import { AuthenticatedRequest } from "@/types";

export const UsersController = {
  list: async (_req: AuthenticatedRequest, res: Response) => {
    const data = await UsersLogic.list();
    res.status(StatusCodes.OK).json({ data });
  },

  invite: async (req: AuthenticatedRequest, res: Response) => {
    const validatedData = inviteUserSchema.parse(req.body);

    const data = await UsersLogic.invite(getUser(req), validatedData);
    res.status(StatusCodes.CREATED).json({ data });
  },

  update: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = uuidParamSchema.parse(req.params);
    const validatedData = updateUserSchema.parse(req.body);

    const data = await UsersLogic.update(getUser(req), id, validatedData);
    res.status(StatusCodes.OK).json({ data });
  },

  revoke: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = uuidParamSchema.parse(req.params);

    await UsersLogic.revoke(getUser(req), id);
    res.status(StatusCodes.NO_CONTENT).send();
  },
};
