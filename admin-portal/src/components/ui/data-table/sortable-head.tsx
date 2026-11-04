import { flexRender, type Header, type RowData } from "@tanstack/react-table";
import { tv } from "tailwind-variants";

import { Icons } from "@/components/ui/icons";
import { Table, type TableFeatureSet } from "@/components/ui/table";

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

const sortableHead = tv({
  slots: {
    trigger:
      "inline-flex items-center gap-1 rounded-sm text-inherit hover:text-text-default-default focus-visible:ring-2 focus-visible:ring-text-brand-default focus-visible:outline-none",
    icon: "size-3.5 shrink-0",
  },
  variants: {
    isSorted: {
      true: { trigger: "text-text-default-default" },
      false: { icon: "text-text-default-tertiary" },
    },
  },
  defaultVariants: {
    isSorted: false,
  },
});

type SortableHeadProps<T extends RowData> = {
  header: Header<TableFeatureSet, T>;
  sortable: boolean;
};

export const SortableHead = <T extends RowData>({ header, sortable }: SortableHeadProps<T>) => {
  const { column } = header;
  const direction = column.getIsSorted();
  const canSort = sortable && column.getCanSort();
  const label = header.isPlaceholder
    ? null
    : flexRender(column.columnDef.header, header.getContext());

  if (!canSort) {
    return <Table.Head>{label}</Table.Head>;
  }

  const SortIcon = {
    asc: Icons.ArrowUp,
    desc: Icons.ArrowDown,
    none: Icons.ArrowUpDown,
  }[direction || "none"];
  const { icon, trigger } = sortableHead({ isSorted: Boolean(direction) });

  return (
    <Table.Head aria-sort={direction ? ARIA_SORT[direction] : "none"}>
      <button className={trigger()} type="button" onClick={column.getToggleSortingHandler()}>
        {label}
        <SortIcon className={icon()} />
      </button>
    </Table.Head>
  );
};
