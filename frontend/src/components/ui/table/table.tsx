import type { ComponentProps } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type OnChangeFn,
  type PaginationState,
  type Table as TableProps,
  type TableOptions,
  useReactTable,
} from "@tanstack/react-table";
import { tv } from "tailwind-variants";

const tableVariants = tv({
  slots: {
    wrapper: "relative w-full overflow-x-auto rounded-md border",
    root: "w-full caption-bottom text-sm",
    header: "[&_tr]:border-b",
    body: "[&_tr:last-child]:border-0",
    footer: "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
    row: "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
    cell: "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
    head: "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
    caption: "mt-4 text-sm text-muted-foreground",
    skeleton: "h-3 animate-pulse rounded-md bg-muted",
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

const Skeleton = ({ columnsLength, pageSize }: { columnsLength: number; pageSize: number }) => {
  const rows = Array.from({ length: pageSize }, (_, index) => {
    return (
      <Row key={index}>
        {Array.from({ length: columnsLength }, (_, idx) => {
          return (
            <Cell className="h-12" key={idx}>
              <div className={skeleton()} />
            </Cell>
          );
        })}
      </Row>
    );
  });

  return rows;
};

export type UseTableProps<T> = Omit<TableOptions<T>, "getCoreRowModel">;

export const useTable = <T,>({ columns, data, ...props }: UseTableProps<T>) => {
  return useReactTable({
    data,
    columns,
    ...props,

    ...(props.state?.pagination
      ? { getPaginationRowModel: getPaginationRowModel(), manualPagination: true }
      : {}),

    getCoreRowModel: getCoreRowModel(),
  });
};

export const Table = { Body, Caption, Cell, Footer, Head, Header, Root, Row, Skeleton };

export { createColumnHelper, flexRender, type OnChangeFn, type PaginationState, type TableProps };
