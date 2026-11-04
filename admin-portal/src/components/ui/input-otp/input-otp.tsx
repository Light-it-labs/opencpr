import { type ComponentProps, useContext } from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { tv } from "tailwind-variants";

import { Icons } from "@/components/ui/icons";

const inputOtpVariants = tv({
  slots: {
    root: "disabled:cursor-not-allowed",
    container: "flex items-center gap-2 has-disabled:opacity-50",
    group: "flex items-center",
    slot: "relative flex size-9 items-center justify-center border-y border-r border-border-default-default text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md aria-invalid:border-border-destructive-default data-[active=true]:z-10 data-[active=true]:border-border-brand-default data-[active=true]:ring-[3px] data-[active=true]:ring-border-brand-default/50 data-[active=true]:aria-invalid:border-border-destructive-default data-[active=true]:aria-invalid:ring-border-destructive-default/20 dark:bg-background-default-secondary/30 dark:data-[active=true]:aria-invalid:ring-border-destructive-default/40",
    caretWrapper: "pointer-events-none absolute inset-0 flex items-center justify-center",
    caret: "h-4 w-0.5 animate-caret-blink bg-black duration-1000",
  },
});

const { caret, caretWrapper, container, group, root, slot } = inputOtpVariants();

const Root = ({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) => {
  return (
    <OTPInput
      className={root({ className })}
      containerClassName={container({ className: containerClassName })}
      data-slot="input-otp"
      {...props}
    />
  );
};

const Group = ({ className, ...props }: ComponentProps<"div">) => {
  return <div className={group({ className })} data-slot="input-otp-group" {...props} />;
};

const Slot = ({ className, index, ...props }: ComponentProps<"div"> & { index: number }) => {
  const inputOTPContext = useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      className={slot({ className })}
      data-active={isActive}
      data-slot="input-otp-slot"
      {...props}
    >
      {char}
      {hasFakeCaret ? <Caret /> : null}
    </div>
  );
};

const Caret = () => {
  return (
    <div className={caretWrapper()}>
      <div className={caret()} />
    </div>
  );
};

const Separator = (props: ComponentProps<"div">) => {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <Icons.Minus />
    </div>
  );
};

export const InputOtp = {
  Root,
  Group,
  Slot,
  Separator,
};
