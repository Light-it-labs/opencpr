import { z } from "zod";

import { userLocationIdsSchema, userRoleSchema, viewerLocationIds } from "@/services/users/schemas";
import { ACCESS_REQUEST_STATUSES } from "./constants";

export const accessRequestSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.enum(ACCESS_REQUEST_STATUSES),
  createdAt: z.iso.datetime(),
});

export const accessRequestsResponseSchema = z.object({ data: z.array(accessRequestSchema) });

export const accessRequestResponseSchema = z.object({ data: accessRequestSchema });

export const approveAccessRequestPayloadSchema = z
  .object({ role: userRoleSchema, locationIds: userLocationIdsSchema })
  .transform((values) => {
    return { ...values, locationIds: viewerLocationIds(values) };
  });

export const approveAccessRequestRequestSchema = z.object({
  id: z.string(),
  payload: approveAccessRequestPayloadSchema,
});
