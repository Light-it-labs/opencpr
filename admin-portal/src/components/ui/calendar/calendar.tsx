import type { ComponentProps } from "react";
import { useEffect, useRef } from "react";
import { type DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "tailwind-variants";

import { Button, buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";

export const Calendar = ({
  captionLayout = "label",
  className,
  classNames,
  components,
  formatters,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) => {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn(
        "group/calendar bg-background-default-default p-3 [--cell-size:--spacing(8)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-2 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-2", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: "plainText" }),
          "size-6 p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "plainText" }),
          "size-6 p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex w-full items-center justify-center",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-md border border-border-default-default shadow-xs has-focus:border-border-brand-default has-focus:ring-[3px] has-focus:ring-border-brand-default/50",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 bg-background-default-default opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex w-full items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-text-default-secondary",
          defaultClassNames.caption_label,
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex gap-2", defaultClassNames.weekdays),
        weekday: cn(
          defaultClassNames.weekday,
          "flex-1 rounded-md text-sm font-normal text-text-default-secondary select-none",
        ),
        week: cn("mt-3 flex w-full gap-1", defaultClassNames.week),
        week_number_header: cn("select-none", defaultClassNames.week_number_header),
        week_number: cn(defaultClassNames.week_number, "text-text-default-secondary select-none"),
        day: cn(
          defaultClassNames.day,
          "group/day relative aspect-square size-full p-0 text-center text-sm select-none [&:last-child[data-selected=true]_button]:rounded-r-md",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
        ),
        range_start: cn("rounded-l-md bg-background-brand-tertiary", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-background-brand-tertiary", defaultClassNames.range_end),
        today: cn(
          defaultClassNames.today,
          "rounded-md bg-background-brand-tertiary text-text-brand-on-brand-tertiary data-[selected=true]:rounded-none",
        ),
        outside: cn(
          defaultClassNames.outside,
          "text-text-default-secondary aria-selected:text-text-default-secondary",
        ),
        disabled: cn(defaultClassNames.disabled, "text-text-default-secondary opacity-50"),
        hidden: cn(defaultClassNames.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div ref={rootRef} className={cn(className)} data-slot="calendar" {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <Icons.ChevronLeft className={cn("size-4", className)} {...props} />;
          }

          if (orientation === "right") {
            return <Icons.ChevronRight className={cn("size-4", className)} {...props} />;
          }

          return <Icons.ChevronDown className={cn("size-4", className)} {...props} />;
        },
        DayButton: ({ className, day, modifiers, ...props }: ComponentProps<typeof DayButton>) => {
          const ref = useRef<HTMLButtonElement>(null);
          useEffect(() => {
            if (modifiers.focused) {
              ref.current?.focus();
            }
          }, [modifiers.focused]);

          return (
            <Button
              ref={ref}
              className={cn(
                "flex aspect-square size-auto w-full min-w-6 flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-border-brand-default group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-border-brand-default/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-background-brand-default data-[range-end=true]:text-text-brand-on-brand data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-background-brand-tertiary data-[range-middle=true]:text-text-brand-on-brand-tertiary data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-background-brand-default data-[range-start=true]:text-text-brand-on-brand data-[selected-single=true]:bg-background-brand-default data-[selected-single=true]:text-text-brand-on-brand data-[slot=button]:hover:bg-background-brand-tertiary data-[slot=button]:hover:text-text-brand-on-brand-tertiary dark:hover:text-text-brand-on-brand [&>span]:text-xs [&>span]:opacity-70",
                defaultClassNames.day,
                className,
              )}
              data-day={day.date.toLocaleDateString()}
              data-range-end={modifiers.range_end}
              data-range-middle={modifiers.range_middle}
              data-range-start={modifiers.range_start}
              data-selected-single={
                modifiers.selected && !modifiers.range_start && !modifiers.range_end
                  ? !modifiers.range_middle
                  : null
              }
              size="icon"
              variant="plainText"
              {...props}
            />
          );
        },
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-6 items-center justify-center text-center">{children}</div>
            </td>
          );
        },
        ...components,
      }}
      formatters={{
        formatMonthDropdown: (date) => {
          return format(date, "LLLL");
        },
        ...formatters,
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
};
