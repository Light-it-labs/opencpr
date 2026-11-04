import { useMemo } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Icons } from "@/components/ui/icons";
import { queryClient } from "@/config/query-client";
import { meQuery } from "@/services/auth";
import {
  KIOSK_SENSOR_FILTER,
  KIOSK_STATUS_FILTER,
  KIOSKS_REFETCH_INTERVAL,
  SERIAL_FAULT_STATUSES,
  SERIAL_STATUS,
  useKiosks,
} from "@/services/kiosks";
import { useAdminLocations } from "@/services/locations";
import { USER_ROLES } from "@/services/users";
import { KiosksFilters } from "./-components/kiosks-filters";
import { useKiosksTable } from "./-hooks/use-kiosks-table";

const KiosksPage = () => {
  const {
    data: kiosks,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useKiosks({
    refetchInterval: KIOSKS_REFETCH_INTERVAL,
  });
  const { data: locations } = useAdminLocations();

  const locationNames = useMemo(() => {
    return new Map(
      (locations ?? []).map((location) => {
        return [location.id, location.name];
      }),
    );
  }, [locations]);

  const { locationId, sensor, status } = Route.useSearch();
  const navigate = Route.useNavigate();

  const filteredKiosks = useMemo(() => {
    return (kiosks ?? []).filter((kiosk) => {
      const matchesStatus = !status || kiosk.online === (status === KIOSK_STATUS_FILTER.ONLINE);

      const isHealthyReading = kiosk.serialStatus === SERIAL_STATUS.READING && !kiosk.serialStale;
      const needsAttention =
        kiosk.serialStale ||
        (kiosk.serialStatus !== null && SERIAL_FAULT_STATUSES.includes(kiosk.serialStatus));
      const matchesSensor =
        !sensor || (sensor === KIOSK_SENSOR_FILTER.READING ? isHealthyReading : needsAttention);

      const matchesLocation = !locationId || kiosk.locationId === locationId;

      return matchesStatus && matchesSensor && matchesLocation;
    });
  }, [kiosks, locationId, sensor, status]);

  const table = useKiosksTable({ data: filteredKiosks, locationNames });

  const hasActiveFilters = Boolean(locationId || sensor || status);

  const onlineCount = (kiosks ?? []).filter((kiosk) => {
    return kiosk.online;
  }).length;

  return (
    <LayoutWrapper>
      <Header.Root>
        <Breadcrumbs pages={[{ name: "Kiosks" }]} />

        <Header.Content>
          <div className="flex flex-col gap-1">
            <Header.Title>Kiosks</Header.Title>

            {kiosks ? (
              <p className="text-sm text-text-default-secondary">
                {onlineCount} online of {kiosks.length}
              </p>
            ) : null}
          </div>

          <Button
            aria-label="Refresh kiosks"
            PrefixIcon={<Icons.RefreshCw className={isFetching ? "animate-spin" : undefined} />}
            variant="outlined"
            onClick={() => {
              return refetch();
            }}
          />
        </Header.Content>
      </Header.Root>

      <KiosksFilters
        hasFilters={hasActiveFilters}
        locations={locations ?? []}
        value={{ locationId, sensor, status }}
        onChange={(changes) => {
          return navigate({
            search: (previous) => {
              return { ...previous, ...changes };
            },
          });
        }}
        onClear={() => {
          table.resetSorting();

          return navigate({
            search: (previous) => {
              return {
                ...previous,
                locationId: undefined,
                sensor: undefined,
                status: undefined,
              };
            },
          });
        }}
      />

      {isError ? (
        <Card.Root>
          <Card.Content className="flex items-center justify-between gap-4">
            <p>Could not load kiosks.</p>

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
          emptyMessage="No kiosks have reported yet"
          hasActiveFilters={hasActiveFilters}
          isLoading={isLoading}
          table={table}
        />
      )}
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/kiosks/")({
  component: KiosksPage,
  validateSearch: z.object({
    locationId: z.string().optional(),
    sensor: z
      .enum([KIOSK_SENSOR_FILTER.READING, KIOSK_SENSOR_FILTER.ATTENTION])
      .optional()
      .catch(undefined),
    status: z
      .enum([KIOSK_STATUS_FILTER.ONLINE, KIOSK_STATUS_FILTER.OFFLINE])
      .optional()
      .catch(undefined),
  }),
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(meQuery);

    if (user?.role !== USER_ROLES.admin) {
      throw redirect({ to: "/" });
    }
  },
});
