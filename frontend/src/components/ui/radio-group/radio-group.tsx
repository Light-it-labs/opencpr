import type { ComponentProps } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { tv } from "tailwind-variants";

const radioGroupVariants = tv({
  slots: {
    root: "grid gap-3 disabled:opacity-50",
    item: "peer aspect-square size-4 cursor-pointer rounded-full border border-input shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 aria-checked:border-primary aria-checked:bg-primary aria-checked:ring-primary/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    indicator: "relative flex items-center justify-center",
  },
});

const { indicator, item, root } = radioGroupVariants();

const Root = ({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) => {
  return (
    <RadioGroupPrimitive.Root className={root({ className })} data-slot="radio-group" {...props} />
  );
};

const Indicator = ({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Indicator>) => {
  return (
    <RadioGroupPrimitive.Indicator
      className={indicator({ className })}
      data-slot="radio-group-indicator"
      {...props}
    />
  );
};

const Item = ({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) => {
  return (
    <RadioGroupPrimitive.Item
      className={item({ className })}
      data-slot="radio-group-item"
      {...props}
    />
  );
};

export const RadioGroup = { Root, Item, Indicator };
