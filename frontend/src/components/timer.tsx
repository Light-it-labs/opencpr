import { type PropsWithChildren, useEffect, useMemo, useState } from "react";

const UPDATE_COUNTDOWN_MS = 100;

type TimerProps = {
  timeInMilliseconds: number;
  onTimeUp?: () => void;
};

export const Timer = ({
  children,
  onTimeUp,
  timeInMilliseconds,
}: PropsWithChildren<TimerProps>) => {
  const stopTime = useMemo(() => {
    return Date.now() + timeInMilliseconds;
  }, [timeInMilliseconds]);

  const [remainingTime, setRemainingTime] = useState(stopTime - Date.now());

  const timer = (() => {
    const seconds = Math.ceil(remainingTime / 1000);

    return `${seconds.toString().padStart(2, "0")}`;
  })();

  const progress = remainingTime / timeInMilliseconds;
  const radius = 220;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = -circumference * (1 - progress);
  const angle = (1 - progress) * 360;

  useEffect(() => {
    if (remainingTime <= 0) {
      return;
    }

    const timer = setInterval(() => {
      const newRemainingTime = stopTime - Date.now();
      if (newRemainingTime <= 0) {
        clearInterval(timer);
        setRemainingTime(0);
        onTimeUp?.();
      } else {
        setRemainingTime(newRemainingTime);
      }
    }, UPDATE_COUNTDOWN_MS);

    return () => {
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We don't want to run this effect on every render
  }, []);

  return (
    <div>
      <div className="relative flex flex-row items-center justify-center" role="timer">
        {/* Animated circular progress */}
        <svg
          className="absolute size-[30rem]"
          style={{ transform: "rotate(-90deg)" }}
          viewBox="0 0 464 464"
        >
          {/* Progress circle */}
          <circle
            className="text-background transition-all duration-100 ease-linear"
            cx="232"
            cy="232"
            fill="none"
            r={radius}
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth="2"
          />
          {/* Dot at the end */}
          <circle
            className="text-background transition-all duration-100 ease-linear"
            cx={232 + radius * Math.cos((angle * Math.PI) / 180)}
            cy={232 + radius * Math.sin((angle * Math.PI) / 180)}
            fill="currentColor"
            r="4"
          />
        </svg>

        <div className="size-96 rounded-full bg-primary" aria-hidden />

        <div className="absolute flex flex-col items-center text-primary-foreground">
          <p className="text-3xl">{children}</p>
          <p className="font-heading text-9xl font-bold">{timer}</p>
        </div>
      </div>
    </div>
  );
};
