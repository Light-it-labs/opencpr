import { useTranslation } from "react-i18next";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { IdleWarning } from "@/components/idle-warning";
import { Logo } from "@/components/logo";
import {
  Button,
  CompressionsIcon,
  DepthIcon,
  Icons,
  RankingCupIcon,
  RateIcon,
  ReboundsIcon,
} from "@/components/ui";
import { useIdleReset } from "@/hooks";
import { setCprSession, startNewAttempt, useCprSession, usePreviousScore } from "@/stores";
import {
  ACCEPTABLE_RATIO,
  CPR_TARGETS,
  getImprovementTips,
  getResultsSummary,
  MAX_SCORE,
  RESULTS_TONES,
  type ResultsTone,
  scoreSession,
} from "@/utils";
import { Confetti, type Metric, MetricCard } from "./-components";

/** Tint behind the verdict, and the ink the score and verdict are set in. */
const TONE_STYLES: Record<ResultsTone, { band: string; ink: string; fill: string }> = {
  [RESULTS_TONES.HIGH]: {
    band: "bg-results-tint-high",
    ink: "text-results-high",
    fill: "bg-results-high",
  },
  [RESULTS_TONES.MID]: {
    band: "bg-results-tint-mid",
    ink: "text-results-mid",
    fill: "bg-results-mid",
  },
  [RESULTS_TONES.LOW]: {
    band: "bg-results-tint-low",
    ink: "text-results-low",
    fill: "bg-results-low",
  },
};

/** Range bars need a floor and a ceiling; these are the ends of each axis. */
const DEPTH_AXIS_MAX_MM = 80;
const RATE_AXIS_MAX_BPM = 180;

