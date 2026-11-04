import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLocations } from "@/services/locations";
import {
  getDefaultDateRange,
  performanceStatsFiltersSchema,
  usePerformanceStats,
} from "@/services/stats";
import { DepthDistributionChart } from "./-components/depth-distribution-chart";
import { FunnelCard } from "./-components/funnel-card";
import { HeadlineTiles } from "./-components/headline-tiles";
import { QualityMeters } from "./-components/quality-meters";
import { RateDistributionChart } from "./-components/rate-distribution-chart";
import { RetryEffectCard } from "./-components/retry-effect-card";
import { ScoreBandsCard } from "./-components/score-bands-card";
import { SessionsByHourChart } from "./-components/sessions-by-hour-chart";
import { StatisticsFilters } from "./-components/statistics-filters";
import { TopSessionsTable } from "./-components/top-sessions-table";

const StatisticsPage = () => {
  const { allTime, dateFrom, dateTo, locationId } = Route.useSearch();
  const navigate = Route.useNavigate();

  // No dates in the URL is the default range. All time sends no dates: the API starts the
  // range at the first session.
  const range = allTime || dateFrom || dateTo ? { dateFrom, dateTo } : getDefaultDateRange();
  const filters = { dateFrom: range.dateFrom, dateTo: range.dateTo, locationId };
  const parsedFilters = performanceStatsFiltersSchema.safeParse(filters);
  const rangeError = parsedFilters.success ? undefined : parsedFilters.error.issues[0]?.message;
  const hasFilters = Boolean(allTime || dateFrom || dateTo || locationId);

  const { data: locations } = useAdminLocations();

  const { data, isError, isLoading, isPlaceholderData, refetch } = usePerformanceStats(filters, {
    enabled: parsedFilters.success,
  });

  return (
    <LayoutWrapper>
      <Header.Root>
        <Breadcrumbs pages={[{ name: "Statistics" }]} />

        <Header.Content>
          <Header.Title>Statistics</Header.Title>
        </Header.Content>
      </Header.Root>

      <StatisticsFilters
        hasFilters={hasFilters}
        locations={locations ?? []}
        value={filters}
        onChange={(changes) => {
          return navigate({
            search: (previous) => {
              return { ...previous, ...changes };
            },
          });
        }}
      />

      {rangeError ? (
        <Card.Root>
          <Card.Content>{rangeError}</Card.Content>
        </Card.Root>
      ) : null}

      {!rangeError && isError ? (
        <Card.Root>
          <Card.Content className="flex items-center justify-between gap-4">
            <p>Could not load the statistics.</p>

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

      {!rangeError && !isError ? (
        <>
          <HeadlineTiles isRefreshing={isPlaceholderData} stats={data} />

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : null}

          {data && data.totals.sessions === 0 ? (
            <Card.Root>
              <Card.Content className="text-center text-text-default-secondary">
                No sessions in this range
              </Card.Content>
            </Card.Root>
          ) : null}

          {data && data.totals.sessions > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <RetryEffectCard isRefreshing={isPlaceholderData} retry={data.retry} />

              <FunnelCard funnel={data.funnel} isRefreshing={isPlaceholderData} />

              <DepthDistributionChart depth={data.depth} isRefreshing={isPlaceholderData} />

              <RateDistributionChart isRefreshing={isPlaceholderData} rate={data.rate} />

              <ScoreBandsCard isRefreshing={isPlaceholderData} scoreBands={data.scoreBands} />

              <QualityMeters isRefreshing={isPlaceholderData} quality={data.quality} />

              <SessionsByHourChart
                byHour={data.byHour}
                className="md:col-span-2"
                isRefreshing={isPlaceholderData}
              />

              <TopSessionsTable
                className="md:col-span-2"
                isRefreshing={isPlaceholderData}
                sessions={data.topSessions}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/statistics/")({
  component: StatisticsPage,
  validateSearch: z.object({
    allTime: z.boolean().optional().catch(undefined),
    dateFrom: z.iso.date().optional().catch(undefined),
    dateTo: z.iso.date().optional().catch(undefined),
    locationId: z.string().optional().catch(undefined),
  }),
});
