// eslint-disable-next-line simple-import-sort/imports -- react-scan must be imported before React and React DOM
import { scan } from "react-scan";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { initializeIcons, Toaster } from "@/components/ui";
import { queryClient } from "@/config/query-client";
import { router } from "@/config/router";
import { getSentryErrorHandlers, initializeSentry } from "@/config/sentry";
import { I18nextProvider } from "@/i18n";
import { startCprSessionOutbox } from "@/services/cpr-sessions";

import "@/styles.css";
import { env } from "./config/env";
import { TooltipProvider } from "./components/ui/tooltip";

initializeSentry();
initializeIcons();
startCprSessionOutbox();

/*
 * Kiosk hardening. A long press opens Chrome's context menu, from which a
 * participant can open links, view source or reach print — so on a public
 * machine it is a way out of the app. Dragging an image or text is the other.
 * Left enabled locally so development keeps a usable right click.
 */
if (env.VITE_APP_ENV !== "local") {
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
  document.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });
}
scan({ enabled: Boolean(env.VITE_APP_ENV === "local" && env.VITE_ENABLE_REACT_SCAN) });

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement, getSentryErrorHandlers());

  root.render(
    <I18nextProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}
