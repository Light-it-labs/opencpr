import type { z } from "zod";

import type {
  kioskHeartbeatSchema,
  kioskPairingSchema,
  pairedLocationSchema,
  pairKioskSchema,
} from "./schemas";

export type KioskHeartbeat = z.infer<typeof kioskHeartbeatSchema>;
export type PairedLocation = z.infer<typeof pairedLocationSchema>;
export type PairKiosk = z.infer<typeof pairKioskSchema>;
export type KioskPairing = z.infer<typeof kioskPairingSchema>;
