import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Icons } from "@/components/ui/icons";
import { paginationValidationWithDefaults, usePagination } from "@/hooks/use-pagination";
import { searchTextValidation, useSearchText } from "@/hooks/use-search";
import { sortValidation, useSort } from "@/hooks/use-sort";
import { useCanManage } from "@/services/auth";
import { useAdminLocations } from "@/services/locations";
import {
  type Participant,
  PARTICIPANTS_DEFAULT_SORT,
  useParticipants,
} from "@/services/participants";
import { DeleteParticipantDialog } from "./-components/delete-participant-dialog";
import { ExportParticipantsDialog } from "./-components/export-participants-dialog";
import { ParticipantsFilters } from "./-components/participants-filters";
import { useParticipantsTable } from "./-hooks/use-participants-table";

const ParticipantsPage = () => {
  const [deletingParticipant, setDeletingParticipant] = useState<Participant>();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { locationId } = Route.useSearch();
  const navigate = Route.useNavigate();

  const {
    actions: { onPaginationChange },
    page,
    pagination,
  } = usePagination("/_private/participants/");

  const { searchText } = useSearchText("/_private/participants/");

  const {
    actions: { onSortingChange },
    sort,
    tableSorting,
  } = useSort({ defaultSort: PARTICIPANTS_DEFAULT_SORT, path: "/_private/participants/" });

  const canManage = useCanManage();
  const { data: locations } = useAdminLocations();
  const { data, isError, isLoading, refetch } = useParticipants({
    page,
    locationId,
    search: searchText,
    sort,
  });

  const table = useParticipantsTable({
    canManage,
    data: data?.data ?? [],
    meta: { totalItems: data?.pagination.total ?? 0 },
    pageCount: data?.pagination.totalPages ?? 0,
    state: { pagination, sorting: tableSorting },
    onDelete: setDeletingParticipant,
    onPaginationChange,
    onSortingChange,
  });

  return (
    <LayoutWrapper>
      <DeleteParticipantDialog
        participant={deletingParticipant}
        onClose={() => {
          return setDeletingParticipant(undefined);
        }}
      />

      <ExportParticipantsDialog
        open={isExportOpen}
        onClose={() => {
          return setIsExportOpen(false);
        }}
      />

      <Header.Root>
        <Breadcrumbs pages={[{ name: "Participants" }]} />

        <Header.Content>
          <Header.Title>Participants</Header.Title>
        </Header.Content>
      </Header.Root>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ParticipantsFilters
          locationId={locationId}
          locations={locations ?? []}
          onLocationChange={(nextLocationId) => {
            return navigate({
              search: (previous) => {
                return { ...previous, locationId: nextLocationId, page: 1 };
              },
            });
          }}
        />

        {canManage ? (
          <Button
            PrefixIcon={<Icons.Download />}
            variant="outlined"
            onClick={() => {
              return setIsExportOpen(true);
            }}
          >
            Export CSV
          </Button>
        ) : null}
      </div>

      {isError ? (
        <Card.Root>
          <Card.Content className="flex items-center justify-between gap-4">
            <p>Could not load participants.</p>

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
          emptyMessage="No participants found"
          hasActiveFilters={Boolean(searchText || locationId)}
          isLoading={isLoading}
          table={table}
        />
      )}
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/participants/")({
  component: ParticipantsPage,
  validateSearch: paginationValidationWithDefaults.extend({
    ...searchTextValidation.shape,
    ...sortValidation.shape,
    locationId: z.string().optional(),
  }),
});
