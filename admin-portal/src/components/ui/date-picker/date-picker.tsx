import { type ComponentProps, useId } from "react";
import { format } from "date-fns";
import { tv } from "tailwind-variants";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Icons } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";

const datePickerVariants = tv({
  slots: {
    trigger: [
      "flex w-full justify-between rounded-md border border-border-default-default shadow-none",
      "h-8 px-3 py-0 text-sm font-normal text-text-default-default transition-colors",
      "focus-visible:outline-border-brand-default data-[empty=true]:text-text-default-tertiary",
      "disabled:cursor-not-allowed disabled:bg-background-disabled-default disabled:text-text-disabled-on-disabled",
    ],
  },
});

const { trigger } = datePickerVariants();

type DatePickerProps = {
  onChange: (date: Date | undefined) => void;
  value: Date | undefined;
  label?: string;
  labelId?: string;
  align?: ComponentProps<typeof Popover.Content>["align"];
} & Omit<ComponentProps<typeof Calendar>, "mode" | "onSelect" | "selected">;

export const DatePicker = ({
  align = "end",
  label,
  labelId,
  onChange,
  value,
  ...props
}: DatePickerProps) => {
  const triggerId = useId();
  const valueText = value ? format(value, "PPP") : "Pick a date";

  return (
    <Popover.Root data-slot="date-picker">
      <Popover.Trigger asChild>
        <Button
          aria-label={label ? `${label}: ${valueText}` : undefined}
          aria-labelledby={labelId ? `${labelId} ${triggerId}` : undefined}
          className={trigger()}
          data-empty={!value}
          data-slot="date-picker-trigger"
          id={triggerId}
          size="lg"
          variant="outlined"
        >
          {valueText}

          <Icons.ChevronDown />
        </Button>
      </Popover.Trigger>

      <Popover.Content align={align}>
        <Calendar
          defaultMonth={value}
          mode="single"
          selected={value}
          onSelect={onChange}
          {...props}
        />
      </Popover.Content>
    </Popover.Root>
  );
};
