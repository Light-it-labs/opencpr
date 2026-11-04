import { tv } from "tailwind-variants";

import { Spinner } from "@/components/ui/spinner";

const routePendingVariants = tv({
  slots: {
    root: "flex flex-1 flex-col items-center justify-center gap-3 p-4",
    label: "text-sm text-text-default-secondary",
  },
});

const { label, root } = routePendingVariants();

export const RoutePending = () => {
  return (
    <div aria-live="polite" className={root()} data-slot="route-pending" role="status">
      <Spinner size="lg" decorative />

      <span className={label()}>Loading…</span>
    </div>
  );
};
