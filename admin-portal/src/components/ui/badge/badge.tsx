import type { ComponentProps, ReactElement } from "react";
import { Slot } from "@radix-ui/react-slot";
import { tv, type VariantProps } from "tailwind-variants";

const badgeSlots = tv({
  slots: {
    root: "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-4 focus-visible:ring-background-brand-default/25 focus-visible:outline-none aria-invalid:border-border-destructive-default aria-invalid:ring-border-destructive-default/20 dark:aria-invalid:ring-border-destructive-default/40",
    icon: "mr-1 flex items-center [&>svg]:pointer-events-none [&>svg]:size-3",
  },
  variants: {
    variant: {
      default: {
        root: "bg-background-brand-default text-text-brand-on-brand [a&]:hover:bg-background-brand-hover",
        icon: "text-text-brand-on-brand",
      },
      secondary: {
        root: "bg-background-brand-secondary text-text-brand-on-brand-secondary [a&]:hover:bg-background-brand-secondary-hover",
        icon: "text-text-brand-on-brand-secondary",
      },
      destructive: {
        root: "bg-background-destructive-default text-text-destructive-default focus-visible:ring-border-destructive-default/20 dark:bg-background-destructive-secondary dark:focus-visible:ring-border-destructive-default/40 [a&]:hover:bg-background-destructive-hover",
        icon: "text-text-destructive-default",
      },
      outline: {
        root: "border-border-default-default text-text-default-default",
        icon: "text-text-default-default",
      },
      success: {
        root: "bg-background-success-tertiary text-text-success-on-success-tertiary",
        icon: "text-text-success-tertiary",
      },
      warning: {
        root: "bg-background-warning-tertiary text-text-warning-on-warning-tertiary",
        icon: "text-text-warning-tertiary",
      },
    },
    size: {
      xs: {
        root: "px-1 py-0.5 text-xs",
      },
      sm: {
        root: "px-1.5 py-0.5 text-sm",
      },
      md: {
        root: "px-2 py-0.5 text-base",
      },
      lg: {
        root: "px-3 py-1 text-lg",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

type BadgeProps = ComponentProps<"span"> &
  VariantProps<typeof badgeSlots> & {
    asChild?: boolean;
    icon?: ReactElement;
  };

const { icon: iconClass, root } = badgeSlots();

export const Badge = ({
  asChild = false,
  children,
  className,
  icon,
  size,
  variant,
  ...props
}: BadgeProps) => {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp className={root({ variant, size, className })} data-slot="badge" {...props}>
      {icon ? <Slot className={iconClass({ variant })}>{icon}</Slot> : null}
      {children}
    </Comp>
  );
};
