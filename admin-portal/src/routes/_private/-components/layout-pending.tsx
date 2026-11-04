import { RoutePending } from "@/components/route-pending";
import { AppShell } from "./app-shell";

export const PrivateLayoutPending = () => {
  return (
    <AppShell isLoading>
      <RoutePending />
    </AppShell>
  );
};
