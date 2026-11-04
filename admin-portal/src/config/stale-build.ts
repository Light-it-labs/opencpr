import { differenceInSeconds } from "date-fns";

const RELOADED_AT_KEY = "stale-build-reloaded-at";
const RELOAD_GRACE_SECONDS = 10;

let isReloading = false;

const readLastReload = () => {
  try {
    return Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0);
  } catch {
    return 0;
  }
};

const rememberReload = () => {
  try {
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    return;
  }
};

export const isReloadingForNewBuild = () => {
  return isReloading;
};

export const listenForStaleBuild = () => {
  window.addEventListener("vite:preloadError", (event) => {
    const secondsSinceReload = differenceInSeconds(new Date(), new Date(readLastReload()));

    if (secondsSinceReload < RELOAD_GRACE_SECONDS) {
      return;
    }

    event.preventDefault();
    isReloading = true;
    rememberReload();
    window.location.reload();
  });
};
