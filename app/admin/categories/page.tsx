"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { AddEntityForm } from "@/components/admin/add-entity-form";
import { MobileSwipeActionRow } from "@/components/mobile-swipe-action-row";
import { Input } from "@/components/ui/input";
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  renameCategory,
  renameSubcategory,
} from "@/app/actions/taxonomy";
import { createClient } from "@/lib/supabase/client";
import { formatCapacity, volumeContribution } from "@/lib/utils";
import type { Category, Subcategory } from "@/lib/types";

interface SubcategorySummary {
  count: number;
  totalCapacity: number;
}

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [summaryBySubcategory, setSummaryBySubcategory] = useState<Record<string, SubcategorySummary>>({});
  const [loading, setLoading] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState("");
  const [newSubName, setNewSubName] = useState<Record<string, string>>({});

  async function refresh() {
    const supabase = createClient();
    const [{ data: cats }, { data: subs }, { data: products }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("subcategories").select("*").order("sort_order"),
      supabase.from("products").select("subcategory_id, capacity, quantity"),
    ]);
    setCategories(cats ?? []);
    setSubcategories(subs ?? []);

    // Total Capacity per subcategory — recomputed from the live product
    // set every time products are added/edited/deleted. Matches the
    // homepage summary's formula exactly (volumeContribution: volume ×
    // stock, not just volume), via the same shared helper.
    const summary: Record<string, SubcategorySummary> = {};
    for (const p of products ?? []) {
      if (!p.subcategory_id) continue;
      const entry = summary[p.subcategory_id] ?? { count: 0, totalCapacity: 0 };
      entry.count += 1;
      entry.totalCapacity += volumeContribution(p);
      summary[p.subcategory_id] = entry;
    }
    setSummaryBySubcategory(summary);

    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return null;

  return (
    <div className="w-full min-w-0">
      <h1 className="mb-5 text-xl font-semibold text-textPrimary">分類</h1>

      <AddEntityForm
        placeholder="新的大分類名稱（例如：彩妝）"
        onAdd={async (name) => {
          await createCategory(name);
          await refresh();
        }}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="overflow-hidden rounded-card border border-border bg-surface p-6 shadow-card">
            {editingCategoryId === category.id ? (
              <div className="flex min-h-11 items-center justify-between gap-2 sm:min-h-0">
                <div className="flex flex-1 items-center gap-2">
                  <Input value={categoryDraft} onChange={(e) => setCategoryDraft(e.target.value)} className="h-8" autoFocus />
                  <button
                    type="button"
                    aria-label="儲存大分類名稱"
                    onClick={async () => {
                      const name = categoryDraft.trim();
                      if (!name) return;
                      await renameCategory(category.id, name);
                      setEditingCategoryId(null);
                      await refresh();
                    }}
                    className="text-success"
                  >
                    <Check size={14} strokeWidth={1.75} />
                  </button>
                  <button type="button" aria-label="取消" onClick={() => setEditingCategoryId(null)} className="text-textMuted">
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ) : (
              <MobileSwipeActionRow
                itemId={`category:${category.id}`}
                itemLabel={category.name}
                onEdit={() => {
                  setEditingCategoryId(category.id);
                  setCategoryDraft(category.name);
                }}
                onDelete={async () => {
                  if (!confirm(`確定要刪除「${category.name}」及其所有小分類嗎？`)) return;
                  await deleteCategory(category.id);
                  await refresh();
                }}
                contentClassName="flex min-h-11 items-center justify-between gap-2 sm:min-h-0"
              >
                <h2 className="text-base font-medium text-textPrimary">{category.name}</h2>
                <div className="hidden items-center gap-1 sm:flex">
                  <button
                    type="button"
                    aria-label={`重新命名 ${category.name}`}
                    onClick={() => {
                      setEditingCategoryId(category.id);
                      setCategoryDraft(category.name);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-input text-textSecondary hover:bg-surfaceMuted"
                  >
                    <Pencil size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    aria-label={`刪除 ${category.name}`}
                    onClick={async () => {
                      if (!confirm(`確定要刪除「${category.name}」及其所有小分類嗎？`)) return;
                      await deleteCategory(category.id);
                      await refresh();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-input text-textSecondary hover:bg-dangerSoft hover:text-danger"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </MobileSwipeActionRow>
            )}

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_3.25rem_5rem] items-center gap-x-2 border-b border-divider px-2.5 pb-2 text-xs font-medium tracking-[0.5px] text-textMuted sm:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_5.25rem] sm:gap-x-4">
              <span>分類</span>
              <span className="text-right">商品</span>
              <span className="text-right">容量</span>
              <span aria-hidden="true" className="hidden sm:block" />
            </div>
            <ul>
              {subcategories
                .filter((s) => s.category_id === category.id)
                .map((sub) => (
                  <li key={sub.id} className="overflow-hidden border-b border-divider text-sm last:border-b-0">
                    {editingSubId === sub.id ? (
                      <div className="flex min-h-11 flex-1 items-center gap-2 px-2.5 py-1.5 sm:min-h-0">
                        <Input value={subDraft} onChange={(e) => setSubDraft(e.target.value)} className="h-7" autoFocus />
                        <button
                          type="button"
                          aria-label="儲存小分類名稱"
                          onClick={async () => {
                            const name = subDraft.trim();
                            if (!name) return;
                            await renameSubcategory(sub.id, name);
                            setEditingSubId(null);
                            await refresh();
                          }}
                          className="text-success"
                        >
                          <Check size={14} strokeWidth={1.75} />
                        </button>
                        <button type="button" aria-label="取消" onClick={() => setEditingSubId(null)} className="text-textMuted">
                          <X size={14} strokeWidth={1.75} />
                        </button>
                      </div>
                    ) : (
                      <MobileSwipeActionRow
                        itemId={`subcategory:${sub.id}`}
                        itemLabel={sub.name}
                        onEdit={() => {
                          setEditingSubId(sub.id);
                          setSubDraft(sub.name);
                        }}
                        onDelete={async () => {
                          if (!confirm(`確定要刪除「${sub.name}」嗎？`)) return;
                          await deleteSubcategory(sub.id);
                          await refresh();
                        }}
                        contentClassName="grid min-h-14 grid-cols-[minmax(0,1fr)_3.25rem_5rem] items-center gap-x-2 px-2.5 hover:bg-surfaceMuted sm:min-h-[60px] sm:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_5.25rem] sm:gap-x-4"
                      >
                        <span className="min-w-0 truncate tracking-[0.5px] text-textSecondary">{sub.name}</span>
                        <span className="text-right text-xs font-medium tabular-nums text-textMuted">{summaryBySubcategory[sub.id]?.count ?? 0}</span>
                        <span className="text-right text-xs font-medium tabular-nums text-textMuted">{formatCapacity(summaryBySubcategory[sub.id]?.totalCapacity ?? 0) || "—"}</span>
                        <div className="hidden items-center justify-end gap-1 sm:flex">
                          <button
                            type="button"
                            aria-label={`重新命名 ${sub.name}`}
                            onClick={() => {
                              setEditingSubId(sub.id);
                              setSubDraft(sub.name);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded text-textMuted hover:text-textPrimary"
                          >
                            <Pencil size={14} strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            aria-label={`刪除 ${sub.name}`}
                            onClick={async () => {
                              if (!confirm(`確定要刪除「${sub.name}」嗎？`)) return;
                              await deleteSubcategory(sub.id);
                              await refresh();
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded text-textMuted hover:text-danger"
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        </div>
                      </MobileSwipeActionRow>
                    )}
                  </li>
                ))}
            </ul>

            <div className="mt-5 flex gap-2">
              <Input
                value={newSubName[category.id] ?? ""}
                onChange={(e) => setNewSubName((prev) => ({ ...prev, [category.id]: e.target.value }))}
                placeholder="新的小分類"
                className="h-8"
                onKeyDown={async (e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const name = (newSubName[category.id] ?? "").trim();
                  if (!name) return;
                  await createSubcategory(category.id, name);
                  setNewSubName((prev) => ({ ...prev, [category.id]: "" }));
                  await refresh();
                }}
              />
              <button
                type="button"
                aria-label="新增小分類"
                onClick={async () => {
                  const name = (newSubName[category.id] ?? "").trim();
                  if (!name) return;
                  await createSubcategory(category.id, name);
                  setNewSubName((prev) => ({ ...prev, [category.id]: "" }));
                  await refresh();
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-input border border-border text-textSecondary hover:bg-surfaceMuted"
              >
                <Plus size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
