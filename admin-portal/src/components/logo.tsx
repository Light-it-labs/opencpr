import { tv, type VariantProps } from "tailwind-variants";

import type { Styled } from "@/types/styles";

const logoVariants = tv({
  slots: {
    root: "inline-flex items-center gap-2.5",
    mark: "-mr-1 size-9 shrink-0",
    salmon: "",
    wordmark: "font-heading text-2xl font-normal tracking-tight",
    strong: "font-bold",
  },
  variants: {
    tone: {
      ink: {
        salmon: "mix-blend-multiply",
        wordmark: "text-text-default-default",
      },
      paper: {
        salmon: "mix-blend-normal",
        wordmark: "text-text-brand-on-brand",
      },
    },
  },
  defaultVariants: {
    tone: "ink",
  },
});

type LogoProps = VariantProps<typeof logoVariants> & Styled;

export const Logo = ({ className, tone }: LogoProps) => {
  const { mark, root, salmon, strong, wordmark } = logoVariants({ tone });

  return (
    <span className={root({ className })}>
      <svg
        aria-hidden="true"
        className={mark()}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
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
          className={salmon()}
          fill="#F2A79E"
          height="24"
          rx="7"
          transform="rotate(45 24.5 17)"
          width="14"
          x="17.5"
          y="5"
        />
      </svg>

      <span className={wordmark()}>
        Open<span className={strong()}>CPR</span>
      </span>
    </span>
  );
};
