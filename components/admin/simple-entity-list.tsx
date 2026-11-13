"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SimpleEntityList({
  items,
  onRename,
  onDelete,
  emptyLabel,
}: {
  items: { id: string; name: string }[];
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyLabel: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border p-8 text-center text-sm text-textMuted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex min-w-0 items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-2.5 shadow-card"
        >
          {editingId === item.id ? (
            <>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-8 min-w-0 flex-1"
                autoFocus
              />
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="儲存"
                  disabled={pending}
                  onClick={() => {
                    const name = draft.trim();
                    if (!name) return;
                    startTransition(async () => {
                      await onRename(item.id, name);
                      setEditingId(null);
                    });
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-input text-success hover:bg-surfaceMuted"
                >
                  <Check size={14} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label="取消"
                  onClick={() => setEditingId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-input text-textMuted hover:bg-surfaceMuted"
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="min-w-0 truncate text-sm text-textPrimary">{item.name}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`重新命名 ${item.name}`}
                  onClick={() => {
                    setEditingId(item.id);
                    setDraft(item.name);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-input text-textSecondary hover:bg-surfaceMuted"
                >
                  <Pencil size={14} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label={`刪除 ${item.name}`}
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`確定要刪除「${item.name}」嗎？使用中的商品會保留其他資料。`)) return;
                    startTransition(() => onDelete(item.id));
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-input text-textSecondary hover:bg-dangerSoft hover:text-danger"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
