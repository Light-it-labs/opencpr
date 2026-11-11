import { type NextFunction, type Response } from "express";

import { UnauthorizedError } from "@/exceptions";
import { KiosksRepository } from "@/repositories";
import { type KioskRequest } from "@/types";
import { hashToken } from "@/utils";

const BEARER_TOKEN = /^Bearer\s+(\S+)$/i;

const notPairedError = () =>
  new UnauthorizedError("This kiosk is not paired. Pair it again from /setup.");

/** For the calls a booth makes on its own: only a paired kiosk may continue. */
export const kioskAuth =
  () => async (req: KioskRequest, _res: Response, next: NextFunction) => {
    try {
      const token = BEARER_TOKEN.exec(req.header("Authorization") ?? "")?.[1];

      if (!token) {
        throw notPairedError();
      }

      const kiosk = await KiosksRepository.getByTokenHash(hashToken(token));

      if (!kiosk?.locationId) {
        throw notPairedError();
      }

      req.kiosk = { kioskId: kiosk.kioskId, locationId: kiosk.locationId };

      next();
    } catch (e) {
      next(e);
    }
  };

/** For handlers behind kioskAuth(), where the kiosk is always present. */
export const getKiosk = (req: KioskRequest) => {
  if (!req.kiosk) {
    throw notPairedError();
  }

  return req.kiosk;
};
