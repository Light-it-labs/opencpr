import { TZDate } from "@date-fns/tz";

import { CPR_GUIDELINE, MAX_SCORE } from "@/utils";

/**
 * Pure aggregation for `GET /admin/stats/performance`: the figures of the
 * post-event report computed in memory over a lightweight session projection.
 * No database access here so the rules stay unit-testable.
 */

export type PerformanceSession = {
  id: number;
  participantId: string | null;
  registrationId: string | null;
  locationId: string;
  createdAt: Date;
  score: number;
  averageCompressionEndDepthMm: number;
  averageBpm: number;
  totalCompressions: number;
  totalFullCompressions: number;
  totalFullRebounds: number;
  compressionsOnBpmRange: number;
  /** Stored at insert; null for runs without it, which count as no hands-on time. */
  durationMs: number | null;
  location: { name: string; timezone: string };
};

export type ParticipantName = {
  id: string;
  firstName: string;
  lastName: string | null;
};

export type PerformanceRange = {
  dateFrom?: Date;
  dateTo?: Date;
  locationId?: string;
};

type Bucket = { label: string; sessions: number };

export type PerformanceStats = {
  range: {
    dateFrom: string | null;
    dateTo: string | null;
    locationId: string | null;
  };
  totals: {
    sessions: number;
    participants: number;
    registrations: number;
    compressions: number;
    handsOnSeconds: number;
    averageScore: number | null;
    repeaters: number;
  };
  retry: {
    repeaters: number;
    improved: number;
    slipped: number;
    level: number;
    firstAttemptAverage: number | null;
    lastAttemptAverage: number | null;
    byAttempt: {
      attempt: 1 | 2 | 3 | 4;
      sessions: number;
      averageScore: number | null;
    }[];
  };
  funnel: {
    registrations: number;
    claimedSessions: number;
    unclaimedSessions: number;
    participants: number;
    claimedAverageScore: number | null;
    unclaimedAverageScore: number | null;
    claimedAverageDepthMm: number | null;
    unclaimedAverageDepthMm: number | null;
  };
  depth: { buckets: Bucket[]; inRangeShare: number | null };
  rate: { buckets: Bucket[]; inRangeShare: number | null };
  scoreBands: { high: number; medium: number; low: number };
  quality: {
    fullDepthShare: number | null;
    fullRecoilShare: number | null;
    onRateShare: number | null;
  };
  byHour: { hour: number; sessions: number; averageScore: number | null }[];
  topSessions: {
    sessionId: number;
    participantName: string;
    score: number;
    createdAt: string;
    locationName: string;
  }[];
};

const ATTEMPTS = [1, 2, 3, 4] as const;
/** The last `byAttempt` row gathers this attempt and every later one. */
const LAST_ATTEMPT_BUCKET = 4;
const TOP_SESSIONS = 10;
const HOURS_PER_DAY = 24;
/** Below this average depth a run barely dented the chest; the report's own cut. */
const SHALLOW_DEPTH_MM = 40;

const SCORE_BANDS = {
  high: 0.8 * MAX_SCORE,
  medium: 0.5 * MAX_SCORE,
} as const;

const { bpmMax, bpmMin, depthMaxMm, depthMinMm, minValidBpm } = CPR_GUIDELINE;

// An en dash between the bounds, as the report prints them.
const DEPTH_BUCKETS = {
  shallow: `< ${SHALLOW_DEPTH_MM}`,
  short: `${SHALLOW_DEPTH_MM}–${depthMinMm - 1}`,
  inRange: `${depthMinMm}–${depthMaxMm}`,
  deep: `> ${depthMaxMm}`,
} as const;

const RATE_BUCKETS = {
  slow: `< ${bpmMin}`,
  inRange: `${bpmMin}–${bpmMax}`,
  fast: `> ${bpmMax}`,
} as const;

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
};

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

/** Two decimals, or null when there is nothing to average. */
const average = (values: number[]) =>
  values.length ? round(sum(values) / values.length, 2) : null;

