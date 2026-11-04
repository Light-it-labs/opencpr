import type { z } from "zod";

import type { kioskHeartbeatSchema } from "./schemas";

export type KioskHeartbeat = z.infer<typeof kioskHeartbeatSchema>;
