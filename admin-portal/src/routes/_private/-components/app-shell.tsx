import type { PropsWithChildren } from "react";
import { tv } from "tailwind-variants";

import { AppHeader } from "./app-header";
import { Sidebar } from "./sidebar";

const appShellVariants = tv({
  slots: {
    root: "flex min-h-dvh flex-col",
    body: "flex flex-1",
    main: "flex min-w-0 flex-1 flex-col gap-4 p-4",
    footer: "mt-auto pt-6 text-center text-xs text-text-default-secondary",
    footerLink: "underline-offset-2 hover:underline",
  },
});

const { body, footer, footerLink, main, root } = appShellVariants();

type AppShellProps = PropsWithChildren<{
  isLoading?: boolean;
}>;

export const AppShell = ({ children, isLoading = false }: AppShellProps) => {
  return (
    <div className={root()}>
      <AppHeader isLoading={isLoading} />

      <div className={body()}>
        <Sidebar isLoading={isLoading} />

        <main aria-busy={isLoading} className={main()}>
          {children}

          <footer className={footer()}>
            OpenCPR · made by{" "}
            <a className={footerLink()} href="https://lightit.io" rel="noreferrer" target="_blank">
              Light-it
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
};
