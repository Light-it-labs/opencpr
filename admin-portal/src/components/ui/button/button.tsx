import { type ComponentProps, forwardRef, type JSX } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { tv, type VariantProps } from "tailwind-variants";

import { Icons } from "@/components/ui/icons";
import type { Styled } from "@/types/styles";

export const buttonVariants = tv({
  base: [
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-heading font-medium whitespace-nowrap",
    "transition-all duration-300 ease-in-out",
    "focus-visible:ring-4 focus-visible:ring-background-brand-default/25 focus-visible:outline-none disabled:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "disabled:bg-background-disabled-default disabled:text-text-disabled-on-disabled",
  ],
  variants: {
    variant: {
      primary: [
        "bg-background-brand-default text-text-brand-on-brand",
        "hover:bg-background-accent-default hover:text-text-accent-on-accent",
        "active:bg-background-accent-secondary active:text-text-accent-on-accent",
      ],
      secondary: [
        "bg-background-brand-secondary text-text-brand-on-brand-secondary",
        "hover:bg-background-brand-secondary-hover active:bg-background-brand-secondary",
      ],
      tertiary: [
        "bg-background-brand-tertiary text-text-brand-on-brand-tertiary",
        "hover:bg-background-brand-tertiary-hover active:bg-background-brand-tertiary",
      ],
      outlined: [
        "border border-border-brand-default bg-transparent text-text-default-default shadow-sm",
        "hover:bg-background-default-hover active:bg-transparent",
        "disabled:border-border-disabled-default disabled:text-text-disabled-default",
      ],
      elevated: [
        "border border-border-default-default bg-transparent text-text-default-default shadow-md",
        "hover:bg-background-default-hover active:bg-transparent",
        "disabled:border-border-disabled-default disabled:text-text-disabled-default",
      ],
      destructive: [
        "bg-background-destructive-default text-text-destructive-on-destructive",
        "hover:bg-background-destructive-hover active:bg-background-destructive-default",
      ],
      plainText:
        "text-text-brand-default hover:text-text-brand-secondary active:text-text-brand-default disabled:text-text-disabled-default",
    },
    size: {
      xs: "px-1 py-0.5 text-xs md:px-1.5 md:py-1 md:text-sm",
      sm: "px-1.5 py-1 text-xs md:px-2 md:py-1.5 md:text-sm",
      md: "px-1.5 py-1 text-sm md:px-2 md:py-1.5 md:text-base",
      lg: "px-3 py-2 text-lg",
      icon: "p-3",
    },
    isIconOnly: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { size: "xs", isIconOnly: true, class: "p-0" },
    { size: "sm", isIconOnly: true, class: "p-1.5" },
    { size: "md", isIconOnly: true, class: "p-2" },
    { size: "lg", isIconOnly: true, class: "p-3" },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export type ButtonProps = {
  asChild?: boolean;
  PrefixIcon?: JSX.Element;
  isLoading?: boolean;
} & ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> &
  Styled;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      PrefixIcon,
      asChild = false,
      children,
      className,
      disabled,
      isLoading = false,
      size,
      type = "button",
      variant,
      ...props
    },
    ref,
  ) => {
    const isIconOnly = PrefixIcon && !children;

    const Prefix = isLoading ? (
      <Icons.LoaderCircle className="animate-spin" />
    ) : (
      (PrefixIcon ?? null)
    );

    return asChild ? (
      <Slot
        className={buttonVariants({ size, variant, className, isIconOnly })}
        data-slot="button"
        {...props}
      >
        {Prefix}

        <Slottable>{children}</Slottable>
      </Slot>
    ) : (
      <button
        ref={ref}
        className={buttonVariants({ size, variant, className, isIconOnly })}
        data-slot="button"
        disabled={disabled || isLoading}
        type={type}
        {...props}
      >
        {Prefix}

        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
