import { type ComponentProps, useEffect, useRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { tv, type VariantProps } from "tailwind-variants";

import { Icons } from "@/components/ui";
import type { Styled } from "@/types/styles";

const buttonVariants = tv({
  base: "inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 ease-in-out focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none",
  variants: {
    variant: {
      default:
        "bg-primary text-primary-foreground shadow hover:bg-primary/60 focus-visible:ring-primary-foreground/70 active:bg-primary/80",
      destructive:
        "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/50 active:bg-destructive/80",
      outline:
        "border border-border bg-transparent text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
      secondary:
        "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:ring-secondary/50 active:bg-secondary/80",
      ghost: "text-foreground",
      link: "text-foreground underline-offset-4 hover:underline",
    },
    size: {
      sm: "px-1.5 py-1 text-xs md:px-2 md:py-1.5 md:text-sm",
      default: "px-1.5 py-1 text-sm md:px-2 md:py-1.5 md:text-base",
      lg: "px-4 py-2 text-lg",
      xl: "px-6 py-3 text-xl",
      "2xl": "px-8 py-4 text-2xl",
      "3xl": "px-16 py-6 text-4xl",
      icon: "p-3",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type ButtonProps = {
  asChild?: boolean;
  isLoading?: boolean;
} & ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> &
  Styled;

const Button = ({
  asChild = false,
  children,
  className,
  disabled,
  isLoading = false,
  size,
  variant,
  ...props
}: ButtonProps) => {
  return asChild ? (
    <Slot className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </Slot>
  ) : (
    <button
      className={buttonVariants({ variant, size, className })}
      disabled={isLoading || disabled}
      type="button"
      {...props}
    >
      {isLoading ? <Icons.LoaderCircle className="animate-spin" /> : null}
      {/* Browser page translation swaps bare text nodes for its own <font>
        tags; React then cannot insert the spinner before the label it no
        longer owns and the page crashes. A wrapper element survives that. */}
      <span className="contents">{children}</span>
    </button>
  );
};

const AutoFocusButton = (props: ButtonProps) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return <Button {...props} ref={ref} />;
};

export { AutoFocusButton, Button, buttonVariants };
