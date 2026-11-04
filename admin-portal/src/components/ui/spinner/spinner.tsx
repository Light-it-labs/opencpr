import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";

import { Icons } from "@/components/ui/icons";

const spinnerVariants = tv({
  slots: {
    root: "inline-flex shrink-0 items-center justify-center text-text-default-secondary",
    icon: "animate-spin",
  },
  variants: {
    size: {
      sm: { icon: "size-4" },
      md: { icon: "size-6" },
      lg: { icon: "size-8" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type SpinnerProps = ComponentProps<"span"> &
  VariantProps<typeof spinnerVariants> & {
    label?: string;
    /** Hide from assistive tech when a surrounding element already announces the loading state. */
    decorative?: boolean;
  };

export const Spinner = ({
  className,
  decorative = false,
  label = "Loading",
  size,
  ...props
}: SpinnerProps) => {
  const { icon, root } = spinnerVariants({ size });
  const statusProps = decorative
    ? { "aria-hidden": true as const }
    : { "aria-label": label, "aria-live": "polite" as const, role: "status" };

  return (
    <span className={root({ className })} data-slot="spinner" {...props} {...statusProps}>
      <Icons.LoaderCircle aria-hidden="true" className={icon()} />
    </span>
  );
};
