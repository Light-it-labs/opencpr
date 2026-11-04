import type { z } from "zod";

import type { kioskSchema } from "./schemas";

export type Kiosk = z.infer<typeof kioskSchema>;
