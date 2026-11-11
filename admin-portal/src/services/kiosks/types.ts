import type { z } from "zod";

import type {
  createKioskPairingCodePayloadSchema,
  kioskPairingCodeSchema,
  kioskSchema,
} from "./schemas";

export type Kiosk = z.infer<typeof kioskSchema>;

export type KioskPairingCode = z.infer<typeof kioskPairingCodeSchema>;

export type CreateKioskPairingCodePayload = z.infer<typeof createKioskPairingCodePayloadSchema>;
