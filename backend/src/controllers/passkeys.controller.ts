import { differenceInMilliseconds } from "date-fns";
import { Request, Response } from "express";

import { StatusCodes } from "@/config";
import { PasskeysLogic } from "@/logic";
import { getUser } from "@/middlewares";
import {
  idParamSchema,
  passkeyLoginVerifySchema,
  passkeyRegisterSchema,
} from "@/schemas";
import { CookieService } from "@/services";
import { AuthenticatedRequest } from "@/types";

export const PasskeysController = {
  registrationOptions: async (req: AuthenticatedRequest, res: Response) => {
    const data = await PasskeysLogic.registrationOptions(getUser(req));
    res.status(StatusCodes.OK).json({ data });
  },

  register: async (req: AuthenticatedRequest, res: Response) => {
    const validatedData = passkeyRegisterSchema.parse(req.body);

    const data = await PasskeysLogic.register(getUser(req), validatedData);
    res.status(StatusCodes.CREATED).json({ data });
  },

  list: async (req: AuthenticatedRequest, res: Response) => {
    const data = await PasskeysLogic.list(getUser(req));
    res.status(StatusCodes.OK).json({ data });
  },

  remove: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await PasskeysLogic.remove(getUser(req), id);
    res.status(StatusCodes.NO_CONTENT).send();
  },

  loginOptions: async (_req: Request, res: Response) => {
    const data = await PasskeysLogic.loginOptions();
    res.status(StatusCodes.OK).json({ data });
  },

  loginVerify: async (req: Request, res: Response) => {
    const validatedData = passkeyLoginVerifySchema.parse(req.body);

    const { expiresAt, sessionId, user } =
      await PasskeysLogic.login(validatedData);

    CookieService.set(
      res,
      sessionId,
      differenceInMilliseconds(expiresAt, new Date()),
    );
    res.status(StatusCodes.OK).json({ data: user });
  },
};
