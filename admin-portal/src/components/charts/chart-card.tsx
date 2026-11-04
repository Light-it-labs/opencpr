import type { ComponentProps, ReactNode } from "react";
import { tv } from "tailwind-variants";

import { Card } from "@/components/ui/card";

const chartCardVariants = tv({
  base: "gap-4",
  variants: {
    isRefreshing: {
      true: "opacity-60 transition-opacity",
      false: "transition-opacity",
    },
  },
  defaultVariants: { isRefreshing: false },
});

type ChartCardProps = Omit<ComponentProps<typeof Card.Root>, "title"> & {
  /** Rendered in the header's action slot, e.g. a readout for the chart. */
  action?: ReactNode;
  description: string;
  isRefreshing?: boolean;
  title: string;
};

export const ChartCard = ({
  action,
  children,
  className,
  description,
  isRefreshing,
  title,
  ...props
}: ChartCardProps) => {
  return (
    <Card.Root className={chartCardVariants({ className, isRefreshing })} {...props}>
      <Card.Header>
        <Card.Title>{title}</Card.Title>

        <Card.Description>{description}</Card.Description>

        {action ? <Card.Action>{action}</Card.Action> : null}
      </Card.Header>

      <Card.Content>{children}</Card.Content>
    </Card.Root>
  );
};
