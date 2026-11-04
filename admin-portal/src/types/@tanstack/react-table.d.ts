/* eslint-disable @typescript-eslint/consistent-type-definitions -- Overriding interfaces for Meta types */
/* eslint-disable @typescript-eslint/no-unused-vars -- Declaration merging requires matching the library's generic parameter list */
import type { RowData, TableFeatures } from "@tanstack/react-table";

import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TFeatures extends TableFeatures, TData extends RowData, TValue> {
    stringifiedHeader?: string;
  }
  interface TableMeta<TFeatures extends TableFeatures, TData extends RowData> {
    totalItems: number;
  }
}
