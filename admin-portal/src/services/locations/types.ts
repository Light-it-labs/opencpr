import type { z } from "zod";

import type { locationFormSchema, locationSchema, updateLocationRequestSchema } from "./schemas";

export type Location = z.infer<typeof locationSchema>;

export type LocationFormValues = z.input<typeof locationFormSchema>;

export type LocationPayload = z.output<typeof locationFormSchema>;

export type UpdateLocationRequest = z.infer<typeof updateLocationRequestSchema>;
