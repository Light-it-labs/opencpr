import { useEffect, useState } from "react";

import { TIME } from "@/constants/time";

export const useNow = (refreshInterval = 30 * TIME.SECOND): Date => {
  const [now, setNow] = useState(() => {
    return new Date();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [refreshInterval]);

  return now;
};
