import { addMinutes, subDays } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BadRequestError, NotFoundError } from "@/exceptions";
import {
  KioskPairingCodesRepository,
  KiosksRepository,
  LocationsRepository,
} from "@/repositories";
import { hashToken, PAIRING_CODE_ALPHABET } from "@/utils";

import { KioskPairingLogic } from "./kiosk-pairing.logic";

vi.mock("@/config", async () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  StatusCodes: (
    await vi.importActual<typeof import("../../config/status-codes")>(
      "../../config/status-codes",
    )
  ).StatusCodes,
}));
vi.mock("@/repositories", () => ({
  KioskPairingCodesRepository: { create: vi.fn() },
  KiosksRepository: { revokePairing: vi.fn() },
  LocationsRepository: { getActive: vi.fn() },
}));

type StoredLocation = Awaited<ReturnType<typeof LocationsRepository.getActive>>;

const NOW = new Date("2026-01-15T12:00:00.000Z");
const LOCATION_ID = "location-0001";
const USER_ID = "user-0001";

const givenLocation = (endDate: Date | null) =>
  vi.mocked(LocationsRepository.getActive).mockResolvedValue({
    id: LOCATION_ID,
    endDate,
    timezone: "UTC",
  } as StoredLocation);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  givenLocation(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("KioskPairingLogic.createCode", () => {
  it("returns an 8-character code valid for 15 minutes and stores only its hash", async () => {
    const { code, expiresAt } = await KioskPairingLogic.createCode(
      LOCATION_ID,
      USER_ID,
    );

    expect(code).toHaveLength(8);
    expect(
      [...code].every((char) => PAIRING_CODE_ALPHABET.includes(char)),
    ).toBe(true);
    expect(expiresAt).toEqual(addMinutes(NOW, 15));
    expect(KioskPairingCodesRepository.create).toHaveBeenCalledWith({
      codeHash: hashToken(code),
      locationId: LOCATION_ID,
      createdByUserId: USER_ID,
      expiresAt,
    });
  });

  it("never uses characters that read alike", async () => {
    expect(PAIRING_CODE_ALPHABET).not.toMatch(/[0O1IL]/);
  });

  it("draws again when the code collides with a stored one", async () => {
    vi.mocked(KioskPairingCodesRepository.create)
      .mockRejectedValueOnce(Object.assign(new Error("dup"), { errno: 1062 }))
      .mockResolvedValueOnce(undefined);

    await KioskPairingLogic.createCode(LOCATION_ID, USER_ID);

    expect(KioskPairingCodesRepository.create).toHaveBeenCalledTimes(2);
  });

  it("refuses an unknown or disabled location", async () => {
    vi.mocked(LocationsRepository.getActive).mockResolvedValue(undefined);

    await expect(
      KioskPairingLogic.createCode(LOCATION_ID, USER_ID),
    ).rejects.toThrow(NotFoundError);
    expect(KioskPairingCodesRepository.create).not.toHaveBeenCalled();
  });

  it("refuses a location whose last day is past", async () => {
    givenLocation(subDays(NOW, 2));

    await expect(
      KioskPairingLogic.createCode(LOCATION_ID, USER_ID),
    ).rejects.toThrow(BadRequestError);
    expect(KioskPairingCodesRepository.create).not.toHaveBeenCalled();
  });
});

describe("KioskPairingLogic.revoke", () => {
  it("clears the kiosk's pairing", async () => {
    vi.mocked(KiosksRepository.revokePairing).mockResolvedValue(true);

    await KioskPairingLogic.revoke("kiosk-0001");

    expect(KiosksRepository.revokePairing).toHaveBeenCalledWith("kiosk-0001");
  });

  it("answers not found for an unknown kiosk", async () => {
    vi.mocked(KiosksRepository.revokePairing).mockResolvedValue(false);

    await expect(KioskPairingLogic.revoke("kiosk-0001")).rejects.toThrow(
      NotFoundError,
    );
  });
});
