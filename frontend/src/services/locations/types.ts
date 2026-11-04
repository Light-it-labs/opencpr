import type { z } from "zod";

import type { locationSchema } from "./schemas";

export type Location = z.infer<typeof locationSchema>;
