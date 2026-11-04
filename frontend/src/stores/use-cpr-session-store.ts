import z from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// What the sensor measured, and nothing else. Rate, full-compression and
// full-recoil are judgments against AHA guidelines and are derived in
// session-scoring, so firmware and app cannot hold different numbers.
export const cprCompressionSchema = z.object({
  timestampMs: z.number().min(0),
  startDepthMm: z.number().min(0),
  endDepthMm: z.number().min(0),
});

export const cprSessionSchema = z.object({
  compressions: z.array(cprCompressionSchema).default([]),
  totalCompressions: z.number().optional(),
  totalFullCompressions: z.number().optional(),
  totalFullRebounds: z.number().optional(),
  averageCompressionEndDepthMm: z.number().optional(),
  compressionsOnBpmRange: z.number().optional(),
  averageBpm: z.number().optional(),
  score: z.number().optional(),
  /**
   * Where this run placed against everyone who played here today. Optional
   * because it can only come from the server, and the run is stored before —
   * and regardless of whether — that request lands.
   */
  percentile: z.number().optional(),
  participantsToday: z.number().optional(),
  position: z.number().optional(),
});

export type CprSession = z.infer<typeof cprSessionSchema>;
export type CprCompression = z.infer<typeof cprCompressionSchema>;

export const CHALLENGE_MODES = {
  ARDUINO: "arduino",
  MANUAL: "manual",
} as const;

export type ChallengeMode = (typeof CHALLENGE_MODES)[keyof typeof CHALLENGE_MODES];

export type SerialStatus =
  "idle" | "opening" | "reading" | "no-signal" | "sensor-fault" | "disconnected" | "error";

/**
 * How long an unchanged healthy read may go without being written again. The
 * board heartbeats twice a second, and every write here also rewrites
 * localStorage; a minute is still far inside the backend's staleness window.
 */
const SERIAL_HEALTH_REFRESH_MS = 60_000;

export type CprSessionStoreState = {
  /** Venue this kiosk is standing in. Chosen on /setup, persisted per browser. */
  locationId: string | null;
  /**
   * Identifies this machine to the health endpoint. Generated once and kept,
   * because several kiosks can stand at one location.
   */
  kioskId: string | null;
  /**
   * Last thing the sensor was seen doing, for the health heartbeat. Not
   * persisted: the port is read from boot on every screen, so a value carried
   * over from before a reload would only be stale — the live link restates it
   * within a second.
   */
  lastSerialStatus: string | null;
  lastSerialOkAt: string | null;
  lastBaselineMm: number | null;
  /**
   * Identifies one *run*. Every attempt gets a fresh one, because the backend
   * holds publicId unique.
   */
  sessionPublicId: string | null;
  /**
   * What the same person scored on their last go, so a replay can be measured
   * against it. Lives and dies with the visit, like the run itself: the next
   * participant must not be shown a stranger's number.
   */
  previousScore: number | null;
  /**
   * Identifies the *person at the booth*, and is what the QR encodes. Minted
   * once per visit and kept across replays, so a second attempt lands on the
   * same registration without asking anyone to scan again.
   *
   * The kiosk never sees the email — the phone form owns that. This id is how a
   * run reaches it: the backend resolves registration to claim to user, which
   * is also why a replay is attributed correctly even when the participant
   * fills the form late, midway through their second attempt.
   */
  registrationId: string | null;
  currentSession: CprSession | null;
  serialPort: SerialPort | null;
  /** Live state of the serial link, written by its single owner (useSerialLink). */
  serialStatus: SerialStatus;
  mode: ChallengeMode | null;
};

export type CprSessionStoreActions = {
  setCurrentSession: (session: CprSession | null) => void;
  setSerialPort: (port: SerialPort | null) => void;
  setMode: (mode: ChallengeMode | null) => void;
};

