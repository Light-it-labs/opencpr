import { Request, Response } from "express";

import { StatusCodes } from "@/config";
import { KioskPairingLogic } from "@/logic/admin";
import { getUser } from "@/middlewares";
import { createKioskPairingCodeSchema, kioskIdParamSchema } from "@/schemas";
import { AuthenticatedRequest } from "@/types";

export const KiosksController = {
  createPairingCode: async (req: AuthenticatedRequest, res: Response) => {
    const { locationId } = createKioskPairingCodeSchema.parse(req.body);

    const data = await KioskPairingLogic.createCode(
      locationId,
      getUser(req).id,
    );
    res.status(StatusCodes.CREATED).json({ data });
  },

  revokePairing: async (req: Request, res: Response) => {
    const { kioskId } = kioskIdParamSchema.parse(req.params);

    await KioskPairingLogic.revoke(kioskId);
    res.status(StatusCodes.NO_CONTENT).send();
  },
};
