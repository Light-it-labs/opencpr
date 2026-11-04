import z from "zod";

import { USER_ROLES } from "@/models";

import {
  adminHasNoLocations,
  adminHasNoLocationsIssue,
  locationIdsSchema,
} from "./users.schema";

export const approveAccessRequestSchema = z
  .object({
    role: z.enum(USER_ROLES),
    locationIds: locationIdsSchema.optional(),
  })
  .refine(adminHasNoLocations, adminHasNoLocationsIssue);

export type ApproveAccessRequest = z.infer<typeof approveAccessRequestSchema>;
