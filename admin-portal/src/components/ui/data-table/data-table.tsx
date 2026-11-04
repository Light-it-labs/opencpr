import type { ReactNode } from "react";
import { flexRender, type ReactTable as TableProps, type RowData } from "@tanstack/react-table";

import { Pagination, Table, type TableFeatureSet } from "@/components/ui/table";
import type { AvailableRoutesId } from "@/config/router";
import { SearchTextInput } from "./search-text-input";
import { SortableHead } from "./sortable-head";
import { ViewOptions } from "./view-options";

const NO_MATCHING_RESULTS_MESSAGE = "No results match these filters";

type BaseDataTableProps<T extends RowData> = {
  isLoading?: boolean;
  table: TableProps<TableFeatureSet, T>;
  withColumnVisibility?: boolean;
  inputPlaceholder?: string;
  emptyMessage?: string;
  hasActiveFilters?: boolean;
  sortable?: boolean;
  actions?: ReactNode;
};

type DataTablePropsWithSearch = {
  withSearch: true;
  path: AvailableRoutesId;
};

type DataTablePropsWithoutSearch = {
  withSearch?: false;
  path?: never;
};

type DataTableProps<T extends RowData> = BaseDataTableProps<T> &
  (DataTablePropsWithSearch | DataTablePropsWithoutSearch);

export const DataTable = <T extends RowData>({
  actions,
  emptyMessage = "No results",
  hasActiveFilters = false,
  inputPlaceholder,
  isLoading,
  path,
  sortable = true,
  table,
  withColumnVisibility = false,
  withSearch = false,
}: DataTableProps<T>) => {
  const showSkeleton = isLoading;
  const showEmptyState = !isLoading && !table.getRowModel().rows?.length;
  const showTableContent = !isLoading && table.getRowModel().rows?.length;

  return (
    <div className="flex w-full flex-col gap-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2 sm:flex-nowrap">
        {withSearch && path ? <SearchTextInput path={path} placeholder={inputPlaceholder} /> : null}
        {actions}
        {withColumnVisibility ? <ViewOptions table={table} /> : null}
      </div>

      <Table.Root>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return <SortableHead key={header.id} header={header} sortable={sortable} />;
                })}
              </Table.Row>
            );
          })}
        </Table.Header>

        <Table.Body>
          {showSkeleton ? (
            <Table.Skeleton
              columnsLength={table.getAllColumns().length}
              pageSize={table.state.pagination.pageSize}
            />
          ) : null}

          {showTableContent
            ? table.getRowModel().rows.map((row) => {
                return (
                  <Table.Row key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <Table.Cell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      );
                    })}
                  </Table.Row>
                );
              })
            : null}

          {showEmptyState ? (
            <Table.Row>
              <Table.Cell className="h-24 text-center" colSpan={table.getAllColumns().length}>
                {hasActiveFilters ? NO_MATCHING_RESULTS_MESSAGE : emptyMessage}
              </Table.Cell>
            </Table.Row>
          ) : null}
        </Table.Body>
      </Table.Root>

      {table.options.manualPagination ? (
        <Pagination
          isLoading={isLoading}
          page={table.state.pagination.pageIndex + 1}
          pageSize={table.state.pagination.pageSize}
          totalItems={table.options.meta?.totalItems ?? 0}
          totalPages={table.getPageCount()}
          onPageChange={(next: number) => {
            return table.setPageIndex(next - 1);
          }}
        />
      ) : null}
    </div>
  );
};
