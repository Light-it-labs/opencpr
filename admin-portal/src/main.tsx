import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { initializeIcons } from "@/components/ui/icons";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/config/query-client";
import { router } from "@/config/router";
import { getSentryErrorHandlers, initializeSentry } from "@/config/sentry";
import { listenForStaleBuild } from "@/config/stale-build";

import "@/styles.css";

listenForStaleBuild();
initializeSentry();
initializeIcons();

const rootElement = document.getElementById("root");

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement, getSentryErrorHandlers());

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
