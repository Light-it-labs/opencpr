import { type ComponentProps, useId, useState } from "react";
import type { Matcher } from "react-day-picker";
import { addDays, differenceInCalendarDays, isSameDay, subDays } from "date-fns";
import { tv } from "tailwind-variants";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Icons } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import type { DateRangePreset } from "@/constants/date-range-presets";
import { formatDateRange } from "./format-date-range";

const dateRangePickerVariants = tv({
  slots: {
    trigger: [
      "flex w-full justify-between rounded-md border border-border-default-default shadow-none",
      "h-8 px-3 py-0 text-sm font-normal text-text-default-default transition-colors",
      "focus-visible:outline-border-brand-default data-[empty=true]:text-text-default-tertiary",
      "disabled:cursor-not-allowed disabled:bg-background-disabled-default disabled:text-text-disabled-on-disabled",
    ],
    content: "flex w-auto max-w-[calc(100vw-2rem)] flex-col p-0 md:flex-row",
    presets: [
      "flex flex-wrap gap-1 border-b border-border-default-default p-2",
      "md:w-40 md:flex-col md:flex-nowrap md:border-r md:border-b-0",
    ],
    preset: "justify-start whitespace-nowrap",
    body: "flex flex-col",
    footer: "flex justify-end gap-1 border-t border-border-default-default p-2",
  },
});

const { body, content, footer, preset, presets, trigger } = dateRangePickerVariants();

export type DateRangeValue = {
  from?: Date;
  to?: Date;
};

type DateRangePickerProps = {
  onChange: (range: DateRangeValue) => void;
  value: DateRangeValue;
  presets?: readonly DateRangePreset[];
  label?: string;
  labelId?: string;
  disabled?: Matcher | Matcher[];
  maxDays?: number;
  align?: ComponentProps<typeof Popover.Content>["align"];
  allowOpenEnd?: boolean;
  className?: string;
  placeholder?: string;
};

export const DateRangePicker = ({
  align = "start",
  allowOpenEnd = false,
  className,
  disabled,
  label,
  labelId,
  maxDays,
  onChange,
  placeholder = "Pick a range",
  presets: presetOptions,
  value,
}: DateRangePickerProps) => {
  const triggerId = useId();
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<Date>();
  const [hoveredDay, setHoveredDay] = useState<Date>();

  const valueText = value.from ? formatDateRange(value.from, value.to, allowOpenEnd) : placeholder;
  const hasValue = Boolean(value.from);

  const previewEnd = hoveredDay ?? pendingStart;
  const selected = pendingStart
    ? {
        from: previewEnd && previewEnd < pendingStart ? previewEnd : pendingStart,
        to: previewEnd && previewEnd < pendingStart ? pendingStart : previewEnd,
      }
    : { from: value.from, to: value.to };

  const maxDaysMatcher: Matcher[] =
    maxDays && pendingStart
      ? [
          { before: subDays(pendingStart, maxDays - 1) },
          { after: addDays(pendingStart, maxDays - 1) },
        ]
      : [];

  const disabledMatchers = [...maxDaysMatcher, ...(disabled ? [disabled].flat() : [])];

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setPendingStart(undefined);
    setHoveredDay(undefined);
  };

  const handleDaySelect = (day: Date) => {
    if (!pendingStart) {
      setPendingStart(day);
      setHoveredDay(day);

      return;
    }

    const isBackwards = differenceInCalendarDays(day, pendingStart) < 0;

    onChange(isBackwards ? { from: day, to: pendingStart } : { from: pendingStart, to: day });
    handleOpenChange(false);
  };

  const handlePresetSelect = (option: DateRangePreset) => {
    onChange(option.getRange());
    handleOpenChange(false);
  };

  const handleOpenEnd = () => {
    onChange({ from: pendingStart ?? value.from, to: undefined });
    handleOpenChange(false);
  };

  const handleClear = () => {
    onChange({ from: undefined, to: undefined });
    handleOpenChange(false);
  };

  const sameEdge = (a?: Date, b?: Date) => {
    return (!a && !b) || Boolean(a && b && isSameDay(a, b));
  };

  const isPresetActive = (option: DateRangePreset) => {
    const range = option.getRange();

    return sameEdge(range.from, value.from) && sameEdge(range.to, value.to);
  };

  return (
    <Popover.Root data-slot="date-range-picker" open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <Button
          aria-label={label ? `${label}: ${valueText}` : undefined}
          aria-labelledby={labelId ? `${labelId} ${triggerId}` : undefined}
          className={trigger({ className })}
          data-empty={!hasValue}
          data-slot="date-range-picker-trigger"
          id={triggerId}
          size="lg"
          variant="outlined"
        >
          {valueText}

          <Icons.ChevronDown />
        </Button>
      </Popover.Trigger>

      <Popover.Content align={align} className={content()}>
        {presetOptions?.length ? (
          <div className={presets()}>
            {presetOptions.map((option) => {
              return (
                <Button
                  key={option.label}
                  className={preset()}
                  size="sm"
                  variant={isPresetActive(option) ? "tertiary" : "plainText"}
                  onClick={() => {
                    return handlePresetSelect(option);
                  }}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        ) : null}

        <div className={body()}>
          <Calendar
            classNames={{ month: "flex w-full flex-col gap-2 not-first:hidden md:not-first:flex" }}
            defaultMonth={value.from}
            disabled={disabledMatchers}
            mode="range"
            numberOfMonths={2}
            selected={selected}
            onDayMouseEnter={(day) => {
              if (pendingStart) {
                setHoveredDay(day);
              }
            }}
            onSelect={(_range, day) => {
              return handleDaySelect(day);
            }}
          />

          {hasValue || pendingStart ? (
            <div className={footer()}>
              {allowOpenEnd ? (
                <Button size="sm" variant="plainText" onClick={handleOpenEnd}>
                  No end date
                </Button>
              ) : null}

              {hasValue ? (
                <Button size="sm" variant="plainText" onClick={handleClear}>
                  Clear
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
