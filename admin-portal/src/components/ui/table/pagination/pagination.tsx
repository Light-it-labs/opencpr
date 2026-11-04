import { type ComponentProps } from "react";
import { tv } from "tailwind-variants";

import { Icons } from "@/components/ui/icons";
import type { Styled } from "@/types/styles";
import { PAGINATION_ITEM_TYPE } from "./get-pagination-items";
import { usePaginationRange } from "./use-pagination-range";

type ItemsCountProps = ComponentProps<"span"> & {
  page: number;
  pageSize: number;
  totalItems: number;
};

type ArrowButtonProps = ComponentProps<"li"> & {
  direction: "prev" | "next";
  disabled: boolean;
  onPageChange: (page: number) => void;
  page: number;
};

type PageButtonProps = ComponentProps<"li"> & {
  index: number;
  page: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

type EllipsisProps = ComponentProps<"span">;

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  isLoading?: boolean;
} & Styled;

const paginationVariants = tv({
  slots: {
    root: "flex flex-col-reverse items-end gap-y-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-y-0",
    pageCount: "text-sm text-text-default-secondary",
    arrowButton:
      "h-9 min-w-9 cursor-pointer rounded-md border border-border-default-default p-2 focus-visible:ring-4 focus-visible:ring-background-brand-default/25 focus-visible:outline-none active:bg-background-default-default",
    pageButton:
      "h-9 min-w-9 cursor-pointer rounded-md border border-border-default-default p-2 text-sm hover:bg-background-default-hover focus-visible:ring-4 focus-visible:ring-background-brand-default/25 focus-visible:outline-none active:bg-background-default-default",
    ellipsis: "self-end text-text-default-tertiary select-none",
    list: "flex items-center gap-1",
  },
  variants: {
    disabled: {
      true: {
        pageButton: "pointer-events-none opacity-50",
        arrowButton: "pointer-events-none opacity-50",
      },
      false: {
        arrowButton: "hover:bg-background-default-hover",
      },
    },
    active: {
      true: {
        pageButton:
          "border-background-brand-default bg-background-brand-default text-text-brand-on-brand shadow-sm hover:bg-background-brand-default active:bg-background-brand-default",
      },
      false: {},
    },
  },

  defaultVariants: { disabled: false, active: false },
});

const { arrowButton, ellipsis, list, pageButton, pageCount, root } = paginationVariants();

const Root = ({ className, ...props }: ComponentProps<"nav">) => {
  return <nav className={root({ className })} {...props} />;
};

const List = ({ className, ...props }: ComponentProps<"ul">) => {
  return <ul className={list({ className })} {...props} />;
};

const ItemsCount = ({ className, page, pageSize, totalItems, ...props }: ItemsCountProps) => {
  return (
    <span className={pageCount({ className })} {...props}>
      {`${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalItems)} from ${totalItems}`}
    </span>
  );
};

const ArrowButton = ({ direction, disabled, onPageChange, page }: ArrowButtonProps) => {
  const label = direction === "prev" ? "Previous page" : "Next page";

  return (
    <li>
      <button
        aria-label={label}
        className={arrowButton({ disabled })}
        disabled={disabled}
        type="button"
        onClick={() => {
          return onPageChange(direction === "next" ? page + 1 : page - 1);
        }}
      >
        {direction === "prev" ? <Icons.ChevronLeft /> : <Icons.ChevronRight />}
      </button>
    </li>
  );
};

const PageButton = ({ index, isLoading, onPageChange, page }: PageButtonProps) => {
  return (
    <li>
      <button
        aria-current={index === page ? "page" : undefined}
        aria-label={`Go to page ${index}`}
        className={pageButton({ disabled: isLoading, active: index === page })}
        disabled={isLoading}
        type="button"
        onClick={() => {
          return onPageChange(index);
        }}
      >
        {index}
      </button>
    </li>
  );
};

const Ellipsis = ({ className, ...props }: EllipsisProps) => {
  return (
    <span className={ellipsis({ className })} aria-hidden {...props}>
      ...
    </span>
  );
};

export const Pagination = ({
  className,
  isLoading = false,
  onPageChange,
  page,
  pageSize,
  totalItems,
  totalPages,
}: PaginationProps) => {
  const { isFirst, isLast, items } = usePaginationRange({ page, totalPages });

  if (totalPages < 2 && !totalItems) {
    return null;
  }

  return (
    <Root className={className}>
      <ItemsCount page={page} pageSize={pageSize} totalItems={totalItems} />

      <List>
        <ArrowButton
          direction="prev"
          disabled={isFirst || isLoading}
          page={page}
          onPageChange={onPageChange}
        />

        {items.map((item) => {
          const key = `${item.type}-${item.index}`;

          if (item.type === PAGINATION_ITEM_TYPE.PAGE_BUTTON) {
            return (
              <PageButton
                key={key}
                index={item.index}
                isLoading={isLoading}
                page={page}
                onPageChange={onPageChange}
              />
            );
          }

          if (item.type === PAGINATION_ITEM_TYPE.ELLIPSIS) {
            return <Ellipsis key={key} />;
          }

          return null;
        })}

        <ArrowButton
          direction="next"
          disabled={isLast || isLoading}
          page={page}
          onPageChange={onPageChange}
        />
      </List>
    </Root>
  );
};
