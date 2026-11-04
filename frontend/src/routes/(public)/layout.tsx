import { createFileRoute, Outlet } from "@tanstack/react-router";

const GuestLayout = () => {
  return (
    <main className="size-full min-h-dvh bg-background text-foreground">
      <Outlet />
    </main>
  );
};

export const Route = createFileRoute("/(public)")({
  component: GuestLayout,
});
