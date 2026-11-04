import { utc } from "@date-fns/utc";
import { format, formatISO } from "date-fns";

import { NotFoundError } from "@/exceptions";
import { ParticipantsRepository } from "@/repositories";
import {
  ExportAdminParticipantsQuery,
  ListAdminParticipantsQuery,
} from "@/schemas";
import { AuthenticatedUser } from "@/types";
import { paginate, toCsv } from "@/utils";

import { scopeLocationIds } from "./location-scope";

const EXPORT_HEADERS = [
  "First name",
  "Last name",
  "Email",
  "Sessions",
  "Best score",
  "Last played",
];

// The range bounds are UTC instants, so the file name has to read them in UTC
// too or an admin west of Greenwich would see the day before the one they asked for.
const fileDate = (date?: Date) =>
  date ? format(date, "yyyy-MM-dd", { in: utc }) : "all";

export const ParticipantsLogic = {
  list: async (
    user: AuthenticatedUser,
    { locationId, ...query }: ListAdminParticipantsQuery,
  ) => {
    const locationIds = scopeLocationIds(user, locationId);
    const { items, total } = await ParticipantsRepository.listForAdmin({
      ...query,
      locationIds,
    });

    // A second lookup rather than a join: joining venues into the grouped
    // query would multiply its rows and break the play-history aggregates.
    const visits = await ParticipantsRepository.listLocationsByParticipantIds(
      items.map((participant) => participant.id),
      locationIds,
    );
    const locationsByParticipant = new Map<
      string,
      { id: string; name: string }[]
    >();

    for (const { id, name, participantId } of visits) {
      if (participantId) {
        locationsByParticipant.set(participantId, [
          ...(locationsByParticipant.get(participantId) ?? []),
          { id, name },
        ]);
      }
    }

    return paginate(
      items.map((participant) => ({
        ...participant,
        locations: locationsByParticipant.get(participant.id) ?? [],
      })),
      query,
      total,
    );
  },

  exportCsv: async (filters: ExportAdminParticipantsQuery) => {
    const rows = await ParticipantsRepository.listForExport(filters);

    const csv = toCsv(
      EXPORT_HEADERS,
      rows.map((row) => [
        row.firstName,
        row.lastName,
        row.email,
        row.sessionsCount,
        row.bestScore,
        row.lastPlayedAt ? formatISO(row.lastPlayedAt, { in: utc }) : null,
      ]),
    );
    const filename = `participants-${fileDate(filters.dateFrom)}-${fileDate(filters.dateTo)}.csv`;

    return { filename, csv };
  },

  remove: async (id: string) => {
    const participant = await ParticipantsRepository.get(id);

    if (!participant) {
      throw new NotFoundError({ entity: "participant", value: id });
    }

    await ParticipantsRepository.remove(id);
  },
};
