import type { z } from "zod";

import type {
  requestMagicLinkPayloadSchema,
  userSchema,
  verifyMagicLinkPayloadSchema,
} from "./schemas";

export type User = z.infer<typeof userSchema>;

export type RequestMagicLinkPayload = z.infer<typeof requestMagicLinkPayloadSchema>;

export type VerifyMagicLinkPayload = z.infer<typeof verifyMagicLinkPayloadSchema>;
