import type { JSX } from "react";
import { tv } from "tailwind-variants";

import { NavigationMenu } from "@/components/ui/navigation-menu";
import { Tooltip } from "@/components/ui/tooltip";
import type { AvailableRoutesToPath } from "@/config/router";

const sidebarLinkVariants = tv({
  base: "w-full flex-row items-center gap-2 whitespace-nowrap",
  variants: {
    isExpanded: {
      true: "justify-center md:justify-start",
      false: "justify-center",
    },
  },
});

type SidebarLinkProps = {
  icon: JSX.Element;
  isExpanded: boolean;
  label: string;
  path: AvailableRoutesToPath;
};

export const SidebarLink = ({ icon, isExpanded, label, path }: SidebarLinkProps) => {
  const navigationLink = (
    <NavigationMenu.Link className={sidebarLinkVariants({ isExpanded })} to={path}>
      {icon}

      {isExpanded ? <span className="hidden md:inline">{label}</span> : null}
    </NavigationMenu.Link>
  );

  if (isExpanded) {
    return navigationLink;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{navigationLink}</Tooltip.Trigger>

      <Tooltip.Content side="right">{label}</Tooltip.Content>
    </Tooltip.Root>
  );
};
