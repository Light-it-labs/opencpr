import { AxiosError, type AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateCprSession, CreatedCprSession } from "./types";

vi.mock("./api", () => {
  return { createCprSession: vi.fn() };
});

vi.mock("@sentry/react", () => {
  return { captureMessage: vi.fn() };
});

vi.mock("@/stores", () => {
  return {
    clearKioskPairing: vi.fn(),
    getKioskToken: vi.fn(),
    getSessionPublicId: vi.fn(),
    mergeCprSession: vi.fn(),
  };
});

const STORAGE_KEY = "cpr-session-outbox";

const createStorage = (): Storage => {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    clear: () => {
      entries.clear();
    },
    getItem: (key) => {
      return entries.get(key) ?? null;
    },
    key: (index) => {
      return [...entries.keys()][index] ?? null;
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, String(value));
    },
  };
};

const payload = (publicId: string): CreateCprSession => {
  return {
    publicId,
    registrationId: null,
    kioskId: "kiosk-1",
    buildId: "abc123",
    compressions: [{ timestampMs: 0, startDepthMm: 0, endDepthMm: 55 }],
  };
};

const savedSession = (
  publicId: string,
  ranking: Partial<CreatedCprSession> = {},
): CreatedCprSession => {
  return {
    publicId,
    position: null,
    percentile: null,
    participantsToday: null,
    ...ranking,
  };
};

const networkError = () => {
  return new AxiosError("Network Error", "ERR_NETWORK");
};

const httpError = (status: number) => {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
  } as AxiosResponse);
};

/** Lets the in-flight send settle without moving the fake clock. */
const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

const storedIds = () => {
  return Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as object);
};

