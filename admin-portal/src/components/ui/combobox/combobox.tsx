import { forwardRef, useId, useState } from "react";
import { cn } from "tailwind-variants";

import { Command } from "@/components/ui/command";
import { Icons } from "@/components/ui/icons";
import { Popover } from "@/components/ui/popover";
import type { Option } from "@/types/option";
import type { Styled } from "@/types/styles";

type ComboboxProps = {
  options: Option<string>[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
} & Styled;

export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      className,
      emptyMessage = "No results found.",
      onChange,
      options,
      placeholder = "Select option...",
      searchPlaceholder = "Search...",
      value,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const listboxId = useId();

    const selectedOption = options.find((option) => {
      return option.value === value;
    });

    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            aria-controls={listboxId}
            aria-expanded={open}
            className={cn(
              "flex h-8 min-w-full items-center justify-between gap-2 px-3 py-0",
              "rounded-md border border-border-default-default text-sm",
              "cursor-pointer transition-[color,box-shadow] outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            role="combobox"
            type="button"
          >
            <span
              className={cn(
                "line-clamp-1 text-left",
                !selectedOption && "text-text-default-tertiary",
              )}
            >
              {selectedOption?.label || placeholder}
            </span>
            <Icons.ChevronDown className="size-4 shrink-0 text-text-disabled-default" />
          </button>
        </Popover.Trigger>

        <Popover.Content align="start" className="w-(--radix-popover-trigger-width) p-0">
          <Command.Root id={listboxId}>
            <Command.Input placeholder={searchPlaceholder} />
            <Command.List>
              <Command.Empty>{emptyMessage}</Command.Empty>
              <Command.Group>
                {options.map((option) => {
                  return (
                    <Command.Item
                      key={option.value}
                      className={value === option.value ? "font-medium" : "font-normal"}
                      value={option.label}
                      onSelect={() => {
                        onChange?.(option.value);
                        setOpen(false);
                      }}
                    >
                      <Icons.Check
                        className={cn(
                          "size-4",
                          value === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {option.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    );
  },
);

Combobox.displayName = "Combobox";
