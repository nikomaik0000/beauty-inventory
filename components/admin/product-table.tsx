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
import { Card } from "@/components/ui/card";
import { deleteProduct } from "@/app/actions/products";
import { formatCapacity, formatCategoryPath, formatExpiration, getExpirationStatus } from "@/lib/utils";
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
        header: "商品",
        cell: (info) => <span className="font-medium text-textPrimary">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => formatCategoryPath(row.category?.name, row.subcategory?.name), {
        id: "category",
        header: "分類",
        cell: (info) => <span className="text-textSecondary">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.brand?.name ?? "—", {
        id: "brand",
        header: "品牌",
      }),
      columnHelper.accessor((row) => formatCapacity(row.capacity) ?? "—", {
        id: "capacity",
        header: "容量",
      }),
      columnHelper.accessor("quantity", {
        header: "庫存",
        cell: (info) => <span>×{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: "expiration",
        header: "截止日期",
        cell: ({ row }) => {
          const status = getExpirationStatus(row.original);
          return <Badge tone={statusTone[status]}>{formatExpiration(row.original)}</Badge>;
        },
      }),
      columnHelper.display({
        id: "opened",
        header: "狀態",
        cell: ({ row }) => (row.original.opened ? <Badge tone="muted">已開封</Badge> : <Badge tone="success">未開封</Badge>),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/admin/products/${row.original.id}/edit`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-textSecondary hover:bg-surfaceMuted"
              aria-label="編輯商品"
            >
              <Pencil size={14} />
            </Link>
            <button
              type="button"
              disabled={pending && deletingId === row.original.id}
              onClick={() => {
                if (!confirm(`確定要刪除「${row.original.name}」嗎？此操作無法復原。`)) return;
                setDeletingId(row.original.id);
                startTransition(() => deleteProduct(row.original.id));
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-textSecondary hover:bg-dangerSoft hover:text-danger disabled:opacity-50"
              aria-label="刪除商品"
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
        <p className="text-sm font-medium text-textPrimary">尚無商品</p>
        <p className="mt-1 text-xs text-textMuted">新增第一件商品，開始管理您的庫存。</p>
        <Link href="/admin/products/new">
          <Button className="mt-4" size="sm">新增商品</Button>
        </Link>
      </div>
    );
  }

  return (
    <Card>
      {/* Tablet / desktop: full data table inside a bounded scroll region. */}
      <div className="scroll-x-region hidden lg:block">
        <table className="w-full min-w-[780px] text-left text-sm">
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

      {/* Mobile: stacked rows, no fixed-width columns, so nothing can
          force horizontal scrolling on a phone. */}
      <ul className="divide-y divide-divider lg:hidden">
        {products.map((p) => {
          const status = getExpirationStatus(p);
          return (
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-textPrimary">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-textSecondary">
                    {p.brand?.name ? `${p.brand.name} · ` : ""}
                    {formatCategoryPath(p.category?.name, p.subcategory?.name)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-textSecondary hover:bg-surfaceMuted"
                    aria-label="編輯商品"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    type="button"
                    disabled={pending && deletingId === p.id}
                    onClick={() => {
                      if (!confirm(`確定要刪除「${p.name}」嗎？此操作無法復原。`)) return;
                      setDeletingId(p.id);
                      startTransition(() => deleteProduct(p.id));
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-textSecondary hover:bg-dangerSoft hover:text-danger disabled:opacity-50"
                    aria-label="刪除商品"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={statusTone[status]} className="text-[11px]">{formatExpiration(p)}</Badge>
                <span className="text-xs text-textMuted">
                  {formatCapacity(p.capacity) ? `${formatCapacity(p.capacity)} · ` : ""}×{p.quantity}
                </span>
                {p.opened ? <Badge tone="muted">已開封</Badge> : <Badge tone="success">未開封</Badge>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
