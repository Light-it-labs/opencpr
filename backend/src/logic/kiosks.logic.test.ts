import { addMinutes, subMinutes } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BadRequestError, ConflictError } from "@/exceptions";
import {
  KioskPairingCodesRepository,
  KiosksRepository,
  LocationsRepository,
} from "@/repositories";
import { kioskHeartbeatSchema } from "@/schemas";
import { hashToken } from "@/utils";

import { KiosksLogic } from "./kiosks.logic";

const tx = vi.hoisted(() => ({ transaction: "tx" }));

vi.mock("@/config", async () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  StatusCodes: (
    await vi.importActual<typeof import("../config/status-codes")>(
      "../config/status-codes",
    )
  ).StatusCodes,
}));
vi.mock("../db", () => ({
  db: {
    transaction: (run: (executor: typeof tx) => Promise<unknown>) => run(tx),
  },
}));
vi.mock("@/repositories", () => ({
  KioskPairingCodesRepository: { getForUpdate: vi.fn(), markUsed: vi.fn() },
  KiosksRepository: {
    pair: vi.fn(),
    recordHeartbeat: vi.fn(),
    rekey: vi.fn(),
  },
  LocationsRepository: { get: vi.fn() },
}));

type StoredCode = Awaited<
  ReturnType<typeof KioskPairingCodesRepository.getForUpdate>
>;
type StoredLocation = Awaited<ReturnType<typeof LocationsRepository.get>>;

const NOW = new Date("2026-01-15T12:00:00.000Z");
const CODE = "ABCD2345";

const location = {
  id: "location-0001",
  name: "Test Venue",
  city: "Test City",
  timezone: "UTC",
};

const pairingCode = (overrides: Partial<NonNullable<StoredCode>> = {}) =>
  ({
    id: "code-0001",
    codeHash: hashToken(CODE),
    locationId: location.id,
    createdByUserId: "user-0001",
    expiresAt: addMinutes(NOW, 10),
    usedAt: null,
    ...overrides,
  }) as StoredCode;

const kiosk = { kioskId: "kiosk-0001", locationId: location.id };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(KioskPairingCodesRepository.getForUpdate).mockResolvedValue(
    pairingCode(),
  );
  vi.mocked(KioskPairingCodesRepository.markUsed).mockResolvedValue(true);
  vi.mocked(LocationsRepository.get).mockResolvedValue(
    location as StoredLocation,
  );
  vi.mocked(KiosksRepository.rekey).mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("KiosksLogic.pair", () => {
  it("pairs the kiosk with the code's location and returns a token", async () => {
    const result = await KiosksLogic.pair({
      code: CODE,
      kioskId: "kiosk-0001",
    });

    expect(result).toEqual({
      token: expect.stringMatching(/^[\w-]{43}$/),
      location: { id: location.id, name: location.name, city: location.city },
    });
    expect(KioskPairingCodesRepository.getForUpdate).toHaveBeenCalledWith(
      hashToken(CODE),
      tx,
    );
    expect(KioskPairingCodesRepository.markUsed).toHaveBeenCalledWith(
      "code-0001",
      tx,
    );
    expect(KiosksRepository.pair).toHaveBeenCalledWith(
      {
        kioskId: "kiosk-0001",
        locationId: location.id,
        tokenHash: hashToken(result.token),
      },
      tx,
    );
  });

  it("accepts the code in lowercase, with spaces or dashes", async () => {
    await KiosksLogic.pair({ code: " abcd-2345 ", kioskId: "kiosk-0001" });
    await KiosksLogic.pair({ code: "ab cd 23 45", kioskId: "kiosk-0001" });

    expect(
      vi.mocked(KioskPairingCodesRepository.getForUpdate).mock.calls,
    ).toEqual([
      [hashToken(CODE), tx],
      [hashToken(CODE), tx],
    ]);
  });

  it("gives a kiosk paired again a new token", async () => {
    const first = await KiosksLogic.pair({ code: CODE, kioskId: "kiosk-0001" });
    const second = await KiosksLogic.pair({
      code: CODE,
      kioskId: "kiosk-0001",
    });

    expect(second.token).not.toBe(first.token);
    expect(KiosksRepository.pair).toHaveBeenLastCalledWith(
      expect.objectContaining({ tokenHash: hashToken(second.token) }),
      tx,
    );
  });

  it.each([
    ["an unknown code", undefined],
    ["a used code", pairingCode({ usedAt: subMinutes(NOW, 1) })],
    ["an expired code", pairingCode({ expiresAt: subMinutes(NOW, 1) })],
  ])("refuses %s with the generic error", async (_, stored) => {
    vi.mocked(KioskPairingCodesRepository.getForUpdate).mockResolvedValue(
      stored,
    );

    await expect(
      KiosksLogic.pair({ code: CODE, kioskId: "kiosk-0001" }),
    ).rejects.toThrow(
      new BadRequestError("This pairing code is invalid or has expired."),
    );
    expect(KioskPairingCodesRepository.markUsed).not.toHaveBeenCalled();
    expect(KiosksRepository.pair).not.toHaveBeenCalled();
  });

  it("refuses a code another booth spent at the same moment", async () => {
    vi.mocked(KioskPairingCodesRepository.markUsed).mockResolvedValue(false);

    await expect(
      KiosksLogic.pair({ code: CODE, kioskId: "kiosk-0001" }),
    ).rejects.toThrow(BadRequestError);
    expect(KiosksRepository.pair).not.toHaveBeenCalled();
  });
});

describe("KiosksLogic.heartbeat", () => {
  const report = kioskHeartbeatSchema.parse({
    locationId: "location-9999",
    serialStatus: "reading",
    buildId: "abc1234",
  });

  it("records the heartbeat on the paired kiosk, ignoring a sent location", async () => {
    const kioskId = await KiosksLogic.heartbeat(kiosk, "kiosk-0001", report);

    expect(kioskId).toBe("kiosk-0001");
    expect(KiosksRepository.rekey).not.toHaveBeenCalled();
    expect(KiosksRepository.recordHeartbeat).toHaveBeenCalledWith(
      "kiosk-0001",
      { serialStatus: "reading", buildId: "abc1234" },
    );
  });

  it("stores an omitted serial status as unknown", async () => {
    await KiosksLogic.heartbeat(kiosk, "kiosk-0001", {});

    expect(KiosksRepository.recordHeartbeat).toHaveBeenCalledWith(
      "kiosk-0001",
      { serialStatus: null },
    );
  });

  it("moves the kiosk to the id its board reports", async () => {
    const kioskId = await KiosksLogic.heartbeat(kiosk, "board-0001", report);

    expect(kioskId).toBe("board-0001");
    expect(KiosksRepository.rekey).toHaveBeenCalledWith(
      "kiosk-0001",
      "board-0001",
    );
    expect(KiosksRepository.recordHeartbeat).toHaveBeenCalledWith(
      "board-0001",
      expect.anything(),
    );
  });

  it("treats a change of case as the same id", async () => {
    const kioskId = await KiosksLogic.heartbeat(kiosk, "KIOSK-0001", report);

    expect(kioskId).toBe("kiosk-0001");
    expect(KiosksRepository.rekey).not.toHaveBeenCalled();
  });

  it("refuses an id another kiosk already has", async () => {
    vi.mocked(KiosksRepository.rekey).mockResolvedValue(false);

    await expect(
      KiosksLogic.heartbeat(kiosk, "kiosk-0002", report),
    ).rejects.toThrow(ConflictError);
    expect(KiosksRepository.recordHeartbeat).not.toHaveBeenCalled();
  });
});
