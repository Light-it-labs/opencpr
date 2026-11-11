import { subHours, subMinutes, subSeconds } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CprSessionsRepository,
  LocationsRepository,
  ParticipantsRepository,
} from "@/repositories";
import {
  CprSession,
  CreateCprSession,
  createCprSessionSchema,
  Participant,
} from "@/schemas";
import { EmailService } from "@/services";

import { CprSessionsLogic } from "./cpr-sessions.logic";

vi.mock("@/config", async () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  StatusCodes: (
    await vi.importActual<typeof import("../config/status-codes")>(
      "../config/status-codes",
    )
  ).StatusCodes,
}));
vi.mock("@/repositories", () => ({
  CprSessionsRepository: {
    create: vi.fn(),
    getClaim: vi.fn(),
    saveClaim: vi.fn(),
    linkParticipantByRegistration: vi.fn(),
    getLatestByRegistration: vi.fn(),
    countAttempts: vi.fn(),
    getSessionPosition: vi.fn(),
    countToday: vi.fn(),
  },
  LocationsRepository: { get: vi.fn() },
  ParticipantsRepository: {
    get: vi.fn(),
    findOrCreateByEmail: vi.fn(),
    reserveResultsEmail: vi.fn(),
  },
}));
vi.mock("@/services", () => ({
  EmailService: { sendResults: vi.fn() },
}));

const NOW = new Date("2026-01-15T12:00:00.000Z");

const location = {
  id: "location-0001",
  name: "Test Venue",
  timezone: "UTC",
};

const participant = {
  id: "participant-0001",
  firstName: "Test",
  lastName: "Player",
  email: "player@example.test",
  resultsEmailedAt: null,
  createdAt: NOW,
  updatedAt: null,
  deletedAt: null,
} satisfies Participant;

const kiosk = { kioskId: "kiosk-0001", locationId: location.id };

const payload: CreateCprSession = {
  publicId: "run-0002",
  registrationId: "registration-0001",
  buildId: "abc1234",
  compressions: [],
};

const storedSession = (overrides: Partial<CprSession> = {}) =>
  ({
    id: 2,
    publicId: payload.publicId,
    registrationId: payload.registrationId,
    locationId: location.id,
    participantId: null,
    score: 50,
    createdAt: NOW,
    ...overrides,
  }) as CprSession;

const givenStoredRun = (created: boolean, overrides?: Partial<CprSession>) =>
  vi.mocked(CprSessionsRepository.create).mockResolvedValue({
    created,
    session: storedSession(overrides),
  });

const givenClaim = (claimedAt: Date | null) =>
  vi.mocked(CprSessionsRepository.getClaim).mockResolvedValue(
    claimedAt
      ? {
          publicId: "registration-0001",
          participantId: participant.id,
          createdAt: claimedAt,
          updatedAt: null,
          deletedAt: null,
          firstName: participant.firstName,
          email: participant.email,
        }
      : undefined,
  );

const givenEmailedLastAt = (emailedAt: Date | null) =>
  vi
    .mocked(ParticipantsRepository.reserveResultsEmail)
    .mockImplementation((_id, notSince) =>
      Promise.resolve(!emailedAt || emailedAt <= notSince),
    );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(LocationsRepository.get).mockResolvedValue(
    location as Awaited<ReturnType<typeof LocationsRepository.get>>,
  );
  vi.mocked(ParticipantsRepository.get).mockResolvedValue(participant);
  vi.mocked(CprSessionsRepository.countAttempts).mockResolvedValue(1);
  vi.mocked(CprSessionsRepository.getSessionPosition).mockResolvedValue(1);
  vi.mocked(CprSessionsRepository.countToday).mockResolvedValue(1);
  givenClaim(subMinutes(NOW, 5));
  givenEmailedLastAt(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("CprSessionsLogic.create attribution", () => {
  it("files the run under the paired kiosk and its location, not the payload's", async () => {
    givenStoredRun(true);
    const spoofed = createCprSessionSchema.parse({
      ...payload,
      kioskId: "kiosk-9999",
      locationId: "location-9999",
    });

    await CprSessionsLogic.create(spoofed, kiosk);

    expect(LocationsRepository.get).toHaveBeenCalledWith(location.id);
    expect(CprSessionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kioskId: kiosk.kioskId,
        locationId: kiosk.locationId,
      }),
    );
  });
});

