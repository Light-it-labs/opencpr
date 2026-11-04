import { api } from "@/config/axios";
import { ADMIN_PAGE_SIZE } from "@/constants/pagination";
import { participantsResponseSchema } from "./schemas";
import type {
  ExportedParticipantsFile,
  ExportParticipantsPayload,
  ParticipantsFilters,
  ParticipantsPage,
} from "./types";

const DEFAULT_EXPORT_FILENAME = "participants.csv";

const CONTENT_DISPOSITION_FILENAME_PATTERN = /filename="?([^";]+)"?/i;

const getAttachmentFilename = (contentDisposition: unknown) => {
  if (typeof contentDisposition !== "string") {
    return DEFAULT_EXPORT_FILENAME;
  }

  const match = CONTENT_DISPOSITION_FILENAME_PATTERN.exec(contentDisposition);

  return match?.[1] ?? DEFAULT_EXPORT_FILENAME;
};

export const getParticipants = async (filters: ParticipantsFilters): Promise<ParticipantsPage> => {
  const response = await api.get("admin/participants", {
    params: { ...filters, limit: ADMIN_PAGE_SIZE },
  });

  return participantsResponseSchema.parse(response.data);
};

export const deleteParticipant = async (id: string) => {
  await api.delete(`admin/participants/${id}`);
};

export const exportParticipants = async (
  payload: ExportParticipantsPayload,
): Promise<ExportedParticipantsFile> => {
  const response = await api.get<Blob>("admin/participants/export", {
    params: payload,
    responseType: "blob",
    headers: { Accept: "text/csv" },
  });

  return {
    blob: response.data,
    filename: getAttachmentFilename(response.headers["content-disposition"]),
  };
};
