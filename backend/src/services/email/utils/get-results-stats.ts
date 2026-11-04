import { CprSession } from "@/schemas";
import { MAX_SCORE } from "@/utils";

import { ResultsImageTemplateVars } from "./render-template";

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 22nd, 23rd. */
const ordinal = (n: number): string => {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${n}th`;
  }
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
};

type GetResultsStatsParams = {
  session: CprSession;
  position: number;
};

export const getResultsStats = ({
  position,
  session,
}: GetResultsStatsParams): Omit<
  ResultsImageTemplateVars,
  "subject" | "intro" | "logoSrc"
> => ({
  position: ordinal(position),
  // The kiosk shows a percentage, so the card a participant takes home cannot
  // show the raw points and claim to be the same number.
  score: (session.score / (MAX_SCORE / 100)).toFixed(1),

  totalCompressions: session.totalCompressions,
  fullCompressions: session.totalFullCompressions,
  fullRebounds: session.totalFullRebounds,

  averageBpm: (Math.round(session.averageBpm * 10) / 10).toFixed(1),
  compressionsOnBpmRange: session.compressionsOnBpmRange,

  averageDepth: (Math.round(session.averageCompressionEndDepthMm) / 10).toFixed(
    1,
  ),
});
