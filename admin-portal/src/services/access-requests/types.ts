import type { z } from "zod";

import type {
  accessRequestSchema,
  approveAccessRequestPayloadSchema,
  approveAccessRequestRequestSchema,
} from "./schemas";

export type AccessRequest = z.infer<typeof accessRequestSchema>;

export type ApproveAccessRequestFormValues = z.input<typeof approveAccessRequestPayloadSchema>;

export type ApproveAccessRequestPayload = z.output<typeof approveAccessRequestPayloadSchema>;

export type ApproveAccessRequestRequest = z.infer<typeof approveAccessRequestRequestSchema>;