const RouteComponent = () => {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  const cprSession = useCprSession();
  const previousScore = usePreviousScore();

  const score = scoreSession(cprSession?.compressions ?? []);
  const tips = getImprovementTips(score);

  // Each tip is shown inside the card for the number that earned it, so the
  // screen never states the same correction twice.
  const tipByMetric = new Map(
    tips.map((tip) => {
      return [tip.metric, tip] as const;
    }),
  );

  const summary = getResultsSummary(score);
  const tone = TONE_STYLES[summary?.tone ?? RESULTS_TONES.LOW];

  // Exact at one decimal: the score is a whole number out of MAX_SCORE.
  const displayedScore = score.score / (MAX_SCORE / 100);

  const scoreFormatter = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });

  const formatCentimeters = (millimeters: number) => {
    return (millimeters / 10).toFixed(1);
  };

  const depthTarget = t("challenge.results.metrics.depthRange", {
    max: CPR_TARGETS.depthMaxMm / 10,
    min: CPR_TARGETS.depthMinMm / 10,
  });
  const rateTarget = t("challenge.results.metrics.rateRange", {
    max: CPR_TARGETS.bpmMax,
    min: CPR_TARGETS.bpmMin,
  });

  const averageDepthMm = score.averageCompressionEndDepthMm || 0;
  const averageBpm = score.averageBpm || 0;

  // Without this an empty session reports 0 of 0 as a target met.
  const hasCompressions = score.totalCompressions > 0;

  const isCountOnTarget = (count: number) => {
    return hasCompressions && count / score.totalCompressions >= ACCEPTABLE_RATIO;
  };

  const countRatio = (count: number) => {
    return hasCompressions ? count / score.totalCompressions : 0;
  };

  const buildMetric = (metric: Omit<Metric, "tip">): Metric => {
    const tip = tipByMetric.get(metric.key);

    return tip ? { ...metric, tip } : metric;
  };

  /**
   * Fixed order, every run: the two counts and then the two averages. A booth
   * repeats — somebody replaying should find the same number in the same place
   * rather than hunting for the card that moved.
   */
  const metrics: Metric[] = [
    buildMetric({
      key: "fullCompressions",
      icon: CompressionsIcon,
      value: score.totalFullCompressions,
      unit: t("challenge.results.metrics.outOf", { total: score.totalCompressions }),
      target: t("challenge.results.metrics.countTarget", { total: score.totalCompressions }),
      isOnTarget: isCountOnTarget(score.totalFullCompressions),
      progress: countRatio(score.totalFullCompressions),
    }),
    buildMetric({
      key: "fullRebounds",
      icon: ReboundsIcon,
      value: score.totalFullRebounds,
      unit: t("challenge.results.metrics.outOf", { total: score.totalCompressions }),
      target: t("challenge.results.metrics.countTarget", { total: score.totalCompressions }),
      isOnTarget: isCountOnTarget(score.totalFullRebounds),
      progress: countRatio(score.totalFullRebounds),
    }),
    buildMetric({
      key: "averageDepth",
      icon: DepthIcon,
      value: formatCentimeters(averageDepthMm),
      unit: t("challenge.results.metrics.centimeters"),
      target: depthTarget,
      isOnTarget:
        averageDepthMm >= CPR_TARGETS.depthMinMm && averageDepthMm <= CPR_TARGETS.depthMaxMm,
      progress: averageDepthMm / DEPTH_AXIS_MAX_MM,
      band: {
        from: CPR_TARGETS.depthMinMm / DEPTH_AXIS_MAX_MM,
        to: CPR_TARGETS.depthMaxMm / DEPTH_AXIS_MAX_MM,
      },
    }),
    buildMetric({
      key: "averageBpm",
      icon: RateIcon,
      value: averageBpm.toFixed(0),
      unit: t("challenge.results.metrics.perMinute"),
      target: rateTarget,
      isOnTarget: averageBpm >= CPR_TARGETS.bpmMin && averageBpm <= CPR_TARGETS.bpmMax,
      progress: averageBpm / RATE_AXIS_MAX_BPM,
      band: {
        from: CPR_TARGETS.bpmMin / RATE_AXIS_MAX_BPM,
        to: CPR_TARGETS.bpmMax / RATE_AXIS_MAX_BPM,
      },
    }),
  ];

  const targetsMet = metrics.filter((metric) => {
    return metric.isOnTarget;
  }).length;

  // Longer than the other screens because reading is the whole point of this
  // one: everything is on the card now, and reading produces no pointer or key
  // events to postpone the reset with.
  const idleSecondsLeft = useIdleReset({
    onIdle: () => {
      setCprSession(null);
      navigate({ to: "/" });
    },
    timeoutMs: 180_000,
    warningMs: 15_000,
  });

  const VerdictIcon = summary?.tone === RESULTS_TONES.HIGH ? Icons.Check : Icons.Lightbulb;

  return (
    <div className="relative flex h-dvh w-screen flex-col justify-center gap-16 overflow-hidden bg-results-page p-8">
      <IdleWarning secondsLeft={idleSecondsLeft} />

      {/* Reserved for the top band: paper falling over a run that fell short
          would read as mockery rather than celebration. */}
      {summary?.tone === RESULTS_TONES.HIGH ? <Confetti /> : null}

      <div className="results-rise self-center">
        <Logo />
      </div>

      <div className={`flex results-rise flex-col gap-6 rounded-2xl p-8 ${tone.band}`}>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center gap-12">
          {/* Score, left: the number the whole screen is about. */}
          <div className="flex flex-col gap-3">
            <span className="text-base tracking-widest text-results-ink/65 uppercase">
              {t("challenge.results.score")}
            </span>

            <p
              className={`flex results-pop items-baseline ${tone.ink}`}
              style={{ animationDelay: "300ms" }}
            >
              <span className="font-heading text-8xl leading-none font-bold">
                {scoreFormatter.format(displayedScore)}
              </span>
              <span className="text-3xl text-results-ink/65">
                {t("challenge.results.percentSign")}
              </span>
            </p>

            <div className="h-3 w-full overflow-hidden rounded-full bg-results-ink/10">
              <span
                className={`block h-full results-bar rounded-full ${tone.fill}`}
                style={{
                  width: `${Math.min(100, Math.max(0, displayedScore))}%`,
                  animationDelay: "520ms",
                }}
              />
            </div>

            {/* Only on a replay, and directly under the number it is measured
                against: on a first go there is nothing to compare with. */}
            {previousScore === null ? null : (
              <span
                className="results-rise text-base text-results-ink/65"
                style={{ animationDelay: "820ms" }}
              >
                {t("challenge.results.previousScore", {
                  score: scoreFormatter.format(previousScore / (MAX_SCORE / 100)),
                })}
              </span>
            )}
          </div>

          {/* Verdict, right, divided from the score rather than boxed. */}
          <div className="flex flex-col gap-4 border-l border-results-ink/10 pl-12">
            <div className="flex results-rise items-center gap-4">
              <VerdictIcon className={`size-10 shrink-0 ${tone.ink}`} aria-hidden />

              <h1 className="font-heading text-4xl leading-none font-bold text-results-ink uppercase">
                {t(`challenge.results.verdicts.${summary?.tone ?? RESULTS_TONES.LOW}`)}
              </h1>
            </div>

            <span
              className="w-fit results-pop rounded-full bg-results-surface px-5 py-2 text-base font-semibold text-results-ink"
              style={{ animationDelay: "640ms" }}
            >
              {t("challenge.results.summary.targetsMet", {
                met: targetsMet,
                total: metrics.length,
              })}
            </span>

            {summary ? (
              <p
                className="results-rise text-xl text-results-ink/70"
                style={{ animationDelay: "700ms" }}
              >
                {t(`challenge.results.summary.${summary.id}`, {
                  total: score.totalCompressions,
                })}
              </p>
            ) : null}

            {/* Only with a place to report: these are the numbers on this screen
                  the kiosk cannot work out from the run by itself. The placement
                  leads and the percentile qualifies it, since the field is still
                  filling up all day. */}
            {(cprSession?.position ?? cprSession?.percentile) ? (
              <div
                className="flex results-rise items-center gap-3 rounded-2xl bg-results-surface/70 px-4 py-3"
                style={{ animationDelay: "1000ms" }}
              >
                <RankingCupIcon className={`size-8 shrink-0 ${tone.ink}`} />

                <div className="flex flex-col">
                  {cprSession?.position ? (
                    <span className="text-2xl font-bold text-results-ink">
                      {cprSession.participantsToday
                        ? t("challenge.results.ranking.place", {
                            count: cprSession.participantsToday,
                            position: cprSession.position,
                          })
                        : t("challenge.results.ranking.placeOnly", {
                            position: cprSession.position,
                          })}
                    </span>
                  ) : null}

                  {cprSession?.percentile ? (
                    <span className="text-sm text-results-ink/65">
                      {t("challenge.results.ranking.percentile", {
                        percentile: cprSession.percentile,
                      })}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 items-stretch gap-4">
        {metrics.map((metric, index) => {
          return <MetricCard index={index} key={metric.key} metric={metric} />;
        })}
      </div>

      <div
        className="flex results-rise items-center justify-center gap-6"
        style={{ animationDelay: "1150ms" }}
      >
        <Button
          className="rounded-full border border-results-ink/10 bg-results-surface text-results-ink hover:bg-results-surface"
          onClick={() => {
            // A replay is its own run, so it needs its own publicId, which
            // the backend holds unique. The registration is deliberately kept:
            // the second attempt belongs to the same person and lands on their
            // email, so nobody is asked to scan again.
            startNewAttempt(score.score);
            setCprSession(null);
            navigate({ to: "/challenge/instructions" });
          }}
          size="xl"
          variant="ghost"
        >
          {t("challenge.results.repeat")}
        </Button>

        <Button className="rounded-full" size="2xl" variant="destructive" asChild>
          <Link to="/">{t("challenge.results.finish")}</Link>
        </Button>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/(public)/challenge/results/")({
  component: RouteComponent,
});
