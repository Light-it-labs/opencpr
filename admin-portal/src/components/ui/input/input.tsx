import { type ComponentProps, type ReactNode } from "react";
import { tv } from "tailwind-variants";

import { IconWrapper } from "@/components/ui/icons";
import { SIZE, type Styled } from "@/types/styles";

const inputVariants = tv({
  slots: {
    container: "relative flex w-full flex-col gap-1.5",
    input:
      "flex h-8 w-full rounded-md border border-border-default-default px-3 py-0 text-base text-text-default-default transition-colors placeholder:text-text-default-tertiary focus-visible:outline-border-brand-default disabled:cursor-not-allowed disabled:bg-background-disabled-default disabled:text-text-disabled-on-disabled md:text-sm",
    wrapper: "relative flex flex-row items-center rounded-md",
    leftIcon:
      "pointer-events-none absolute top-1/2 left-2 flex -translate-y-1/2 items-center text-text-default-default",
    rightIcon:
      "absolute top-1/2 right-2 flex -translate-y-1/2 items-center text-text-default-default",
  },
  variants: {
    left: {
      true: { input: "pl-9" },
    },
    right: {
      true: { input: "pr-9" },
    },
  },
});

const { container, input, leftIcon, rightIcon, wrapper } = inputVariants();

type InputProps = {
  containerClassName?: string;
  left?: ReactNode;
  right?: ReactNode;
} & Omit<ComponentProps<"input">, "size"> &
  Styled;

export const Input = ({ className, containerClassName, left, right, ...props }: InputProps) => {
  return (
    <div className={container({ className: containerClassName })}>
      <div className={wrapper()}>
        {left ? (
          <IconWrapper className={leftIcon()} size={SIZE.SMALL}>
            {left}
          </IconWrapper>
        ) : null}

        <input
          className={input({ className, left: Boolean(left), right: Boolean(right) })}
          data-slot="input"
          {...props}
        />

        {right ? (
          <IconWrapper className={rightIcon()} size={SIZE.SMALL}>
            {right}
          </IconWrapper>
        ) : null}
      </div>
    </div>
  );
};
