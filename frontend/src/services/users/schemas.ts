import { z } from "zod";

// Response shape only: the phone form validates its own input in claimSessionSchema.
export const userSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  // Nullable to match the column: the kiosk collects one name field on a phone
  // and a single word is common, so there is often no surname to store.
  lastName: z.string().nullable(),
  email: z.email(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
