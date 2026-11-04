import type { ComponentProps } from "react";
import { tv } from "tailwind-variants";

const layoutWrapperVariants = tv({
  base: "flex size-full grow flex-col gap-6",
});

export const LayoutWrapper = ({ className, ...props }: ComponentProps<"section">) => {
  return <section className={layoutWrapperVariants({ className })} {...props} />;
};
