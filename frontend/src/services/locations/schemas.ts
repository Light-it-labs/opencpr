import z from "zod";

export const locationSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  address: z.string().min(2).max(200),
  startDate: z.date(),
  endDate: z.date().optional(),
});