const useCprSessionStore = create<CprSessionStoreState & CprSessionStoreActions>()(
  persist(
    (set) => {
      return {
        currentSession: null,
        locationId: null,
        kioskId: null,
        lastSerialStatus: null,
        lastSerialOkAt: null,
        lastBaselineMm: null,
        sessionPublicId: null,
        previousScore: null,
        registrationId: null,
        serialPort: null,
        serialStatus: "idle",
        mode: null,

        setCurrentSession: (session) => {
          set({ currentSession: session });
        },

        setSerialPort: (port) => {
          set({ serialPort: port });
        },
        setMode: (mode) => {
          set({ mode });
        },
      };
    },
    {
      name: "cpr-session-storage",
      version: 1,
      partialize: (state) => {
        return {
          mode: state.mode,
          locationId: state.locationId,
          kioskId: state.kioskId,
          lastBaselineMm: state.lastBaselineMm,
        };
      },
      // Version 0 persisted the serial health. Left in storage it would be merged
      // back on every boot and reported as current, so only those two fields go;
      // everything else — the kiosk's setup above all — must survive the upgrade.
      migrate: (persistedState) => {
        const state = { ...(persistedState as Record<string, unknown>) };
        delete state.lastSerialStatus;
        delete state.lastSerialOkAt;

        return state as Pick<
          CprSessionStoreState,
          "mode" | "locationId" | "kioskId" | "lastBaselineMm"
        >;
      },
    },
  ),
);

export const useCprSession = () => {
  return useCprSessionStore((state) => {
    return state.currentSession;
  });
};

export const setCprSession = (session: CprSession | null) => {
  return useCprSessionStore.setState((state) => {
    return {
      ...state,
      currentSession: session,
    };
  });
};

/**
 * Folds server-side facts about the run into the one already on screen.
 *
 * The run is stored the moment it ends and the upload is fire-and-forget, so
 * anything only the server knows — where this placed today — arrives after the
 * results screen is already up. Merging keeps the measurements that are showing;
 * a no-op when the participant has already moved on and cleared the session.
 */
export const mergeCprSession = (session: Partial<CprSession>) => {
  return useCprSessionStore.setState((state) => {
    if (!state.currentSession) {
      return state;
    }

    return { ...state, currentSession: { ...state.currentSession, ...session } };
  });
};

export const useSerialPort = () => {
  return useCprSessionStore((state) => {
    return state.serialPort;
  });
};

export const setSerialPort = (port: SerialPort | null) => {
  return useCprSessionStore.setState((state) => {
    return {
      ...state,
      serialPort: port,
    };
  });
};

export const useSerialStatus = () => {
  return useCprSessionStore((state) => {
    return state.serialStatus;
  });
};

/** For checks outside React, where the hook cannot be used. */
export const getSerialStatus = () => {
  return useCprSessionStore.getState().serialStatus;
};

export const setSerialStatus = (serialStatus: SerialStatus) => {
  // Called on every frame. Skipping an unchanged value keeps the persist
  // middleware from rewriting localStorage twice a second.
  if (useCprSessionStore.getState().serialStatus === serialStatus) {
    return;
  }

  useCprSessionStore.setState({ serialStatus });
};

export const useSessionPublicId = () => {
  return useCprSessionStore((state) => {
    return state.sessionPublicId;
  });
};

/** For the save outbox, which runs outside React. */
export const getSessionPublicId = () => {
  return useCprSessionStore.getState().sessionPublicId;
};

export const useRegistrationId = () => {
  return useCprSessionStore((state) => {
    return state.registrationId;
  });
};

/** A new person at the booth: fresh registration, fresh first attempt. */
export const startNewRegistration = () => {
  const registrationId = crypto.randomUUID();
  useCprSessionStore.setState((state) => {
    return {
      ...state,
      registrationId,
      sessionPublicId: crypto.randomUUID(),
      previousScore: null,
    };
  });

  return registrationId;
};

/**
 * Ends a visit. Called by the attract screen, which is the one place a new
 * person can start from, so nothing downstream can inherit the last
 * participant's identity — a run that skips the QR is anonymous rather than
 * filed under whoever went before.
 */
export const clearRegistration = () => {
  useCprSessionStore.setState((state) => {
    return {
      ...state,
      registrationId: null,
      sessionPublicId: null,
      previousScore: null,
    };
  });
};

