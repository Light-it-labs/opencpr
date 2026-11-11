import z from "zod";

export const createKioskPairingCodeSchema = z.object({
  locationId: z.uuid().transform((id) => id.toLowerCase()),
});

export type CreateKioskPairingCode = z.infer<
  typeof createKioskPairingCodeSchema
>;
