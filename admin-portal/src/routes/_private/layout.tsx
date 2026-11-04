import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { queryClient } from "@/config/query-client";
import { meQuery } from "@/services/auth";
import { AppShell } from "./-components/app-shell";
import { PrivateLayoutPending } from "./-components/layout-pending";

const PrivateLayout = () => {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

export const Route = createFileRoute("/_private")({
  beforeLoad: async ({ location }) => {
    const user = await queryClient.ensureQueryData(meQuery);

    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: PrivateLayout,
  pendingComponent: PrivateLayoutPending,
});
