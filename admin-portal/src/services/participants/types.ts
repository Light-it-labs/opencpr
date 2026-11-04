import type { z } from "zod";

import type {
  exportParticipantsFormSchema,
  participantSchema,
  participantsFiltersSchema,
  participantsResponseSchema,
} from "./schemas";

export type Participant = z.infer<typeof participantSchema>;

export type ParticipantsPage = z.infer<typeof participantsResponseSchema>;

export type ParticipantsFilters = z.infer<typeof participantsFiltersSchema>;

export type ExportParticipantsFormValues = z.input<typeof exportParticipantsFormSchema>;

export type ExportParticipantsPayload = z.output<typeof exportParticipantsFormSchema>;

export type ExportedParticipantsFile = {
  blob: Blob;
  filename: string;
};
