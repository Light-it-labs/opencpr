import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Icons } from "@/components/ui/icons";
import { paginationValidationWithDefaults } from "@/hooks/use-pagination";
import { searchTextValidation } from "@/hooks/use-search";
import { useCanManage } from "@/services/auth";
import { type Location, useAdminLocations } from "@/services/locations";
import { DeleteLocationDialog } from "./-components/delete-location-dialog";
import { LocationDialog } from "./-components/location-dialog";
import { LocationsFilters } from "./-components/locations-filters";
import { useLocationsTable } from "./-hooks/use-locations-table";

const LocationsPage = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location>();
  const [deletingLocation, setDeletingLocation] = useState<Location>();

  const { searchText } = Route.useSearch();
  const navigate = Route.useNavigate();

  const canManage = useCanManage();
  const { data, isError, isLoading, refetch } = useAdminLocations();

  const filteredLocations = useMemo(() => {
    const normalizedSearch = searchText?.trim().toLowerCase();

    return (data ?? []).filter((location) => {
      return !normalizedSearch || location.name.toLowerCase().includes(normalizedSearch);
    });
  }, [data, searchText]);

  const hasActiveFilters = Boolean(searchText);

  const table = useLocationsTable({
    canManage,
    data: filteredLocations,
    onDelete: setDeletingLocation,
    onEdit: setEditingLocation,
  });

  return (
    <LayoutWrapper>
      <LocationDialog
        location={editingLocation}
        open={isCreateOpen || Boolean(editingLocation)}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingLocation(undefined);
        }}
      />

      <DeleteLocationDialog
        location={deletingLocation}
        onClose={() => {
          return setDeletingLocation(undefined);
        }}
      />

      <Header.Root>
        <Breadcrumbs pages={[{ name: "Locations" }]} />

        <Header.Content>
          <Header.Title>Locations</Header.Title>

          {canManage ? (
            <Button
              onClick={() => {
                return setIsCreateOpen(true);
              }}
            >
              <Icons.Plus />
              New location
            </Button>
          ) : null}
        </Header.Content>
      </Header.Root>

      <LocationsFilters
        hasFilters={hasActiveFilters}
        onClear={() => {
          table.resetSorting();

          return navigate({
            search: (previous) => {
              return { ...previous, page: 1, searchText: undefined };
            },
          });
        }}
      />

      {isError ? (
        <Card.Root>
          <Card.Content className="flex items-center justify-between gap-4">
            <p>Could not load locations.</p>

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
          emptyMessage="No locations yet"
          hasActiveFilters={hasActiveFilters}
          isLoading={isLoading}
          table={table}
        />
      )}
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/locations/")({
  component: LocationsPage,
  validateSearch: paginationValidationWithDefaults.extend({
    ...searchTextValidation.shape,
  }),
});
