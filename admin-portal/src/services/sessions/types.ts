import type { z } from "zod";

import type {
  compressionSchema,
  sessionDetailSchema,
  sessionSchema,
  sessionsFiltersSchema,
  sessionsResponseSchema,
} from "./schemas";

export type Session = z.infer<typeof sessionSchema>;

export type Compression = z.infer<typeof compressionSchema>;

export type SessionDetail = z.infer<typeof sessionDetailSchema>;

export type SessionsPage = z.infer<typeof sessionsResponseSchema>;

export type SessionsFilters = z.infer<typeof sessionsFiltersSchema>;