/**
 * Another go by the same person: new run, same registration.
 *
 * Takes the score being left behind rather than reading it from the store,
 * because the run is cleared in the same breath and the results screen is the
 * only place that knows what it showed.
 */
export const startNewAttempt = (previousScore?: number) => {
  const sessionPublicId = crypto.randomUUID();
  useCprSessionStore.setState((state) => {
    return { ...state, sessionPublicId, previousScore: previousScore ?? null };
  });

  return sessionPublicId;
};

export const usePreviousScore = () => {
  return useCprSessionStore((state) => {
    return state.previousScore;
  });
};

export const useLocationId = () => {
  return useCprSessionStore((state) => {
    return state.locationId;
  });
};

export const setLocationId = (locationId: string | null) => {
  return useCprSessionStore.setState((state) => {
    return { ...state, locationId };
  });
};

/**
 * Minted on first use and kept for the life of this browser profile. Only the
 * fallback until a board reports its own ID — see adoptDeviceKioskId.
 *
 * Deliberately not a hook: minting writes to the store, and doing that during
 * render is illegal and blows the update depth. Call it from an effect or a
 * callback.
 */
export const ensureKioskId = () => {
  const existing = useCprSessionStore.getState().kioskId;

  if (existing) {
    return existing;
  }

  const minted = crypto.randomUUID();
  useCprSessionStore.setState({ kioskId: minted });

  return minted;
};

/**
 * Takes the board's own ID as the kiosk ID, so a new domain, browser or computer
 * driving the same sensor still reports as the same kiosk.
 *
 * Not a hook, for the same reason as ensureKioskId: it writes to the store.
 */
export const adoptDeviceKioskId = (deviceId: string) => {
  if (useCprSessionStore.getState().kioskId === deviceId) {
    return;
  }

  useCprSessionStore.setState({ kioskId: deviceId });
};

/*
 * Serial health is read as three separate primitive selectors rather than one
 * object.
 *
 * Zustand compares snapshots by reference through useSyncExternalStore, so a
 * selector returning a fresh object literal is never equal to the previous one
 * and re-renders forever — "The result of getSnapshot should be cached to avoid
 * an infinite loop". Primitives compare by value, so these are stable. There is
 * a test for it.
 */
export const useLastSerialStatus = () => {
  return useCprSessionStore((state) => {
    return state.lastSerialStatus;
  });
};

export const useLastSerialOkAt = () => {
  return useCprSessionStore((state) => {
    return state.lastSerialOkAt;
  });
};

export const useLastBaselineMm = () => {
  return useCprSessionStore((state) => {
    return state.lastBaselineMm;
  });
};

export const recordSerialHealth = (health: { status: string; baselineMm?: number }) => {
  const current = useCprSessionStore.getState();
  const lastOkAt = current.lastSerialOkAt ? Date.parse(current.lastSerialOkAt) : 0;
  const isUnchanged =
    health.status === current.lastSerialStatus &&
    (health.baselineMm ?? current.lastBaselineMm) === current.lastBaselineMm;

  // Fed by every heartbeat. A change of status always lands at once; an
  // unchanged healthy read only refreshes its timestamp once a minute, and an
  // unchanged fault has nothing to refresh at all.
  if (
    isUnchanged &&
    (health.status !== "reading" || Date.now() - lastOkAt < SERIAL_HEALTH_REFRESH_MS)
  ) {
    return;
  }

  useCprSessionStore.setState((state) => {
    return {
      ...state,
      lastSerialStatus: health.status,
      // Only a healthy read counts as contact; a fault must not refresh it.
      lastSerialOkAt: health.status === "reading" ? new Date().toISOString() : state.lastSerialOkAt,
      lastBaselineMm: health.baselineMm ?? state.lastBaselineMm,
    };
  });
};

export const useMode = () => {
  return useCprSessionStore((state) => {
    return state.mode;
  });
};

export const setMode = (mode: ChallengeMode | null) => {
  return useCprSessionStore.setState((state) => {
    return {
      ...state,
      mode,
    };
  });
};
