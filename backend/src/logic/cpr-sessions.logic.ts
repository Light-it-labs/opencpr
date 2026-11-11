import { isBefore, subHours, subSeconds } from "date-fns";

import { logger } from "@/config";
import {
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from "@/exceptions";
import {
  CprSessionsRepository,
  LocationsRepository,
  ParticipantsRepository,
} from "@/repositories";
import { ClaimSession, CprSession, CreateCprSession } from "@/schemas";
import { EmailService } from "@/services";
import { scoreSession, startOfLocalDay } from "@/utils";

/**
 * What anyone may read about a run by its sequential id: the scores only. The
 * registration and public ids are what a claim is made with, and the ids are
 * guessable, so neither they nor who played are exposed here.
 */
const toPublicSessionResult = ({
  averageBpm,
  averageCompressionEndDepthMm,
  compressionsOnBpmRange,
  createdAt,
  durationMs,
  id,
  locationId,
  score,
  totalCompressions,
  totalFullCompressions,
  totalFullRebounds,
}: CprSession) => ({
  id,
  locationId,
  score,
  totalCompressions,
  totalFullCompressions,
  totalFullRebounds,
  averageCompressionEndDepthMm,
  compressionsOnBpmRange,
  averageBpm,
  durationMs,
  createdAt,
});

/** Emails are matched case-insensitively, as the participants lookup does. */
const isSameEmail = (stored: string | null, submitted: string) =>
  stored?.toLowerCase() === submitted.toLowerCase();

const registrationTakenError = () =>
  new ConflictError({
    message: "This registration has already been completed with another email.",
  });

const startOfToday = (timezone: string) =>
  startOfLocalDay(timezone, new Date());

// A real replay at the booth takes 45 to 90 s, so it still gets its email.
const RESULTS_EMAIL_INTERVAL_SECONDS = 30;

/** A booth visit lasts minutes; a registration is not a standing pass. */
const REGISTRATION_LIFETIME_HOURS = 2;

const isRegistrationExpired = (claimedAt: Date) =>
  isBefore(claimedAt, subHours(new Date(), REGISTRATION_LIFETIME_HOURS));

const reserveResultsEmail = (participantId: string) =>
  ParticipantsRepository.reserveResultsEmail(
    participantId,
    subSeconds(new Date(), RESULTS_EMAIL_INTERVAL_SECONDS),
  );

export const CprSessionsLogic = {
  get: async (id: CprSession["id"]) => {
    const session = await CprSessionsRepository.get(id);
    if (!session) {
      throw new NotFoundError({ entity: "CPR session", value: id });
    }

    const position = await CprSessionsRepository.getSessionPosition(
      session,
      startOfToday(session.location.timezone),
    );
    return { ...toPublicSessionResult(session), position };
  },

  /**
   * Has a phone registration landed for this visit yet? Polled by the kiosk.
   * Anyone holding the registration id can poll it, so who claimed it stays out.
   */
  getClaim: async (registrationId: string) => {
    const claim = await CprSessionsRepository.getClaim(registrationId);

    return { claimed: Boolean(claim) };
  },

  /**
   * Submitted from the participant's phone. The run itself may not have been
   * uploaded yet — on a flaky venue network the phone usually wins the race —
   * so the claim is stored independently and linked to whichever arrives later.
   */
  claim: async (registrationId: string, data: ClaimSession) => {
    // Read before saveClaim: a resubmitted form must not send a second copy of
    // results this registration has already been emailed.
    const existingClaim = await CprSessionsRepository.getClaim(registrationId);

    // Checked before the participant is looked up so a refused claim stores
    // nothing. The registration id is in the QR on a public screen, so anyone
    // nearby could otherwise file someone else's runs under their own email.
    if (existingClaim && !isSameEmail(existingClaim.email, data.email)) {
      throw registrationTakenError();
    }

    const { existed, participant } =
      await ParticipantsRepository.findOrCreateByEmail({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      });

    // Counted before this run exists, so it is how many they have already done.
    const previousAttempts = existed
      ? await CprSessionsRepository.countAttempts({
          participantId: participant.id,
        })
      : 0;

    const alreadyClaimed = Boolean(existingClaim);

    // A concurrent claim by someone else may have landed since the check
    // above; the first one stored wins.
    const claimedBy = await CprSessionsRepository.saveClaim(
      registrationId,
      participant.id,
    );
    if (claimedBy !== participant.id) {
      throw registrationTakenError();
    }

    // Backfills every run already recorded under this registration, not just
    // one: the participant may have replayed before their phone form landed.
    if (!existingClaim || !isRegistrationExpired(existingClaim.createdAt)) {
      await CprSessionsRepository.linkParticipantByRegistration(
        registrationId,
        participant.id,
      );
    }

    // play-then-register: the run was stored before we knew who played it, so
    // create() had nobody to email. This is the first moment it can be sent.
    if (!alreadyClaimed) {
      const session =
        await CprSessionsRepository.getLatestByRegistration(registrationId);

      if (session && (await reserveResultsEmail(participant.id))) {
        logger.info(
          `Sending results of session ${session.id} to participant ${participant.id}`,
        );

        const position = await CprSessionsRepository.getSessionPosition(
          session,
          startOfToday(session.location.timezone),
        );

        await EmailService.sendResults({
          participant,
          session,
          position,
          locationName: session.location.name,
          attempt: previousAttempts + 1,
        });
      }
    }

    // Same answer for a new and a known email, so the public form cannot reveal who has played.
    return { claimed: true };
  },

  create: async (data: CreateCprSession) => {
    const location = await LocationsRepository.get(data.locationId);
    if (!location) {
      throw new UnprocessableEntityError(
        `Location with id ${data.locationId} does not exist`,
      );
    }

    const { compressions, ...sessionData } = data;

    const sessionStats = scoreSession(compressions);

    const { created, session } = await CprSessionsRepository.create({
      ...sessionData,
      ...sessionStats,
      compressions,
    });

    // A registration may already be waiting, either from this run's own QR or
    // from an earlier attempt made under the same registration.
    let { participantId } = session;
    if (created && !participantId && data.registrationId) {
      const claim = await CprSessionsRepository.getClaim(data.registrationId);
      // Past its lifetime the run is still kept, just not filed under anyone.
      if (claim && !isRegistrationExpired(claim.createdAt)) {
        await CprSessionsRepository.linkParticipantByRegistration(
          data.registrationId,
          claim.participantId,
        );
        participantId = claim.participantId;
      }
    }

    // Counted by participant when we know who this is, so attempts follow the person
    // across registrations and across days; by registration otherwise, which at
    // least keeps one visit's replays together.
    const attempt = await CprSessionsRepository.countAttempts({
      participantId,
      registrationId: data.registrationId,
    });

    const today = startOfToday(location.timezone);
    const position = await CprSessionsRepository.getSessionPosition(
      session,
      today,
    );

    // "Top N%" rather than "Nth place": a placement means nothing without the
    // size of the field, and the field is still filling up all day.
    const participantsToday = await CprSessionsRepository.countToday(
      session.locationId,
      today,
    );
    const percentile = participantsToday
      ? Math.max(1, Math.ceil((position / participantsToday) * 100))
      : null;

    // register-then-play: the form arrived first, so this run already knows who
    // played it. Keyed on the linked participantId, not the payload's — a run claimed
    // by an earlier registration would otherwise go unsent.
    if (created && participantId) {
      const participant = await ParticipantsRepository.get(participantId);

      if (participant?.email && (await reserveResultsEmail(participant.id))) {
        logger.info(
          `Sending results of session ${session.id} to participant ${participant.id}`,
        );

        await EmailService.sendResults({
          participant,
          session,
          position,
          locationName: location.name,
          attempt,
        });
      }
    }

    // Only what the kiosk shows. The endpoint is unauthenticated, so the run's
    // ids and who played stay out of the answer, a replayed publicId included.
    return {
      publicId: session.publicId,
      position,
      percentile,
      participantsToday,
    };
  },
};
