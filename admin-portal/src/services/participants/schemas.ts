import { z } from "zod";

import { createPaginatedResponseSchema } from "@/services/schemas";
import { formatDateParam } from "@/utils/date-param";

export const participantSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  email: z.string(),
  createdAt: z.iso.datetime(),
  sessionsCount: z.number(),
  bestScore: z.number().nullable(),
  lastPlayedAt: z.iso.datetime().nullable(),
  locations: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const participantsResponseSchema = createPaginatedResponseSchema(participantSchema);

export const participantsFiltersSchema = z.object({
  page: z.number(),
  locationId: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
});

export const exportParticipantsFormSchema = z
  .object({
    locationId: z.string().optional(),
    period: z.object({ from: z.date().optional(), to: z.date().optional() }),
  })
  .transform((values) => {
    return {
      locationId: values.locationId,
      dateFrom: values.period.from ? formatDateParam(values.period.from) : undefined,
      dateTo: values.period.to ? formatDateParam(values.period.to) : undefined,
    };
  });
