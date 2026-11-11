import { addMinutes } from "date-fns";

import { BadRequestError, NotFoundError } from "@/exceptions";
import {
  KioskPairingCodesRepository,
  KiosksRepository,
  LocationsRepository,
} from "@/repositories";
import { generatePairingCode, hashToken, isDuplicateEntry } from "@/utils";

import { isEnded } from "../locations.logic";

/** Long enough to walk to the booth and type it, short enough to die unused. */
export const PAIRING_CODE_TTL_MINUTES = 15;

const PAIRING_CODE_ATTEMPTS = 3;

export const KioskPairingLogic = {
  createCode: async (locationId: string, createdByUserId: string) => {
    const location = await LocationsRepository.getActive(locationId);

    if (!location) {
      throw new NotFoundError({ entity: "location", value: locationId });
    }

    if (isEnded(location, new Date())) {
      throw new BadRequestError(
        "This location has ended, so no booth can be paired with it.",
      );
    }

    const expiresAt = addMinutes(new Date(), PAIRING_CODE_TTL_MINUTES);

    for (let attempt = 1; ; attempt++) {
      const code = generatePairingCode();

      try {
        await KioskPairingCodesRepository.create({
          codeHash: hashToken(code),
          locationId,
          createdByUserId,
          expiresAt,
        });

        return { code, expiresAt };
      } catch (error) {
        if (!isDuplicateEntry(error) || attempt >= PAIRING_CODE_ATTEMPTS) {
          throw error;
        }
      }
    }
  },

  revoke: async (kioskId: string) => {
    if (!(await KiosksRepository.revokePairing(kioskId))) {
      throw new NotFoundError({ entity: "kiosk", value: kioskId });
    }
  },
};
