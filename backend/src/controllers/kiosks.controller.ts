import { Request, Response } from "express";

import { StatusCodes } from "@/config";
import { KioskHealthLogic, KiosksLogic } from "@/logic";
import { scopeLocationIds } from "@/logic/admin";
import { getUser } from "@/middlewares";
import { kioskHeartbeatSchema, kioskIdParamSchema } from "@/schemas";
import { AuthenticatedRequest } from "@/types";

export const KiosksController = {
  heartbeat: async (req: Request, res: Response) => {
    const { kioskId } = kioskIdParamSchema.parse(req.params);
    const validatedData = kioskHeartbeatSchema.parse(req.body);

    await KiosksLogic.heartbeat(kioskId, validatedData);
    // Never fails the heartbeat: the check logs its own errors.
    await KioskHealthLogic.checkKiosk(kioskId);
    res.status(StatusCodes.OK).json({ data: { received: true } });
  },

  list: async (req: AuthenticatedRequest, res: Response) => {
    const data = await KiosksLogic.list(scopeLocationIds(getUser(req)));
    res.status(StatusCodes.OK).json({ data });
  },
};
