import { tv } from "tailwind-variants";

import { Logo } from "@/components/logo";
import { AccountMenu } from "./account-menu";

const appHeaderVariants = tv({
  slots: {
    root: "flex items-center justify-between gap-4 bg-background-brand-strong p-4 text-text-brand-on-brand",
    brand: "flex min-w-0 items-center gap-3",
    appName: "hidden text-lg font-semibold md:inline",
  },
});

const { appName, brand, root } = appHeaderVariants();

type AppHeaderProps = {
  isLoading?: boolean;
};

export const AppHeader = ({ isLoading = false }: AppHeaderProps) => {
  return (
    <header className={root()}>
      <div className={brand()}>
        <Logo tone="paper" />

        <span className={appName()}>Admin</span>
      </div>

      <AccountMenu isLoading={isLoading} />
    </header>
  );
};
