import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Logo } from "@/components/logo";

const FormLayout = () => {
  return (
    <div className="flex size-full min-h-dvh justify-center p-20">
      <div className="flex h-fit w-full flex-col items-start gap-10 rounded-3xl bg-card p-9 text-card-foreground md:w-xl">
        <Logo className="self-center" />
        <Outlet />
      </div>
    </div>
  );
};

export const Route = createFileRoute("/(public)/(forms)")({
  component: FormLayout,
});
