import { Request, Response } from "express";

import { StatusCodes } from "@/config";
import { KioskHealthLogic, KiosksLogic } from "@/logic";
import { scopeLocationIds } from "@/logic/admin";
import { getKiosk, getUser } from "@/middlewares";
import {
  kioskHeartbeatSchema,
  kioskIdParamSchema,
  kioskPairSchema,
} from "@/schemas";
import { AuthenticatedRequest, KioskRequest } from "@/types";

export const KiosksController = {
  pair: async (req: Request, res: Response) => {
    const validatedData = kioskPairSchema.parse(req.body);

    const data = await KiosksLogic.pair(validatedData);
    res.status(StatusCodes.OK).json({ data });
  },

  heartbeat: async (req: KioskRequest, res: Response) => {
    const { kioskId: reportedKioskId } = kioskIdParamSchema.parse(req.params);
    const validatedData = kioskHeartbeatSchema.parse(req.body);

    const kioskId = await KiosksLogic.heartbeat(
      getKiosk(req),
      reportedKioskId,
      validatedData,
    );
    // Never fails the heartbeat: the check logs its own errors.
    await KioskHealthLogic.checkKiosk(kioskId);
    res.status(StatusCodes.OK).json({ data: { received: true } });
  },

  list: async (req: AuthenticatedRequest, res: Response) => {
    const data = await KiosksLogic.list(scopeLocationIds(getUser(req)));
    res.status(StatusCodes.OK).json({ data });
  },
};
