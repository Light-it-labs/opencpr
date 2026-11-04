import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";

import { useKioskMonitor, useSerialLink } from "@/hooks";
import { CHALLENGE_MODES, useMode } from "@/stores";

const RootComponent = () => {
  const pathname = useRouterState({
    select: (state) => {
      return state.location.pathname;
    },
  });

  // The firmware updater relaunches the kiosk on the maintenance screen, which
  // has to leave the port free for it to flash the board, and holds the
  // backend's alerts while the sensor is down on purpose. A trailing slash is
  // tolerated: missing it would grab the port mid-flash.
  const isMaintenance = /^\/maintenance\/?$/.test(pathname);

  // The attract screen is the only safe moment to reload for a new deploy:
  // anywhere else there is a participant part-way through something.
  useKioskMonitor({ isIdle: pathname === "/", isMaintenance });

  // Read from boot on every screen, so the heartbeat reports the sensor as it
  // is now rather than as it was at the end of the last run.
  const mode = useMode();
  useSerialLink({ enabled: mode === CHALLENGE_MODES.ARDUINO && !isMaintenance });

  return (
    <div className="flex size-full min-h-dvh flex-col font-sans">
      <Outlet />
    </div>
  );
};

export const Route = createRootRoute({ component: RootComponent });
