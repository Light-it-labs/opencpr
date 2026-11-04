import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ChartCard } from "@/components/charts/chart-card";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLocations } from "@/services/locations";
import { getDefaultDateRange, statsFiltersSchema, useStats } from "@/services/stats";
import { AverageScoreChart } from "./-components/dashboard/average-score-chart";
import { DashboardFilters } from "./-components/dashboard/dashboard-filters";
import { buildSessionSeries } from "./-components/dashboard/session-series";
import { SessionsByLocationChart } from "./-components/dashboard/sessions-by-location-chart";
import { SessionsOverTimeChart } from "./-components/dashboard/sessions-over-time-chart";
import { StatTiles } from "./-components/dashboard/stat-tiles";

const DashboardPage = () => {
  const { allTime, dateFrom, dateTo, locationId } = Route.useSearch();
  const navigate = Route.useNavigate();

  // No dates in the URL is the default range. All time sends no dates: the API starts the
  // range at the first session.
  const range = allTime || dateFrom || dateTo ? { dateFrom, dateTo } : getDefaultDateRange();
  const filters = { dateFrom: range.dateFrom, dateTo: range.dateTo, locationId };
  const parsedFilters = statsFiltersSchema.safeParse(filters);
  const rangeError = parsedFilters.success ? undefined : parsedFilters.error.issues[0]?.message;

  const { data: locations } = useAdminLocations();

  const { data, isError, isLoading, isPlaceholderData, refetch } = useStats(filters, {
    enabled: parsedFilters.success,
  });

  // Placeholder data belongs to the previous filters, so bucket it over its own days.
  const series = isPlaceholderData
    ? buildSessionSeries(data?.sessionsPerDay ?? [])
    : buildSessionSeries(data?.sessionsPerDay ?? [], filters.dateFrom, filters.dateTo);

  return (
    <LayoutWrapper>
      <Header.Root>
        <Breadcrumbs pages={[{ name: "Dashboard" }]} />

        <Header.Content>
          <Header.Title>Dashboard</Header.Title>
        </Header.Content>
      </Header.Root>

      <DashboardFilters
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
            <p>Could not load the dashboard.</p>

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
          <StatTiles isRefreshing={isPlaceholderData} stats={data} />

          {isLoading ? (
            <>
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </>
          ) : null}

          {data && data.totals.sessions === 0 ? (
            <Card.Root>
              <Card.Content className="text-center text-text-default-secondary">
                No sessions in this date range
              </Card.Content>
            </Card.Root>
          ) : null}

          {data && data.totals.sessions > 0 ? (
            <>
              <ChartCard
                description={`Completed compression sessions each ${series.bucket}`}
                isRefreshing={isPlaceholderData}
                title={`Sessions per ${series.bucket}`}
              >
                <SessionsOverTimeChart series={series} />
              </ChartCard>

              <ChartCard
                description={`Mean score of the sessions each ${series.bucket}`}
                isRefreshing={isPlaceholderData}
                title={`Average score per ${series.bucket}`}
              >
                <AverageScoreChart series={series} />
              </ChartCard>

              <ChartCard
                description="Sessions at each location in this range"
                isRefreshing={isPlaceholderData}
                title="Sessions by location"
              >
                <SessionsByLocationChart rows={data.perLocation} />
              </ChartCard>
            </>
          ) : null}
        </>
      ) : null}
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/")({
  component: DashboardPage,
  validateSearch: z.object({
    allTime: z.boolean().optional().catch(undefined),
    dateFrom: z.iso.date().optional().catch(undefined),
    dateTo: z.iso.date().optional().catch(undefined),
    locationId: z.string().optional(),
  }),
});
