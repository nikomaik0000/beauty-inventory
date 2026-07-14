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
import { ArrowUpDown, Calendar, Package, PackageOpen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteProduct } from "@/app/actions/products";
import { formatCapacity, formatExpirationCompact } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/types";

const columnHelper = createColumnHelper<ProductWithRelations>();

/** Columns: 商品 · 品牌 · 容量 · 庫存 · 效期 · 開封 (+ an actions column
 * for edit/delete, which isn't a data field). Category and the opened
 * text badge were dropped — unnecessary in a compact overview; category
 * is still fully editable per-product in the edit form and still drives
 * search/filtering on the frontend. */
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
        cell: (info) => <span>{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: "expiration",
        header: "效期",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-textSecondary">
            <Calendar size={14} strokeWidth={1.75} />
            {formatExpirationCompact(row.original)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "opened",
        header: "開封",
        cell: ({ row }) => (
          <span className="flex justify-center text-textMuted" role="img" aria-label={row.original.opened ? "已開封" : "未開封"}>
            {row.original.opened ? <PackageOpen size={16} strokeWidth={1.75} /> : <Package size={16} strokeWidth={1.75} className="opacity-50" />}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/admin/products/${row.original.id}/edit`}
              className="flex h-9 w-9 items-center justify-center rounded-input text-textSecondary hover:bg-surfaceMuted"
              aria-label="編輯商品"
            >
              <Pencil size={16} strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              disabled={pending && deletingId === row.original.id}
              onClick={() => {
                if (!confirm(`確定要刪除「${row.original.name}」嗎？此操作無法復原。`)) return;
                setDeletingId(row.original.id);
                startTransition(() => deleteProduct(row.original.id));
              }}
              className="flex h-9 w-9 items-center justify-center rounded-input text-textSecondary hover:bg-dangerSoft hover:text-danger disabled:opacity-50"
              aria-label="刪除商品"
            >
              <Trash2 size={16} strokeWidth={1.75} />
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
      {/* Tablet / desktop: a fluid table-fixed layout (no forced
          min-width), so it fits the available width naturally instead
          of needing a horizontal scrollbar. Headers use the same CJK
          serif family as the product title, with a touch of letter
          spacing, per the Phase 4C typography spec. */}
      <div className="hidden lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col style={{ width: "26%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="h-11 border-b border-divider">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="truncate px-4 align-middle text-xs font-medium tracking-wide text-textMuted"
                    style={{ fontFamily: "var(--font-serif-cjk)" }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-textPrimary disabled:cursor-default"
                        disabled={!header.column.getCanSort()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <ArrowUpDown size={11} strokeWidth={1.75} />}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="h-12 border-b border-divider last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="truncate px-4 align-middle">
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
          const capacityText = formatCapacity(p.capacity);
          return (
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-textPrimary">{p.name}</p>
                  {p.brand?.name && <p className="mt-0.5 truncate text-xs text-textSecondary">{p.brand.name}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="flex h-9 w-9 items-center justify-center rounded-input text-textSecondary hover:bg-surfaceMuted"
                    aria-label="編輯商品"
                  >
                    <Pencil size={16} strokeWidth={1.75} />
                  </Link>
                  <button
                    type="button"
                    disabled={pending && deletingId === p.id}
                    onClick={() => {
                      if (!confirm(`確定要刪除「${p.name}」嗎？此操作無法復原。`)) return;
                      setDeletingId(p.id);
                      startTransition(() => deleteProduct(p.id));
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-input text-textSecondary hover:bg-dangerSoft hover:text-danger disabled:opacity-50"
                    aria-label="刪除商品"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-textSecondary">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} strokeWidth={1.75} />
                  {formatExpirationCompact(p)}
                </span>
                <span>{capacityText ? `${capacityText} · ` : ""}{p.quantity}</span>
                <span className="text-textMuted" role="img" aria-label={p.opened ? "已開封" : "未開封"}>
                  {p.opened ? <PackageOpen size={14} strokeWidth={1.75} /> : <Package size={14} strokeWidth={1.75} className="opacity-50" />}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
