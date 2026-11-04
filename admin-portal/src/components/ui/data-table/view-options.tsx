import type { Column, ReactTable, RowData } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import type { TableFeatureSet } from "@/components/ui/table";

type ViewOptionsProps<T extends RowData> = {
  table: ReactTable<TableFeatureSet, T>;
};

export const ViewOptions = <T extends RowData>({ table }: ViewOptionsProps<T>) => {
  const columns = table.getAllLeafColumns();

  const hidableColumns = columns.filter((column: Column<TableFeatureSet, T, unknown>) => {
    return column.getCanHide();
  });

  const visibleColumns = columns.filter((column: Column<TableFeatureSet, T, unknown>) => {
    return column.getIsVisible() && typeof column.columnDef.header === "string";
  });

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button className="sm:ml-auto" variant="elevated">
          Columns <Icons.ChevronDown />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end">
        {hidableColumns.map((column) => {
          const isLastColumnVisible = visibleColumns.length === 1 && column.getIsVisible();

          return (
            <DropdownMenu.CheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              className="capitalize"
              disabled={isLastColumnVisible}
              onCheckedChange={(value) => {
                return column.toggleVisibility(!!value);
              }}
            >
              {column.columnDef.meta?.stringifiedHeader || column.id}
            </DropdownMenu.CheckboxItem>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
