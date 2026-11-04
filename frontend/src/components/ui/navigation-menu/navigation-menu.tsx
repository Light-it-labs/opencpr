import type { ComponentProps } from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { Link, type LinkProps } from "@tanstack/react-router";
import { tv } from "tailwind-variants";

import { Icons } from "@/components/ui";
import type { Styled } from "@/types/styles";

export const navigationVariants = tv({
  slots: {
    root: "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
    list: "group flex flex-1 list-none items-center justify-center gap-1",
    item: "relative",
    trigger:
      "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium ring-ring/10 outline-ring/50 transition-[color,box-shadow] hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-4 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent",
    triggerIcon:
      "relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180",
    content:
      "top-0 left-0 w-full p-2 pr-2.5 group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 md:absolute md:w-auto",
    link: "flex flex-col gap-1 rounded-sm p-2 text-sm ring-ring/10 outline-ring/50 transition-[color,box-shadow] hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-4 focus-visible:outline-1 data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground data-[active=true]:hover:bg-accent data-[active=true]:focus:bg-accent [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
    linkActive: "bg-accent font-bold text-accent-foreground",
    indicator:
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in",
    indicatorButton: "relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md",
    viewportWrapper: "absolute top-full left-0 isolate z-50 flex justify-center",
    viewport:
      "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
  },
});

const {
  content,
  indicator,
  indicatorButton,
  item,
  link,
  linkActive,
  list,
  root,
  trigger,
  triggerIcon,
  viewport,
  viewportWrapper,
} = navigationVariants();

const Root = ({
  children,
  className,
  viewport = true,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean;
}) => {
  return (
    <NavigationMenuPrimitive.Root
      className={root({ className })}
      data-slot="navigation-menu"
      data-viewport={viewport}
      {...props}
    >
      {children}

      {viewport ? <Viewport /> : null}
    </NavigationMenuPrimitive.Root>
  );
};

const List = ({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.List>) => {
  return (
    <NavigationMenuPrimitive.List
      className={list({ className })}
      data-slot="navigation-menu-list"
      {...props}
    />
  );
};

const Item = ({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Item>) => {
  return (
    <NavigationMenuPrimitive.Item
      className={item({ className })}
      data-slot="navigation-menu-item"
      {...props}
    />
  );
};

const Trigger = ({
  children,
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Trigger>) => {
  return (
    <NavigationMenuPrimitive.Trigger
      className={trigger({ className })}
      data-slot="navigation-menu-trigger"
      {...props}
    >
      {children}

      <Icons.ChevronDown aria-hidden="true" className={triggerIcon()} />
    </NavigationMenuPrimitive.Trigger>
  );
};

const Content = ({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Content>) => {
  return (
    <NavigationMenuPrimitive.Content
      className={content({ className })}
      data-slot="navigation-menu-content"
      {...props}
    />
  );
};

const Viewport = ({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Viewport>) => {
  return (
    <div className={viewportWrapper()}>
      <NavigationMenuPrimitive.Viewport
        className={viewport({ className })}
        data-slot="navigation-menu-viewport"
        {...props}
      />
    </div>
  );
};

const NavigationMenuLink = ({ className, ...props }: LinkProps & Styled) => {
  return (
    <NavigationMenuPrimitive.Link
      className={link({ className })}
      data-slot="navigation-menu-link"
      asChild
    >
      <Link activeProps={{ className: linkActive({ className }) }} {...props} />
    </NavigationMenuPrimitive.Link>
  );
};

const Indicator = ({
  className,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive.Indicator>) => {
  return (
    <NavigationMenuPrimitive.Indicator
      className={indicator({ className })}
      data-slot="navigation-menu-indicator"
      {...props}
    >
      <div className={indicatorButton()} />
    </NavigationMenuPrimitive.Indicator>
  );
};

export const NavigationMenu = {
  Root,
  Content,
  Indicator,
  Item,
  Link: NavigationMenuLink,
  List,
  Trigger,
  Viewport,
};
