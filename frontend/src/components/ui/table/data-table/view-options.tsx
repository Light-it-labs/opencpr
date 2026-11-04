import { Button, DropdownMenu, Icons, type TableProps } from "@/components/ui";
import { useTranslation } from "@/i18n";

type ViewOptionsProps<T> = {
  table: TableProps<T>;
};

export const ViewOptions = <T,>({ table }: ViewOptionsProps<T>) => {
  const { t } = useTranslation();

  const columns = table.getAllLeafColumns();

  const hidableColumns = columns.filter((column) => {
    return column.getCanHide();
  });

  const visibleColumns = columns.filter((column) => {
    return column.getIsVisible() && typeof column.columnDef.header === "string";
  });

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button className="sm:ml-auto" variant="outline">
          {t("table.filters.columns")} <Icons.ChevronDown />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end">
        {hidableColumns.map((column) => {
          const isLastColumnVisible = visibleColumns.length === 1 && column.getIsVisible();

          return (
            <DropdownMenu.CheckboxItem
              checked={column.getIsVisible()}
              className="capitalize"
              disabled={isLastColumnVisible}
              key={column.id}
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
