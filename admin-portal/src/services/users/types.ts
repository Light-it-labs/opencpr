import type { z } from "zod";

import type {
  inviteUserPayloadSchema,
  portalUserSchema,
  updateUserPayloadSchema,
  updateUserRequestSchema,
  userLocationsFormSchema,
} from "./schemas";

export type PortalUser = z.infer<typeof portalUserSchema>;

export type InviteUserFormValues = z.input<typeof inviteUserPayloadSchema>;

export type InviteUserPayload = z.output<typeof inviteUserPayloadSchema>;

export type UpdateUserPayload = z.infer<typeof updateUserPayloadSchema>;

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

export type UserLocationsFormValues = z.infer<typeof userLocationsFormSchema>;