/** A 0–1 share with four decimals, or null when the denominator is 0. */
const share = (numerator: number, denominator: number) =>
  denominator ? round(numerator / denominator, 4) : null;

const averageScore = (sessions: PerformanceSession[]) =>
  average(sessions.map((session) => session.score));

const countDistinct = (values: (string | null)[]) =>
  new Set(values.filter((value) => value !== null)).size;

const byCreation = (a: PerformanceSession, b: PerformanceSession) =>
  a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;

/**
 * One person's runs in order. Grouped by participant, else by registration;
 * a run with neither is nobody's second attempt, so it forms its own group.
 */
const groupAttempts = (sessions: PerformanceSession[]) => {
  const groups = new Map<string, PerformanceSession[]>();

  [...sessions].sort(byCreation).forEach((session) => {
    const key = session.participantId
      ? `participant:${session.participantId}`
      : session.registrationId
        ? `registration:${session.registrationId}`
        : `session:${session.id}`;

    groups.set(key, [...(groups.get(key) ?? []), session]);
  });

  return [...groups.values()];
};

const first = (attempts: PerformanceSession[]) => attempts[0]!;
const last = (attempts: PerformanceSession[]) => attempts[attempts.length - 1]!;

/**
 * Each linked participant's best run, best first. Unclaimed and anonymous runs
 * are left out: a personal best needs a person. Exported because the caller
 * needs these ids to look up names before aggregating.
 */
export const pickTopSessions = (sessions: PerformanceSession[]) =>
  groupAttempts(sessions.filter((session) => session.participantId !== null))
    .map((attempts) =>
      attempts.reduce((best, session) =>
        session.score > best.score ? session : best,
      ),
    )
    .sort((a, b) => b.score - a.score || byCreation(a, b))
    .slice(0, TOP_SESSIONS);

const depthBucket = (session: PerformanceSession) => {
  const depth = session.averageCompressionEndDepthMm;

  if (depth < SHALLOW_DEPTH_MM) return DEPTH_BUCKETS.shallow;
  if (depth < depthMinMm) return DEPTH_BUCKETS.short;
  if (depth <= depthMaxMm) return DEPTH_BUCKETS.inRange;

  return DEPTH_BUCKETS.deep;
};

const rateBucket = (session: PerformanceSession) => {
  const bpm = session.averageBpm;

  if (bpm < bpmMin) return RATE_BUCKETS.slow;
  if (bpm <= bpmMax) return RATE_BUCKETS.inRange;

  return RATE_BUCKETS.fast;
};