/** The module keeps its queue and timers at module level, so every test gets a fresh copy. */
const loadOutbox = async () => {
  vi.resetModules();

  const api = await import("./api");
  const sentry = await import("@sentry/react");
  const stores = await import("@/stores");
  const outbox = await import("./outbox");

  const getKioskToken = vi.mocked(stores.getKioskToken);
  getKioskToken.mockReturnValue("kiosk-token");

  const clearKioskPairing = vi.mocked(stores.clearKioskPairing);
  clearKioskPairing.mockImplementation(() => {
    getKioskToken.mockReturnValue(null);
  });

  return {
    ...outbox,
    createCprSession: vi.mocked(api.createCprSession),
    captureMessage: vi.mocked(sentry.captureMessage),
    clearKioskPairing,
    getKioskToken,
    getSessionPublicId: vi.mocked(stores.getSessionPublicId),
    mergeCprSession: vi.mocked(stores.mergeCprSession),
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
  vi.stubGlobal("localStorage", createStorage());
  vi.stubGlobal("window", { addEventListener: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("queueCprSession", () => {
  it("writes the run to storage before the first send", async () => {
    const { createCprSession, queueCprSession } = await loadOutbox();
    createCprSession.mockReturnValue(new Promise(() => {}));

    queueCprSession(payload("run-1"));

    expect(storedIds()).toEqual(["run-1"]);
  });

  it("sends the run at once and forgets it when the API has it", async () => {
    const { createCprSession, queueCprSession } = await loadOutbox();
    createCprSession.mockResolvedValue(savedSession("run-1"));

    queueCprSession(payload("run-1"));
    await settle();

    expect(createCprSession).toHaveBeenCalledWith(payload("run-1"));
    expect(storedIds()).toEqual([]);
  });

  it("keeps a run the API could not take and sends it again when it can", async () => {
    const { createCprSession, queueCprSession } = await loadOutbox();
    createCprSession.mockRejectedValueOnce(networkError());
    createCprSession.mockResolvedValue(savedSession("run-1"));

    queueCprSession(payload("run-1"));
    await settle();

    expect(storedIds()).toEqual(["run-1"]);

    await vi.advanceTimersByTimeAsync(5_000);

    expect(createCprSession).toHaveBeenCalledTimes(2);
    expect(storedIds()).toEqual([]);
  });

  it("backs off at 5 s, 15 s, 60 s and 5 min, then every 15 min", async () => {
    const { createCprSession, queueCprSession } = await loadOutbox();
    createCprSession.mockRejectedValue(networkError());

    queueCprSession(payload("run-1"));
    await settle();

    for (const delayMs of [5_000, 15_000, 60_000, 5 * 60_000, 15 * 60_000, 15 * 60_000]) {
      const before = createCprSession.mock.calls.length;

      await vi.advanceTimersByTimeAsync(delayMs - 1);
      expect(createCprSession).toHaveBeenCalledTimes(before);

      await vi.advanceTimersByTimeAsync(1);
      expect(createCprSession).toHaveBeenCalledTimes(before + 1);
    }

    expect(storedIds()).toEqual(["run-1"]);
  });

  it("sends the newest run first so the one on screen gets its ranking", async () => {
    const { createCprSession, queueCprSession } = await loadOutbox();
    createCprSession.mockRejectedValueOnce(networkError());
    createCprSession.mockImplementation((item) => {
      return Promise.resolve(savedSession(item.publicId));
    });

    queueCprSession(payload("older"));
    await settle();
    await vi.advanceTimersByTimeAsync(1_000);

    queueCprSession(payload("newer"));
    await settle();

    const sentIds = createCprSession.mock.calls.map(([item]) => {
      return item.publicId;
    });

    expect(sentIds).toEqual(["older", "newer", "older"]);
    expect(storedIds()).toEqual([]);
  });

  it.each([400, 422])(
    "drops a run the API refuses outright and reports it, instead of retrying (%i)",
    async (status) => {
      const { captureMessage, clearKioskPairing, createCprSession, queueCprSession } =
        await loadOutbox();
      createCprSession.mockRejectedValue(httpError(status));

      queueCprSession(payload("run-1"));
      await settle();
      await vi.advanceTimersByTimeAsync(60 * 60_000);

      expect(createCprSession).toHaveBeenCalledTimes(1);
      expect(storedIds()).toEqual([]);
      expect(clearKioskPairing).not.toHaveBeenCalled();
      expect(captureMessage).toHaveBeenCalledWith(
        "Kiosk run rejected by the API",
        expect.objectContaining({ extra: expect.objectContaining({ status }) }),
      );
    },
  );

  it("keeps a run refused for lack of pairing and stops sending until the kiosk is paired", async () => {
    const { captureMessage, clearKioskPairing, createCprSession, queueCprSession } =
      await loadOutbox();
    createCprSession.mockRejectedValue(httpError(401));

    queueCprSession(payload("run-1"));
    await settle();
    await vi.advanceTimersByTimeAsync(60 * 60_000);

    expect(createCprSession).toHaveBeenCalledTimes(1);
    expect(clearKioskPairing).toHaveBeenCalledTimes(1);
    expect(storedIds()).toEqual(["run-1"]);
    expect(captureMessage).not.toHaveBeenCalledWith(
      "Kiosk run rejected by the API",
      expect.anything(),
    );
  });

  it("holds runs while the kiosk is unpaired without sending them", async () => {
    const { createCprSession, getKioskToken, queueCprSession } = await loadOutbox();
    getKioskToken.mockReturnValue(null);

    queueCprSession(payload("run-1"));
    await settle();
    await vi.advanceTimersByTimeAsync(60 * 60_000);

    expect(createCprSession).not.toHaveBeenCalled();
    expect(storedIds()).toEqual(["run-1"]);
  });

  it("sends the held runs once the kiosk is paired again", async () => {
    const { createCprSession, getKioskToken, queueCprSession, retryCprSessionOutbox } =
      await loadOutbox();
    createCprSession.mockRejectedValueOnce(httpError(401));
    createCprSession.mockResolvedValue(savedSession("run-1"));

    queueCprSession(payload("run-1"));
    await settle();

    expect(storedIds()).toEqual(["run-1"]);

    getKioskToken.mockReturnValue("new-kiosk-token");
    retryCprSessionOutbox();
    await settle();

    expect(createCprSession).toHaveBeenCalledTimes(2);
    expect(storedIds()).toEqual([]);
  });

  it.each([408, 429])("retries a run the API asked to see later (%i)", async (status) => {
    const { createCprSession, queueCprSession } = await loadOutbox();
    createCprSession.mockRejectedValueOnce(httpError(status));
    createCprSession.mockResolvedValue(savedSession("run-1"));

    queueCprSession(payload("run-1"));
    await settle();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(createCprSession).toHaveBeenCalledTimes(2);
    expect(storedIds()).toEqual([]);
  });

  it("folds the ranking into the run still on screen", async () => {
    const { createCprSession, getSessionPublicId, mergeCprSession, queueCprSession } =
      await loadOutbox();
    getSessionPublicId.mockReturnValue("run-1");
    createCprSession.mockResolvedValue(
      savedSession("run-1", { position: 3, percentile: 80, participantsToday: 12 }),
    );

    queueCprSession(payload("run-1"));
    await settle();

    expect(mergeCprSession).toHaveBeenCalledWith({
      participantsToday: 12,
      percentile: 80,
      position: 3,
    });
  });

  it("does not show an older run's ranking over a newer attempt", async () => {
    const { createCprSession, getSessionPublicId, mergeCprSession, queueCprSession } =
      await loadOutbox();
    getSessionPublicId.mockReturnValue("run-2");
    createCprSession.mockResolvedValue(savedSession("run-1", { position: 3 }));

    queueCprSession(payload("run-1"));
    await settle();

    expect(mergeCprSession).not.toHaveBeenCalled();
  });

  it("reports a run still unsaved after ten minutes, once", async () => {
    const { captureMessage, createCprSession, queueCprSession } = await loadOutbox();
    createCprSession.mockRejectedValue(networkError());

    queueCprSession(payload("run-1"));
    await settle();
    await vi.advanceTimersByTimeAsync(10 * 60_000 - 1);

    expect(captureMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30 * 60_000);

    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      "Kiosk run still unsaved after 10 minutes",
      expect.anything(),
    );
  });

  it("holds at most 200 runs, dropping and reporting the oldest", async () => {
    const { captureMessage, createCprSession, queueCprSession } = await loadOutbox();
    createCprSession.mockRejectedValue(networkError());

    for (let index = 0; index < 201; index += 1) {
      queueCprSession(payload(`run-${index}`));
      await vi.advanceTimersByTimeAsync(1);
    }

    const ids = storedIds();

    expect(ids).toHaveLength(200);
    expect(ids).not.toContain("run-0");
    expect(ids).toContain("run-200");
    expect(captureMessage).toHaveBeenCalledWith(
      "Kiosk outbox full, oldest unsaved run dropped",
      expect.anything(),
    );
  });
});

describe("startCprSessionOutbox", () => {
  it("sends again what an earlier page load left behind", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        "run-1": {
          payload: payload("run-1"),
          queuedAt: Date.now() - 1_000,
          attempts: 2,
          nextAttemptAt: Date.now() + 60_000,
          reportedStale: false,
        },
      }),
    );
    const { createCprSession, startCprSessionOutbox } = await loadOutbox();
    createCprSession.mockResolvedValue(savedSession("run-1"));

    startCprSessionOutbox();
    await settle();

    expect(createCprSession).toHaveBeenCalledWith(payload("run-1"));
    expect(storedIds()).toEqual([]);
  });

  it("retries as soon as the browser comes back online", async () => {
    const { createCprSession, queueCprSession, startCprSessionOutbox } = await loadOutbox();
    createCprSession.mockRejectedValueOnce(networkError());
    createCprSession.mockResolvedValue(savedSession("run-1"));

    startCprSessionOutbox();
    queueCprSession(payload("run-1"));
    await settle();

    const addEventListener = vi.mocked(window.addEventListener);
    const [, onOnline] = addEventListener.mock.calls.find(([event]) => {
      return event === "online";
    }) as [string, () => void];

    onOnline();
    await settle();

    expect(createCprSession).toHaveBeenCalledTimes(2);
    expect(storedIds()).toEqual([]);
  });

  it("starts with an empty queue when storage holds garbage", async () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    const { createCprSession, startCprSessionOutbox } = await loadOutbox();

    startCprSessionOutbox();
    await settle();

    expect(createCprSession).not.toHaveBeenCalled();
  });
});
