"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { AddEntityForm } from "@/components/admin/add-entity-form";
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
import type { Category, Subcategory } from "@/lib/types";

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subDraft, setSubDraft] = useState("");
  const [newSubName, setNewSubName] = useState<Record<string, string>>({});

  async function refresh() {
    const supabase = createClient();
    const [{ data: cats }, { data: subs }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("subcategories").select("*").order("sort_order"),
    ]);
    setCategories(cats ?? []);
    setSubcategories(subs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-serif text-xl font-semibold text-textPrimary">Categories</h1>
      <p className="mb-5 text-sm text-textMuted">
        Categories and subcategories are fully custom — add as many as your collection needs.
      </p>

      <AddEntityForm
        placeholder="New category name (e.g. Makeup)"
        onAdd={async (name) => {
          await createCategory(name);
          await refresh();
        }}
      />

      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category.id} className="rounded-card border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              {editingCategoryId === category.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input value={categoryDraft} onChange={(e) => setCategoryDraft(e.target.value)} className="h-8" autoFocus />
                  <button
                    type="button"
                    aria-label="Save category name"
                    onClick={async () => {
                      const name = categoryDraft.trim();
                      if (!name) return;
                      await renameCategory(category.id, name);
                      setEditingCategoryId(null);
                      await refresh();
                    }}
                    className="text-success"
                  >
                    <Check size={16} />
                  </button>
                  <button type="button" aria-label="Cancel" onClick={() => setEditingCategoryId(null)} className="text-textMuted">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-serif text-base font-medium text-textPrimary">{category.name}</h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Rename ${category.name}`}
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setCategoryDraft(category.name);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-textSecondary hover:bg-surfaceMuted"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${category.name}`}
                      onClick={async () => {
                        if (!confirm(`Delete "${category.name}" and all its subcategories?`)) return;
                        await deleteCategory(category.id);
                        await refresh();
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-textSecondary hover:bg-dangerSoft hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>

            <ul className="mt-3 space-y-1">
              {subcategories
                .filter((s) => s.category_id === category.id)
                .map((sub) => (
                  <li key={sub.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm hover:bg-surfaceMuted">
                    {editingSubId === sub.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input value={subDraft} onChange={(e) => setSubDraft(e.target.value)} className="h-7" autoFocus />
                        <button
                          type="button"
                          aria-label="Save subcategory name"
                          onClick={async () => {
                            const name = subDraft.trim();
                            if (!name) return;
                            await renameSubcategory(sub.id, name);
                            setEditingSubId(null);
                            await refresh();
                          }}
                          className="text-success"
                        >
                          <Check size={14} />
                        </button>
                        <button type="button" aria-label="Cancel" onClick={() => setEditingSubId(null)} className="text-textMuted">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-textSecondary">{sub.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Rename ${sub.name}`}
                            onClick={() => {
                              setEditingSubId(sub.id);
                              setSubDraft(sub.name);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded text-textMuted hover:text-textPrimary"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${sub.name}`}
                            onClick={async () => {
                              if (!confirm(`Delete "${sub.name}"?`)) return;
                              await deleteSubcategory(sub.id);
                              await refresh();
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded text-textMuted hover:text-danger"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
            </ul>

            <div className="mt-2 flex gap-2">
              <Input
                value={newSubName[category.id] ?? ""}
                onChange={(e) => setNewSubName((prev) => ({ ...prev, [category.id]: e.target.value }))}
                placeholder="New subcategory"
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
                aria-label="Add subcategory"
                onClick={async () => {
                  const name = (newSubName[category.id] ?? "").trim();
                  if (!name) return;
                  await createSubcategory(category.id, name);
                  setNewSubName((prev) => ({ ...prev, [category.id]: "" }));
                  await refresh();
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-textSecondary hover:bg-surfaceMuted"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