const countBuckets = (
  labels: readonly string[],
  sessions: PerformanceSession[],
  bucketOf: (session: PerformanceSession) => string,
): Bucket[] => {
  const counts = new Map(labels.map((label) => [label, 0]));

  sessions.forEach((session) => {
    const label = bucketOf(session);

    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return labels.map((label) => ({ label, sessions: counts.get(label) ?? 0 }));
};

const scoreBand = (score: number) =>
  score >= SCORE_BANDS.high
    ? "high"
    : score >= SCORE_BANDS.medium
      ? "medium"
      : "low";

const displayName = ({ firstName, lastName }: ParticipantName) =>
  `${firstName} ${lastName ?? ""}`.trim();

export const aggregatePerformance = ({
  participantNames,
  range,
  sessions,
}: {
  sessions: PerformanceSession[];
  participantNames: ParticipantName[];
  range: PerformanceRange;
}): PerformanceStats => {
  const attemptGroups = groupAttempts(sessions);
  const repeaters = attemptGroups.filter((attempts) => attempts.length >= 2);
  const participants = countDistinct(
    sessions.map((session) => session.participantId),
  );
  const registrations = countDistinct(
    sessions.map((session) => session.registrationId),
  );

  const claimed = sessions.filter((session) => session.participantId !== null);
  const unclaimed = sessions.filter(
    (session) => session.participantId === null,
  );
  const averageDepth = (group: PerformanceSession[]) =>
    average(group.map((session) => session.averageCompressionEndDepthMm));

  // Runs whose rate is a pause or noise say nothing about rhythm.
  const rated = sessions.filter((session) => session.averageBpm > minValidBpm);
  const depthBuckets = countBuckets(
    Object.values(DEPTH_BUCKETS),
    sessions,
    depthBucket,
  );
  const rateBuckets = countBuckets(
    Object.values(RATE_BUCKETS),
    rated,
    rateBucket,
  );
  const inBucket = (buckets: Bucket[], label: string) =>
    buckets.find((bucket) => bucket.label === label)?.sessions ?? 0;

  const bands = { high: 0, medium: 0, low: 0 };
  sessions.forEach((session) => {
    bands[scoreBand(session.score)] += 1;
  });

  const totalCompressions = sum(
    sessions.map((session) => session.totalCompressions),
  );
  const compressionShare = (key: keyof PerformanceSession) =>
    share(
      sum(sessions.map((session) => Number(session[key]))),
      totalCompressions,
    );

  const hours = Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
    hour,
    sessions: [] as PerformanceSession[],
  }));
  sessions.forEach((session) => {
    const hour = new TZDate(
      session.createdAt,
      session.location.timezone,
    ).getHours();

    hours[hour]?.sessions.push(session);
  });

  const names = new Map(
    participantNames.map((participant) => [
      participant.id,
      displayName(participant),
    ]),
  );
  const handsOnMs = sum(sessions.map((session) => session.durationMs ?? 0));

  return {
    range: {
      dateFrom: range.dateFrom?.toISOString() ?? null,
      dateTo: range.dateTo?.toISOString() ?? null,
      locationId: range.locationId ?? null,
    },
    totals: {
      sessions: sessions.length,
      participants,
      registrations,
      compressions: totalCompressions,
      handsOnSeconds: round(handsOnMs / 1000, 2),
      averageScore: averageScore(sessions),
      repeaters: repeaters.length,
    },
    retry: {
      repeaters: repeaters.length,
      improved: repeaters.filter((a) => last(a).score > first(a).score).length,
      slipped: repeaters.filter((a) => last(a).score < first(a).score).length,
      level: repeaters.filter((a) => last(a).score === first(a).score).length,
      firstAttemptAverage: averageScore(repeaters.map(first)),
      lastAttemptAverage: averageScore(repeaters.map(last)),
      byAttempt: ATTEMPTS.map((attempt) => {
        const runs = attemptGroups.flatMap((attempts) =>
          attempt === LAST_ATTEMPT_BUCKET
            ? attempts.slice(attempt - 1)
            : attempts.slice(attempt - 1, attempt),
        );

        return {
          attempt,
          sessions: runs.length,
          averageScore: averageScore(runs),
        };
      }),
    },
    funnel: {
      registrations,
      claimedSessions: claimed.length,
      unclaimedSessions: unclaimed.length,
      participants,
      claimedAverageScore: averageScore(claimed),
      unclaimedAverageScore: averageScore(unclaimed),
      claimedAverageDepthMm: averageDepth(claimed),
      unclaimedAverageDepthMm: averageDepth(unclaimed),
    },
    depth: {
      buckets: depthBuckets,
      inRangeShare: share(
        inBucket(depthBuckets, DEPTH_BUCKETS.inRange),
        sessions.length,
      ),
    },
    rate: {
      buckets: rateBuckets,
      inRangeShare: share(
        inBucket(rateBuckets, RATE_BUCKETS.inRange),
        rated.length,
      ),
    },
    scoreBands: bands,
    quality: {
      fullDepthShare: compressionShare("totalFullCompressions"),
      fullRecoilShare: compressionShare("totalFullRebounds"),
      onRateShare: compressionShare("compressionsOnBpmRange"),
    },
    byHour: hours.map(({ hour, sessions: runs }) => ({
      hour,
      sessions: runs.length,
      averageScore: averageScore(runs),
    })),
    topSessions: pickTopSessions(sessions).map((session) => ({
      sessionId: session.id,
      participantName: names.get(session.participantId ?? "") ?? "",
      score: session.score,
      createdAt: session.createdAt.toISOString(),
      locationName: session.location.name,
    })),
  };
};
