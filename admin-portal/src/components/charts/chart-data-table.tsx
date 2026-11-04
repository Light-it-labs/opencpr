import { Table } from "@/components/ui/table";

type ChartDataTableRow = {
  cells: string[];
  key: string;
};

type ChartDataTableProps = {
  caption: string;
  headers: string[];
  rows: ChartDataTableRow[];
};

export const ChartDataTable = ({ caption, headers, rows }: ChartDataTableProps) => {
  return (
    <div className="sr-only">
      <Table.Root>
        <Table.Caption>{caption}</Table.Caption>

        <Table.Header>
          <Table.Row>
            {headers.map((header) => {
              return <Table.Head key={header}>{header}</Table.Head>;
            })}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {rows.map((row) => {
            return (
              <Table.Row key={row.key}>
                {row.cells.map((cell, index) => {
                  return <Table.Cell key={headers[index]}>{cell}</Table.Cell>;
                })}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </div>
  );
};
