import type { z } from "zod";

import type {
  claimResultSchema,
  claimSessionSchema,
  cprCompressionSchema,
  cprSessionSchema,
  createCprSessionSchema,
  createdCprSessionSchema,
  sessionClaimSchema,
} from "./schemas";

export type CprSession = z.infer<typeof cprSessionSchema>;
export type CreateCprSession = z.infer<typeof createCprSessionSchema>;
export type CreatedCprSession = z.infer<typeof createdCprSessionSchema>;

export type CprCompression = z.infer<typeof cprCompressionSchema>;
export type ClaimSession = z.infer<typeof claimSessionSchema>;
export type SessionClaim = z.infer<typeof sessionClaimSchema>;
export type ClaimResult = z.infer<typeof claimResultSchema>;
