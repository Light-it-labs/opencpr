import z from "zod";

import { USER_ROLES } from "@/models";

/**
 * Lowercased like uuidParamSchema, since MySQL matches ids case-insensitively
 * but JavaScript does not, and deduplicated so the set can be stored as is.
 */
export const locationIdsSchema = z
  .array(z.uuid().transform((id) => id.toLowerCase()))
  .transform((ids) => [...new Set(ids)]);

/** An admin always reads every location, so a list for one is a mistake. */
export const adminHasNoLocations = (data: {
  role?: string;
  locationIds?: string[];
}) => data.role !== USER_ROLES.admin || !data.locationIds?.length;

export const adminHasNoLocationsIssue = {
  message: "An admin always sees every location; send no locationIds.",
  path: ["locationIds"],
};

export const inviteUserSchema = z
  .object({
    email: z.email().transform((email) => email.toLowerCase()),
    name: z.string().trim().min(1).max(255).optional(),
    role: z.enum(USER_ROLES),
    locationIds: locationIdsSchema.optional(),
  })
  .refine(adminHasNoLocations, adminHasNoLocationsIssue);

export type InviteUser = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    locationIds: locationIdsSchema.optional(),
  })
  .refine(
    (data) => data.role !== undefined || data.locationIds !== undefined,
    "Send role, locationIds or both.",
  )
  .refine(adminHasNoLocations, adminHasNoLocationsIssue);

export type UpdateUser = z.infer<typeof updateUserSchema>;
