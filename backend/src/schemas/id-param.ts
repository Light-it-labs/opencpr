import z from "zod";

export const idParamSchema = z.object({
  id: z
    .string()
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: "Invalid id parameter",
    })
    .transform((val) => Number(val)),
});
