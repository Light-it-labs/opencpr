import { z } from "zod";

export const emailSchema = z.email({ message: "Enter a valid email address" });

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const createPaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) => {
  return z.object({ data: z.array(itemSchema), pagination: paginationSchema });
};
