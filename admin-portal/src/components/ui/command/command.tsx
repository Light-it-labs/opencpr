import type { ComponentProps } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { tv } from "tailwind-variants";

import { Icons } from "@/components/ui/icons";

const commandVariants = tv({
  slots: {
    root: "flex size-full flex-col overflow-hidden rounded-md bg-background-default-default text-text-default-default",
    inputWrapper: "flex items-center gap-2 border-b border-border-default-default px-3",
    input:
      "flex w-full bg-background-default-default py-2.5 text-sm text-text-default-default outline-hidden disabled:cursor-not-allowed disabled:bg-background-disabled-default disabled:text-text-disabled-on-disabled",
    list: "max-h-52 overflow-x-hidden overflow-y-auto p-1",
    empty: "text-center text-sm text-text-default-secondary",
    group:
      "overflow-hidden text-text-default-default **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-text-default-secondary",
    separator: "-mx-1 h-px bg-border-default-default",
    item: "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-background-default-secondary data-[selected=true]:text-text-default-default [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-default-secondary",
    shortcut: "ml-auto text-xs tracking-widest text-text-default-tertiary",
  },
});

const { empty, group, input, inputWrapper, item, list, root, separator, shortcut } =
  commandVariants();

const Root = ({ className, ...props }: ComponentProps<typeof CommandPrimitive>) => {
  return <CommandPrimitive className={root({ className })} data-slot="command" {...props} />;
};

const Input = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) => {
  return (
    <div className={inputWrapper()} data-slot="command-input-wrapper">
      <Icons.Search className="size-4 shrink-0 text-text-disabled-default" />
      <CommandPrimitive.Input
        className={input({ className })}
        data-slot="command-input"
        {...props}
      />
    </div>
  );
};

const List = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) => {
  return (
    <CommandPrimitive.List className={list({ className })} data-slot="command-list" {...props} />
  );
};

const Empty = (props: ComponentProps<typeof CommandPrimitive.Empty>) => {
  return <CommandPrimitive.Empty className={empty()} data-slot="command-empty" {...props} />;
};

const Group = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) => {
  return (
    <CommandPrimitive.Group className={group({ className })} data-slot="command-group" {...props} />
  );
};

const Separator = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Separator>) => {
  return (
    <CommandPrimitive.Separator
      className={separator({ className })}
      data-slot="command-separator"
      {...props}
    />
  );
};

const Item = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) => {
  return (
    <CommandPrimitive.Item className={item({ className })} data-slot="command-item" {...props} />
  );
};

const Shortcut = ({ className, ...props }: ComponentProps<"span">) => {
  return <span className={shortcut({ className })} data-slot="command-shortcut" {...props} />;
};

export const Command = {
  Root,
  Input,
  List,
  Empty,
  Group,
  Separator,
  Item,
  Shortcut,
};
