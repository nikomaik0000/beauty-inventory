"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/actions/products";
import { formatCategoryPath, formatExpiration, getExpirationStatus } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/types";

const statusTone = {
  expired: "danger",
  urgent: "danger",
  soon: "warning",
  ok: "default",
  none: "muted",
  unknown: "muted",
} as const;

const columnHelper = createColumnHelper<ProductWithRelations>();

export function ProductTable({ products }: { products: ProductWithRelations[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product",
        cell: (info) => <span className="font-medium text-textPrimary">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => formatCategoryPath(row.category?.name, row.subcategory?.name), {
        id: "category",
        header: "Category",
        cell: (info) => <span className="text-textSecondary">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.brand?.name ?? "—", {
        id: "brand",
        header: "Brand",
      }),
      columnHelper.accessor("quantity", { header: "Qty" }),
      columnHelper.display({
        id: "expiration",
        header: "Expiration",
        cell: ({ row }) => {
          const status = getExpirationStatus(row.original);
          return <Badge tone={statusTone[status]}>{formatExpiration(row.original)}</Badge>;
        },
      }),
      columnHelper.display({
        id: "opened",
        header: "Status",
        cell: ({ row }) => (row.original.opened ? <Badge tone="muted">Opened</Badge> : <Badge tone="success">Unopened</Badge>),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/admin/products/${row.original.id}/edit`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-textSecondary hover:bg-surfaceMuted"
              aria-label="Edit product"
            >
              <Pencil size={14} />
            </Link>
            <button
              type="button"
              disabled={pending && deletingId === row.original.id}
              onClick={() => {
                if (!confirm(`Delete "${row.original.name}"? This can't be undone.`)) return;
                setDeletingId(row.original.id);
                startTransition(() => deleteProduct(row.original.id));
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-textSecondary hover:bg-dangerSoft hover:text-danger disabled:opacity-50"
              aria-label="Delete product"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      }),
    ],
    [pending, deletingId],
  );

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (products.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium text-textPrimary">No products yet</p>
        <p className="mt-1 text-xs text-textMuted">Add your first product to start tracking your inventory.</p>
        <Link href="/admin/products/new">
          <Button className="mt-4" size="sm">Add product</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-divider">
              {hg.headers.map((header) => (
                <th key={header.id} className="px-4 py-2.5 text-xs font-medium text-textMuted">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex items-center gap-1 hover:text-textPrimary disabled:cursor-default"
                      disabled={!header.column.getCanSort()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && <ArrowUpDown size={11} />}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-divider last:border-0 hover:bg-surfaceMuted/50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
