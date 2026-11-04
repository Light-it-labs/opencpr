import type { ComponentProps } from "react";
import { tv } from "tailwind-variants";

const headerVariants = tv({
  slots: {
    root: "flex flex-col gap-2 md:gap-3",
    content: "flex flex-wrap items-center justify-between gap-2",
    title: "font-heading text-2xl font-bold text-text-default-default",
  },
});

const { content, root, title } = headerVariants();

const Root = ({ className, ...props }: ComponentProps<"header">) => {
  return <header className={root({ className })} data-slot="header" {...props} />;
};

const Content = ({ className, ...props }: ComponentProps<"div">) => {
  return <div className={content({ className })} data-slot="header-content" {...props} />;
};

const Title = ({ className, ...props }: ComponentProps<"h1">) => {
  return <h1 className={title({ className })} data-slot="header-title" {...props} />;
};

export const Header = { Root, Content, Title };
