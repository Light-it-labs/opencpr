import { createFileRoute, Link } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { format, parseISO } from "date-fns";
import { z } from "zod";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_BAND_BADGE_VARIANT } from "@/constants/score-band";
import { type SessionDetail, useSession } from "@/services/sessions";
import { formatMetric } from "@/utils/format-metric";
import { getFullName } from "@/utils/full-name";
import { formatScore } from "@/utils/score";
import { getScoreBand } from "@/utils/score-band";
import { CompressionsChart } from "./-components/compressions-chart";

const NOT_FOUND_STATUS = 404;

type SessionMetric = {
  label: string;
  getValue: (session: SessionDetail) => string;
};

const METRICS: SessionMetric[] = [
  {
    label: "Total compressions",
    getValue: (session) => {
      return String(session.totalCompressions);
    },
  },
  {
    label: "Full compressions",
    getValue: (session) => {
      return formatMetric(session.totalFullCompressions);
    },
  },
  {
    label: "Full rebounds",
    getValue: (session) => {
      return formatMetric(session.totalFullRebounds);
    },
  },
  {
    label: "Avg depth",
    getValue: (session) => {
      return session.averageCompressionEndDepthMm === null
        ? "—"
        : `${session.averageCompressionEndDepthMm.toFixed(1)} mm`;
    },
  },
  {
    label: "On-BPM compressions",
    getValue: (session) => {
      return formatMetric(session.compressionsOnBpmRange);
    },
  },
  {
    label: "Avg BPM",
    getValue: (session) => {
      return session.averageBpm === null ? "—" : String(Math.round(session.averageBpm));
    },
  },
  {
    label: "Kiosk",
    getValue: (session) => {
      return session.kioskId ?? "—";
    },
  },
  {
    label: "Build",
    getValue: (session) => {
      return session.buildId ?? "—";
    },
  },
];

const SessionDetailPage = () => {
  const { sessionId } = Route.useParams();

  const {
    data: session,
    error,
    isError,
    isLoading,
    refetch,
  } = useSession(sessionId, { enabled: Boolean(sessionId) });

  const isNotFound =
    !sessionId || (isAxiosError(error) && error.response?.status === NOT_FOUND_STATUS);

  const breadcrumbs = [{ name: "Sessions", href: "/sessions" as const }, { name: `#${sessionId}` }];

  if (isNotFound) {
    return (
      <LayoutWrapper>
        <Header.Root>
          <Breadcrumbs pages={breadcrumbs} />

          <Header.Content>
            <Header.Title>Session not found</Header.Title>
          </Header.Content>
        </Header.Root>

        <Card.Root>
          <Card.Content className="flex items-center justify-between gap-4">
            <p>This session does not exist or was removed.</p>

            <Button variant="outlined" asChild>
              <Link search={{ page: 1 }} to="/sessions">
                Back to sessions
              </Link>
            </Button>
          </Card.Content>
        </Card.Root>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <Header.Root>
        <Breadcrumbs pages={breadcrumbs} />

        <Header.Content>
          <div className="flex flex-col gap-1">
            <Header.Title>Session #{sessionId}</Header.Title>

            {session ? (
              <p className="text-sm text-text-default-secondary">
                {format(parseISO(session.createdAt), "PPpp")} ·{" "}
                {session.location?.name ?? "Unknown location"} ·{" "}
                {session.participant
                  ? `${getFullName(session.participant)} (${session.participant.email})`
                  : "Anonymous"}
              </p>
            ) : null}
          </div>

          {session ? (
            <Badge size="lg" variant={SCORE_BAND_BADGE_VARIANT[getScoreBand(session.score)]}>
              Score {formatScore(session.score)}
            </Badge>
          ) : null}
        </Header.Content>
      </Header.Root>

      {isError ? (
        <Card.Root>
          <Card.Content className="flex items-center justify-between gap-4">
            <p>Could not load this session.</p>

            <Button
              variant="outlined"
              onClick={() => {
                return refetch();
              }}
            >
              Retry
            </Button>
          </Card.Content>
        </Card.Root>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map((metric) => {
            return <Skeleton key={metric.label} className="h-24" />;
          })}
        </div>
      ) : null}

      {session ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {METRICS.map((metric) => {
              return (
                <Card.Root key={metric.label}>
                  <Card.Header>
                    <Card.Description>{metric.label}</Card.Description>
                    <Card.Title className="text-2xl">{metric.getValue(session)}</Card.Title>
                  </Card.Header>
                </Card.Root>
              );
            })}
          </div>

          <Card.Root>
            <Card.Header>
              <Card.Title>Compressions</Card.Title>
              <Card.Description>Depth reached at the end of each compression</Card.Description>
            </Card.Header>

            <Card.Content>
              {session.compressions.length > 0 ? (
                <CompressionsChart compressions={session.compressions} />
              ) : (
                <p className="text-sm text-text-default-secondary">
                  No compressions were recorded for this session.
                </p>
              )}
            </Card.Content>
          </Card.Root>
        </>
      ) : null}
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/sessions/$sessionId/")({
  component: SessionDetailPage,
  params: {
    parse: (params) => {
      return { sessionId: z.coerce.number().int().positive().catch(0).parse(params.sessionId) };
    },
    stringify: (params) => {
      return { sessionId: String(params.sessionId) };
    },
  },
});
