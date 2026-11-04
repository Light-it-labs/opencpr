import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { queryClient } from "@/config/query-client";
import { meQuery } from "@/services/auth";
import { redirectTarget } from "@/utils/redirect-target";

const GuestLayout = () => {
  return <Outlet />;
};

export const Route = createFileRoute("/(public)/_guest")({
  component: GuestLayout,
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),
  beforeLoad: async ({ search }) => {
    const user = await queryClient.ensureQueryData(meQuery);

    if (user) {
      throw redirect(redirectTarget(search.redirect));
    }
  },
});
