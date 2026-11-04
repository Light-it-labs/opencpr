import { type ComponentProps } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { tv } from "tailwind-variants";

import type { Styled } from "@/types/styles";

const labelVariants = tv({
  base: "leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 after:ml-0.5 after:text-muted-foreground aria-required:after:content-['*']",
});

type LabelProps = ComponentProps<typeof LabelPrimitive.Root> & Styled;

const Label = ({ className, ...props }: LabelProps) => {
  return <LabelPrimitive.Root className={labelVariants({ className })} {...props} />;
};

export { Label };
