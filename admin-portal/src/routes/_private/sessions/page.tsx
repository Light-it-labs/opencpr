import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { paginationValidationWithDefaults, usePagination } from "@/hooks/use-pagination";
import { searchTextValidation } from "@/hooks/use-search";
import { sortValidation, useSort } from "@/hooks/use-sort";
import { useAdminLocations } from "@/services/locations";
import { SESSIONS_DEFAULT_SORT, useSessions } from "@/services/sessions";
import { SessionsFilters } from "./-components/sessions-filters";
import { useSessionsTable } from "./-hooks/use-sessions-table";

const SessionsPage = () => {
  const { dateFrom, dateTo, locationId, searchText } = Route.useSearch();
  const navigate = Route.useNavigate();

  const {
    actions: { onPaginationChange },
    page,
    pagination,
  } = usePagination("/_private/sessions/");

  const {
    actions: { onSortingChange },
    sort,
    tableSorting,
    urlSort,
  } = useSort({ defaultSort: SESSIONS_DEFAULT_SORT, path: "/_private/sessions/" });

  const { data: locations } = useAdminLocations();

  const { data, isError, isLoading, refetch } = useSessions({
    page,
    dateFrom,
    dateTo,
    locationId,
    search: searchText,
    sort,
  });

  const table = useSessionsTable({
    data: data?.data ?? [],
    meta: { totalItems: data?.pagination.total ?? 0 },
    pageCount: data?.pagination.totalPages ?? 0,
    state: { pagination, sorting: tableSorting },
    onPaginationChange,
    onSortingChange,
  });

  const hasActiveFilters = Boolean(dateFrom || dateTo || locationId || searchText);

  return (
    <LayoutWrapper>
      <Header.Root>
        <Breadcrumbs pages={[{ name: "Sessions" }]} />

        <Header.Content>
          <Header.Title>Sessions</Header.Title>
        </Header.Content>
      </Header.Root>

      <SessionsFilters
        hasFilters={hasActiveFilters}
        locations={locations ?? []}
        value={{ dateFrom, dateTo, locationId, searchText, sort: urlSort }}
        onChange={(changes) => {
          return navigate({
            search: (previous) => {
              return { ...previous, ...changes, page: 1 };
            },
          });
        }}
      />

      {isError ? (
        <Card.Root>
          <Card.Content className="flex items-center justify-between gap-4">
            <p>Could not load sessions.</p>

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
      ) : (
        <DataTable
          emptyMessage="No sessions yet"
          hasActiveFilters={hasActiveFilters}
          isLoading={isLoading}
          table={table}
        />
      )}
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/sessions/")({
  component: SessionsPage,
  validateSearch: paginationValidationWithDefaults.extend({
    ...searchTextValidation.shape,
    ...sortValidation.shape,
    dateFrom: z.iso.date().optional().catch(undefined),
    dateTo: z.iso.date().optional().catch(undefined),
    locationId: z.string().optional(),
  }),
});
