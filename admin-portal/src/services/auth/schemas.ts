import { z } from "zod";

import { userLocationIdsSchema, userRoleSchema } from "@/services/users/schemas";

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable(),
  role: userRoleSchema,
  locationIds: userLocationIdsSchema.nullable(),
  passkeysCount: z.number(),
});

export const userResponseSchema = z.object({ data: userSchema });

export const requestMagicLinkPayloadSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
});

export const verifyMagicLinkPayloadSchema = z.object({ token: z.string().min(1) });
