import { z } from "zod";

import { emailSchema } from "@/services/schemas";
import { USER_ROLES, type UserRole } from "./constants";

export const userRoleSchema = z.enum(USER_ROLES);

export const userLocationIdsSchema = z.array(z.string());

export const viewerLocationIds = ({
  locationIds,
  role,
}: {
  locationIds: string[];
  role: UserRole;
}) => {
  return role === USER_ROLES.viewer ? locationIds : undefined;
};

export const portalUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: userRoleSchema,
  locationIds: userLocationIdsSchema,
  invitedByUserId: z.string().nullable(),
  lastLoginAt: z.iso.datetime().nullable(),
  lastSeenAt: z.iso.datetime().nullish(),
  createdAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const portalUsersResponseSchema = z.object({ data: z.array(portalUserSchema) });

export const portalUserResponseSchema = z.object({ data: portalUserSchema });

export const inviteUserPayloadSchema = z
  .object({
    email: emailSchema,
    name: z
      .string()
      .trim()
      .optional()
      .transform((name) => {
        return name || undefined;
      }),
    role: userRoleSchema,
    locationIds: userLocationIdsSchema,
  })
  .transform((values) => {
    return { ...values, locationIds: viewerLocationIds(values) };
  });

export const updateUserPayloadSchema = z.object({
  role: userRoleSchema.optional(),
  locationIds: userLocationIdsSchema.optional(),
});

export const updateUserRequestSchema = z.object({
  id: z.string(),
  payload: updateUserPayloadSchema,
});

export const userLocationsFormSchema = z.object({ locationIds: userLocationIdsSchema });
