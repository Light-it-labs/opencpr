import type { ComponentProps } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { tv } from "tailwind-variants";

import { Icons } from "../icons";

const checkboxVariants = tv({
  slots: {
    root: "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
    indicator: "flex items-center justify-center text-current transition-none",
    icon: "size-3.5",
  },
});

const { icon, indicator, root } = checkboxVariants();

export type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root>;

const Checkbox = ({ className, ...props }: CheckboxProps) => {
  return (
    <CheckboxPrimitive.Root className={root({ className })} data-slot="checkbox" {...props}>
      <CheckboxPrimitive.Indicator className={indicator()} data-slot="checkbox-indicator">
        <Icons.Check className={icon()} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
};

export { Checkbox };
