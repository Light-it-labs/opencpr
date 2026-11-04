import type { ComponentProps } from "react";
import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  type PaginationState,
  type RowData,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  type TableOptions,
  useTable as useReactTable,
} from "@tanstack/react-table";
import { tv } from "tailwind-variants";

const tableVariants = tv({
  slots: {
    wrapper: "relative w-full overflow-x-auto rounded-md border border-border-default-default",
    root: "w-full caption-bottom text-sm",
    header: "[&_tr]:border-b [&_tr]:border-border-default-default",
    body: "[&_tr:last-child]:border-0",
    footer:
      "border-t border-border-default-default bg-background-default-hover font-medium [&>tr]:last:border-b-0",
    row: "border-b border-border-default-default transition-colors hover:bg-background-default-hover data-[state=selected]:bg-background-default-hover",
    cell: "p-2 align-middle whitespace-nowrap has-[[role=checkbox]]:pr-0 *:[[role=checkbox]]:translate-y-0.5",
    head: "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-text-default-secondary has-[[role=checkbox]]:pr-0 *:[[role=checkbox]]:translate-y-0.5",
    caption: "mt-4 text-sm text-text-default-secondary",
    skeleton: "h-3 animate-pulse rounded-md bg-background-default-tertiary",
  },
});

const { body, caption, cell, footer, head, header, root, row, skeleton, wrapper } = tableVariants();

const Root = ({ className, ...props }: ComponentProps<"table">) => {
  return (
    <div className={wrapper()} data-slot="table-container">
      <table className={root({ className })} data-slot="table" {...props} />
    </div>
  );
};

const Header = ({ className, ...props }: ComponentProps<"thead">) => {
  return <thead className={header({ className })} data-slot="table-header" {...props} />;
};

const Body = ({ className, ...props }: ComponentProps<"tbody">) => {
  return <tbody className={body({ className })} data-slot="table-body" {...props} />;
};

const Footer = ({ className, ...props }: ComponentProps<"tfoot">) => {
  return <tfoot className={footer({ className })} data-slot="table-footer" {...props} />;
};

const Row = ({ className, ...props }: ComponentProps<"tr">) => {
  return <tr className={row({ className })} data-slot="table-row" {...props} />;
};

const Head = ({ className, ...props }: ComponentProps<"th">) => {
  return <th className={head({ className })} data-slot="table-head" {...props} />;
};

const Cell = ({ className, ...props }: ComponentProps<"td">) => {
  return <td className={cell({ className })} data-slot="table-cell" {...props} />;
};

const Caption = ({ className, ...props }: ComponentProps<"caption">) => {
  return <caption className={caption({ className })} data-slot="table-caption" {...props} />;
};

const DEFAULT_SKELETON_ROWS = 10;

const Skeleton = ({ columnsLength, pageSize }: { columnsLength: number; pageSize: number }) => {
  const rowsLength = Number.isFinite(pageSize) ? pageSize : DEFAULT_SKELETON_ROWS;

  return Array.from({ length: rowsLength }, (_, index) => {
    return index;
  }).map((rowValue) => {
    return (
      <Row key={`skeleton-row-${rowValue}`}>
        {Array.from({ length: columnsLength }, (_, index) => {
          return index;
        }).map((colValue) => {
          return (
            <Cell key={`skeleton-cell-${rowValue}-${colValue}`} className="h-12">
              <div className={skeleton()} />
            </Cell>
          );
        })}
      </Row>
    );
  });
};

export const tableFeatureSet = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

export type TableFeatureSet = typeof tableFeatureSet;

export type UseTableProps<T extends RowData> = Omit<TableOptions<TableFeatureSet, T>, "features">;

const UNPAGINATED_STATE: PaginationState = { pageIndex: 0, pageSize: Infinity };

export const useTable = <T extends RowData>({ columns, data, ...props }: UseTableProps<T>) => {
  return useReactTable({
    data,
    columns,
    features: tableFeatureSet,
    sortDescFirst: false,
    ...props,

    initialState: {
      ...props.initialState,
      pagination: props.initialState?.pagination ?? UNPAGINATED_STATE,
    },

    ...(props.state?.pagination ? { manualPagination: true } : {}),

    ...(props.state?.sorting ? { manualSorting: true, enableSortingRemoval: false } : {}),
  });
};

export const Table = { Body, Caption, Cell, Footer, Head, Header, Root, Row, Skeleton };
