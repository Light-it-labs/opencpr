import * as Sentry from "@sentry/react";
import { isAxiosError } from "axios";

import { getSessionPublicId, mergeCprSession } from "@/stores";
import { createCprSession } from "./api";
import type { CprSession, CreateCprSession, CreatedCprSession } from "./types";

const STORAGE_KEY = "cpr-session-outbox";
const MAX_ITEMS = 200;
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 5 * 60_000];
const STEADY_RETRY_MS = 15 * 60_000;
const STALE_AFTER_MS = 10 * 60_000;

type OutboxItem = {
  payload: CreateCprSession;
  queuedAt: number;
  attempts: number;
  nextAttemptAt: number;
  reportedStale: boolean;
};

type Outbox = Record<CprSession["publicId"], OutboxItem>;

let outbox: Outbox | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let isRetryRequested = false;
let blockedUntil = 0;

const loadOutbox = (): Outbox => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");

    return stored && typeof stored === "object" ? (stored as Outbox) : {};
  } catch {
    return {};
  }
};

const getOutbox = () => {
  outbox ??= loadOutbox();

  return outbox;
};

// The in-memory copy stays authoritative when storage is full or blocked, so a
// run still goes out this session even if it would not survive a reload.
const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getOutbox()));
  } catch {
    // Full or blocked storage: carry on with the in-memory copy.
  }
};

const report = (message: string, item: OutboxItem, extra?: Record<string, unknown>) => {
  Sentry.captureMessage(message, {
    level: "error",
    tags: { "kiosk.id": item.payload.kioskId ?? "unset", "kiosk.session": item.payload.publicId },
    extra: { attempts: item.attempts, queuedAt: new Date(item.queuedAt).toISOString(), ...extra },
  });
};

/** Newest first, so the run on screen gets its ranking before older backlog. */
const getQueue = () => {
  return Object.values(getOutbox()).sort((a, b) => {
    return b.queuedAt - a.queuedAt;
  });
};

const remove = (publicId: string) => {
  delete getOutbox()[publicId];
  persist();
};

const getRetryDelay = (attempts: number) => {
  return RETRY_DELAYS_MS[attempts - 1] ?? STEADY_RETRY_MS;
};

// 408 and 429 ask to be tried later; any other 4xx is refused however often it is sent.
const isPermanentRejection = (error: unknown) => {
  const status = isAxiosError(error) ? error.response?.status : undefined;

  return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
};

const reportStaleItems = (now: number) => {
  const stale = getQueue().filter((item) => {
    return !item.reportedStale && now - item.queuedAt >= STALE_AFTER_MS;
  });

  if (!stale.length) {
    return;
  }

  stale.forEach((item) => {
    item.reportedStale = true;
    report("Kiosk run still unsaved after 10 minutes", item);
  });
  persist();
};

const handleSaved = (saved: CreatedCprSession) => {
  // Only the run still on screen; a newer attempt must not show an older rank.
  if (getSessionPublicId() !== saved.publicId) {
    return;
  }

  // Nulled rather than omitted by an older backend, and the store models "we
  // never heard" as absent either way.
  mergeCprSession({
    participantsToday: saved.participantsToday ?? undefined,
    percentile: saved.percentile ?? undefined,
    position: saved.position ?? undefined,
  });
};

/** Resolves false when the API could not be reached, so the pass should stop. */
const send = async (item: OutboxItem) => {
  const { publicId } = item.payload;

  try {
    const saved = await createCprSession(item.payload);
    remove(publicId);
    handleSaved(saved);

    return true;
  } catch (error) {
    if (isPermanentRejection(error)) {
      remove(publicId);
      report("Kiosk run rejected by the API", item, {
        status: isAxiosError(error) ? error.response?.status : undefined,
      });

      return true;
    }

    item.attempts += 1;
    item.nextAttemptAt = Date.now() + getRetryDelay(item.attempts);
    blockedUntil = item.nextAttemptAt;
    persist();

    return false;
  }
};

const scheduleNext = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const wakeTimes = getQueue().map((item) => {
    const retryAt = Math.max(item.nextAttemptAt, blockedUntil);

    return item.reportedStale ? retryAt : Math.min(retryAt, item.queuedAt + STALE_AFTER_MS);
  });

  if (!wakeTimes.length) {
    return;
  }

  timer = setTimeout(
    () => {
      void flush(false);
    },
    Math.max(0, Math.min(...wakeTimes) - Date.now()),
  );
};

/**
 * Sends due runs one at a time. A forced pass ignores backoff and tries every
 * run once; either kind stops at the first failure to reach the API, since the
 * rest would only queue behind the same timeout.
 */
const flush = async (force: boolean) => {
  if (isFlushing) {
    isRetryRequested ||= force;

    return;
  }

  isFlushing = true;
  const attempted = new Set<string>();

  try {
    for (;;) {
      const now = Date.now();
      reportStaleItems(now);

      const next = getQueue().find((item) => {
        return (
          !attempted.has(item.payload.publicId) &&
          (force || (item.nextAttemptAt <= now && blockedUntil <= now))
        );
      });

      if (!next) {
        break;
      }

      attempted.add(next.payload.publicId);

      if (!(await send(next))) {
        break;
      }
    }
  } finally {
    isFlushing = false;

    if (isRetryRequested) {
      isRetryRequested = false;
      void flush(true);
    } else {
      scheduleNext();
    }
  }
};

const retryNow = () => {
  blockedUntil = 0;
  void flush(true);
};

/**
 * Keeps a finished run until the API has it. Written to storage before the
 * first send, so a reload, a crash or a dead venue link cannot lose it; the
 * backend answers a repeated publicId with the stored run, so resending is safe.
 */
export const queueCprSession = (payload: CreateCprSession) => {
  const queue = getOutbox();
  const now = Date.now();

  queue[payload.publicId] = {
    payload,
    queuedAt: now,
    attempts: 0,
    nextAttemptAt: now,
    reportedStale: false,
  };

  getQueue()
    .slice(MAX_ITEMS)
    .forEach((dropped) => {
      delete queue[dropped.payload.publicId];
      report("Kiosk outbox full, oldest unsaved run dropped", dropped);
    });

  persist();
  retryNow();
};

let isStarted = false;

/** Called once at boot: sends again whatever an earlier page load left behind. */
export const startCprSessionOutbox = () => {
  if (isStarted) {
    return;
  }

  isStarted = true;
  window.addEventListener("online", retryNow);
  retryNow();
};
