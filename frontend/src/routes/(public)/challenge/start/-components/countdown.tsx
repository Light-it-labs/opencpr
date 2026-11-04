import { useTranslation } from "react-i18next";

const STROKE_DASHOFFSET = 629;

type CountdownProps = {
  total: number;
  current: number;
};
const sizes = {
  svg: 300,
  stroke: "14",
};

export const Countdown = ({ current, total }: CountdownProps) => {
  const progressPercentage = total > 0 ? current / total : 0;
  const svgProgress = STROKE_DASHOFFSET * progressPercentage;
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-row items-center justify-center" role="status">
      <svg height={sizes.svg} viewBox="-10 -10 220 220" width={sizes.svg} aria-hidden>
        <path
          className="fill-background stroke-background"
          d="M0,100 a100,100 0 1 0 200,0 a100,100 0 1 0 -200,0"
          id="back"
          strokeLinecap="round"
          strokeWidth={sizes.stroke}
        />
        <g transform="rotate(180 100 100) scale(-1 1) translate(-200 0)">
          <path
            d="M100,0 a100,100 0 0 1 0,200 a100,100 0 0 1 0,-200"
            fill="none"
            strokeDasharray={STROKE_DASHOFFSET}
            strokeDashoffset={STROKE_DASHOFFSET * 2}
            strokeLinecap="round"
            strokeWidth={sizes.stroke}
          />
          <path
            className="stroke-primary transition-all duration-300 ease-in-out"
            d="M100,0 a100,100 0 0 1 0,200 a100,100 0 0 1 0,-200"
            fill="none"
            strokeDasharray={STROKE_DASHOFFSET}
            strokeDashoffset={STROKE_DASHOFFSET + svgProgress}
            strokeLinecap="round"
            strokeWidth={sizes.stroke}
          />
        </g>
      </svg>

      <p className="absolute flex flex-col items-center font-heading text-7xl font-bold text-nowrap text-foreground">
        {current}

        <span className="text-2xl font-medium">{t("challenge.execution.of_total", { total })}</span>
      </p>
    </div>
  );
};
