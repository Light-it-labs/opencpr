import { tv } from "tailwind-variants";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { NavigationMenu } from "@/components/ui/navigation-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanManage } from "@/services/auth";
import { useSidebarStore } from "@/stores/use-sidebar-store";
import { SidebarLink } from "./sidebar-link";

const sidebarVariants = tv({
  slots: {
    root: "flex shrink-0 flex-col gap-2 border-r border-border-default-default p-2 transition-all duration-300",
    nav: "max-w-none flex-none flex-col items-stretch justify-start",
    list: "flex-col items-stretch justify-start",
    skeletonList: "flex flex-col gap-1",
    skeletonItem: "h-9 w-full",
    toggle: "hidden self-end md:inline-flex",
    toggleIcon: "transition-transform duration-300",
  },
  variants: {
    isExpanded: {
      true: { root: "w-14 md:w-48" },
      false: { root: "w-14", toggle: "self-center", toggleIcon: "rotate-180" },
    },
  },
});

const SIDEBAR_LINKS = [
  { path: "/", label: "Dashboard", icon: <Icons.LayoutDashboard /> },
  { path: "/statistics", label: "Statistics", icon: <Icons.BarChart3 /> },
  { path: "/kiosks", label: "Kiosks", icon: <Icons.Monitor />, isAdminOnly: true },
  { path: "/sessions", label: "Sessions", icon: <Icons.Activity /> },
  { path: "/locations", label: "Locations", icon: <Icons.MapPin /> },
  { path: "/participants", label: "Participants", icon: <Icons.Users /> },
  { path: "/users", label: "Users", icon: <Icons.UserCog />, isAdminOnly: true },
] as const;

type SidebarProps = {
  isLoading?: boolean;
};

export const Sidebar = ({ isLoading = false }: SidebarProps) => {
  const isExpanded = useSidebarStore((state) => {
    return state.isExpanded;
  });
  const toggle = useSidebarStore((state) => {
    return state.toggle;
  });

  const canManage = useCanManage();

  const visibleLinks = SIDEBAR_LINKS.filter((link) => {
    return canManage || !("isAdminOnly" in link);
  });

  const {
    list,
    nav,
    root,
    skeletonItem,
    skeletonList,
    toggle: toggleButton,
    toggleIcon,
  } = sidebarVariants({ isExpanded });

  return (
    <aside aria-busy={isLoading} className={root()}>
      <Button
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        className={toggleButton()}
        disabled={isLoading}
        size="sm"
        variant="plainText"
        onClick={toggle}
      >
        <Icons.ChevronLeft className={toggleIcon()} />
      </Button>

      {isLoading ? (
        <div className={skeletonList()}>
          {SIDEBAR_LINKS.map((link) => {
            return <Skeleton key={link.path} className={skeletonItem()} />;
          })}
        </div>
      ) : (
        <NavigationMenu.Root className={nav()} orientation="vertical" viewport={false}>
          <NavigationMenu.List className={list()}>
            {visibleLinks.map(({ icon, label, path }) => {
              return (
                <SidebarLink
                  key={path}
                  icon={icon}
                  isExpanded={isExpanded}
                  label={label}
                  path={path}
                />
              );
            })}
          </NavigationMenu.List>
        </NavigationMenu.Root>
      )}
    </aside>
  );
};
