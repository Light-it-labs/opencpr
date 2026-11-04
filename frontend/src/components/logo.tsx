import { twMerge } from "tailwind-merge";

type LogoProps = {
  className?: string;
  /** Wordmark color: ink on light surfaces, paper on dark ones. */
  tone?: "ink" | "paper";
  size?: "md" | "lg" | "xl" | "2xl";
};

/**
 * The OpenCPR mark and wordmark. The mark's two pills keep their brand reds
 * whatever the surface; only the wordmark and the overlap blend follow `tone`,
 * since multiply has nothing to multiply over on a dark background.
 */
export const Logo = ({ className, size = "md", tone = "ink" }: LogoProps) => {
  const isInk = tone === "ink";
  const sizes = {
    md: { gap: "gap-2.5", mark: "-mr-1 size-9", text: "text-2xl" },
    lg: { gap: "gap-4", mark: "-mr-1.5 size-16", text: "text-5xl" },
    xl: { gap: "gap-5", mark: "-mr-2 size-24", text: "text-7xl" },
    "2xl": { gap: "gap-10", mark: "-mr-6 size-64", text: "text-logo-hero" },
  }[size];

  return (
    <span className={twMerge("inline-flex items-center", sizes.gap, sizes.text, className)}>
      <svg
        className={twMerge("shrink-0", sizes.mark)}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect
          fill="#C8372D"
          height="24"
          rx="7"
          transform="rotate(-45 15.5 17)"
          width="14"
          x="8.5"
          y="5"
        />
        <rect
          className={isInk ? "mix-blend-multiply" : undefined}
          fill="#F2A79E"
          height="24"
          rx="7"
          transform="rotate(45 24.5 17)"
          width="14"
          x="17.5"
          y="5"
        />
      </svg>

      <span
        className={twMerge(
          "font-heading leading-none tracking-[-0.025em]",
          isInk ? "text-foreground" : "text-primary-foreground",
        )}
      >
        <span className="font-normal">Open</span>
        <span className="font-bold">CPR</span>
      </span>
    </span>
  );
};
