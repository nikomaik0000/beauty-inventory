"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { productSchema, type ProductFormValues } from "@/lib/validations";
import { createProduct, updateProduct } from "@/app/actions/products";
import type { Category, ProductWithRelations, Subcategory } from "@/lib/types";

export function ProductForm({
  categories,
  subcategories,
  product,
}: {
  categories: Category[];
  subcategories: Subcategory[];
  product?: ProductWithRelations;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          brand_name: product.brand?.name ?? "",
          category_id: product.category_id,
          subcategory_id: product.subcategory_id,
          tag_names: product.tags.map((t) => t.name),
          image_url: product.image_url ?? "",
          expiration_type: product.expiration_type,
          expiration_date: product.expiration_date ?? "",
          opened: product.opened,
          opened_date: product.opened_date ?? "",
          pao_months: product.pao_months ?? "",
          quantity: product.quantity,
          is_favorite: product.is_favorite,
          notes: product.notes ?? "",
        }
      : {
          name: "",
          brand_name: "",
          category_id: null,
          subcategory_id: null,
          tag_names: [],
          image_url: "",
          expiration_type: "unknown",
          expiration_date: "",
          opened: false,
          opened_date: "",
          pao_months: "",
          quantity: 1,
          is_favorite: false,
          notes: "",
        },
  });

  const selectedCategoryId = watch("category_id");
  const expirationType = watch("expiration_type");
  const opened = watch("opened");

  const visibleSubcategories = subcategories.filter((s) => s.category_id === selectedCategoryId);

  const onSubmit = (values: ProductFormValues) => {
    setServerError(null);
    startTransition(async () => {
      try {
        if (product) {
          await updateProduct(product.id, values);
        } else {
          await createProduct(values);
        }
      } catch (err) {
        // NEXT_REDIRECT is thrown by successful server actions; rethrow it
        if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
        setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-xl border border-danger/30 bg-dangerSoft px-3.5 py-2.5 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div>
        <Label htmlFor="name">Product name</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Facial Treatment Essence" />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="brand_name">Brand</Label>
          <Input id="brand_name" {...register("brand_name")} placeholder="e.g. SK-II" list="brand-suggestions" />
        </div>
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" type="number" min={0} {...register("quantity")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="category_id">Category</Label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select
                id="category_id"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <option value="">Choose a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
          />
          <FieldError message={errors.category_id?.message} />
        </div>
        <div>
          <Label htmlFor="subcategory_id">Subcategory</Label>
          <Controller
            control={control}
            name="subcategory_id"
            render={({ field }) => (
              <Select
                id="subcategory_id"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                disabled={visibleSubcategories.length === 0}
              >
                <option value="">None</option>
                {visibleSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" {...register("image_url")} placeholder="https://…" />
        <FieldError message={errors.image_url?.message} />
      </div>

      <div>
        <Label>Tags</Label>
        <Controller
          control={control}
          name="tag_names"
          render={({ field }) => (
            <div>
              <div className="flex gap-2">
                <Input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = tagDraft.trim();
                      if (trimmed && !field.value.includes(trimmed)) field.onChange([...field.value, trimmed]);
                      setTagDraft("");
                    }
                  }}
                  placeholder="Type a tag and press Enter"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const trimmed = tagDraft.trim();
                    if (trimmed && !field.value.includes(trimmed)) field.onChange([...field.value, trimmed]);
                    setTagDraft("");
                  }}
                >
                  Add
                </Button>
              </div>
              {field.value.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {field.value.map((tag) => (
                    <Badge key={tag}>
                      {tag}
                      <button
                        type="button"
                        aria-label={`Remove ${tag}`}
                        onClick={() => field.onChange(field.value.filter((t) => t !== tag))}
                      >
                        <X size={11} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="expiration_type">Expiration</Label>
          <Select id="expiration_type" {...register("expiration_type")}>
            <option value="dated">Has expiration date</option>
            <option value="none">No expiration</option>
            <option value="unknown">Unknown</option>
          </Select>
        </div>
        {expirationType === "dated" && (
          <div>
            <Label htmlFor="expiration_date">Expiration date</Label>
            <Input id="expiration_date" type="date" {...register("expiration_date")} />
            <FieldError message={errors.expiration_date?.message} />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="pao_months">PAO — Period After Opening (months)</Label>
        <Input id="pao_months" type="number" min={0} {...register("pao_months")} placeholder="e.g. 12" />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surfaceMuted/50 p-3.5">
        <label className="flex items-center gap-2 text-sm text-textSecondary">
          <input type="checkbox" className="h-4 w-4 rounded border-border accent-accent" {...register("opened")} />
          Opened
        </label>
        {opened && (
          <div>
            <Label htmlFor="opened_date">Opened date</Label>
            <Input id="opened_date" type="date" {...register("opened_date")} />
            <FieldError message={errors.opened_date?.message} />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-textSecondary">
          <input type="checkbox" className="h-4 w-4 rounded border-border accent-accent" {...register("is_favorite")} />
          Favorite
        </label>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} placeholder="Anything worth remembering about this product…" />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Add product"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