describe("CprSessionsLogic.create results email", () => {
  it("emails the first run of a claimed registration", async () => {
    givenStoredRun(true);

    await CprSessionsLogic.create(payload, kiosk);

    expect(
      CprSessionsRepository.linkParticipantByRegistration,
    ).toHaveBeenCalledWith(payload.registrationId, participant.id);
    expect(ParticipantsRepository.reserveResultsEmail).toHaveBeenCalledWith(
      participant.id,
      subSeconds(NOW, 30),
    );
    expect(EmailService.sendResults).toHaveBeenCalledWith(
      expect.objectContaining({ participant }),
    );
  });

  it("stores a run within 30 s of the last email without emailing it", async () => {
    givenStoredRun(true);
    givenEmailedLastAt(subSeconds(NOW, 20));

    const result = await CprSessionsLogic.create(payload, kiosk);

    expect(result.publicId).toBe(payload.publicId);
    expect(
      CprSessionsRepository.linkParticipantByRegistration,
    ).toHaveBeenCalledWith(payload.registrationId, participant.id);
    expect(EmailService.sendResults).not.toHaveBeenCalled();
  });

  it("emails a replay 45 s after the last email", async () => {
    givenStoredRun(true);
    givenEmailedLastAt(subSeconds(NOW, 45));

    await CprSessionsLogic.create(payload, kiosk);

    expect(EmailService.sendResults).toHaveBeenCalledOnce();
  });

  it("saves a run unlinked and unsent once its registration is over two hours old", async () => {
    givenStoredRun(true);
    givenClaim(subHours(NOW, 2.5));

    const result = await CprSessionsLogic.create(payload, kiosk);

    expect(result.publicId).toBe(payload.publicId);
    expect(
      CprSessionsRepository.linkParticipantByRegistration,
    ).not.toHaveBeenCalled();
    expect(ParticipantsRepository.get).not.toHaveBeenCalled();
    expect(EmailService.sendResults).not.toHaveBeenCalled();
  });

  it("does not email a kiosk retrying a publicId it already saved", async () => {
    givenStoredRun(false, { participantId: participant.id });

    await CprSessionsLogic.create(payload, kiosk);

    expect(
      CprSessionsRepository.linkParticipantByRegistration,
    ).not.toHaveBeenCalled();
    expect(ParticipantsRepository.reserveResultsEmail).not.toHaveBeenCalled();
    expect(EmailService.sendResults).not.toHaveBeenCalled();
  });
});

describe("CprSessionsLogic.claim results email", () => {
  const form = {
    firstName: participant.firstName,
    lastName: participant.lastName,
    email: participant.email,
  };

  beforeEach(() => {
    givenClaim(null);
    vi.mocked(ParticipantsRepository.findOrCreateByEmail).mockResolvedValue({
      participant,
      existed: true,
    });
    vi.mocked(CprSessionsRepository.saveClaim).mockResolvedValue(
      participant.id,
    );
    vi.mocked(CprSessionsRepository.getLatestByRegistration).mockResolvedValue({
      ...storedSession(),
      location,
    } as Awaited<
      ReturnType<typeof CprSessionsRepository.getLatestByRegistration>
    >);
  });

  it("emails a run that was played before the phone form landed", async () => {
    await CprSessionsLogic.claim("registration-0001", form);

    expect(EmailService.sendResults).toHaveBeenCalledOnce();
  });

  it("does not email when this participant was emailed under 30 s ago", async () => {
    givenEmailedLastAt(subSeconds(NOW, 10));

    await CprSessionsLogic.claim("registration-0001", form);

    expect(
      CprSessionsRepository.linkParticipantByRegistration,
    ).toHaveBeenCalledOnce();
    expect(EmailService.sendResults).not.toHaveBeenCalled();
  });
});
