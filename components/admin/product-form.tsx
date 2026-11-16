"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { ImageUploader } from "@/components/admin/image-uploader";
import { productSchema, type ProductFormValues } from "@/lib/validations";
import { createProduct, updateProduct } from "@/app/actions/products";
import { optimizeImageForUpload } from "@/lib/image-optimize";
import { uploadProductImage } from "@/lib/product-images";
import type { Category, ProductWithRelations, Subcategory } from "@/lib/types";

export function ProductForm({
  categories,
  subcategories,
  product,
  initialProduct,
  modal = false,
  onCancel,
  onDirtyChange,
}: {
  categories: Category[];
  subcategories: Subcategory[];
  product?: ProductWithRelations;
  initialProduct?: ProductWithRelations;
  modal?: boolean;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const bypassWarningRef = useRef(false);
  const sourceProduct = product ?? initialProduct;

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: sourceProduct
      ? {
          name: initialProduct && !product ? `${sourceProduct.name}（副本）` : sourceProduct.name,
          brand_name: sourceProduct.brand?.name ?? "",
          category_id: sourceProduct.category_id,
          subcategory_id: sourceProduct.subcategory_id,
          image_url: sourceProduct.image_url ?? "",
          expiration_type: sourceProduct.expiration_type,
          expiration_date: sourceProduct.expiration_date ?? "",
          pao_months: sourceProduct.pao_months ?? "",
          capacity: sourceProduct.capacity ?? "",
          quantity: sourceProduct.quantity,
          notes: sourceProduct.notes ?? "",
        }
      : {
          name: "",
          brand_name: "",
          category_id: null,
          subcategory_id: null,
          image_url: "",
          expiration_type: "unknown",
          expiration_date: "",
          pao_months: "",
          capacity: "",
          quantity: 1,
          notes: "",
        },
  });

  const selectedCategoryId = watch("category_id");
  const expirationType = watch("expiration_type");

  const visibleSubcategories = subcategories.filter((s) => s.category_id === selectedCategoryId);

  useEffect(() => {
    onDirtyChange?.(isDirty || Boolean(pendingImage));
  }, [isDirty, onDirtyChange, pendingImage]);

  useEffect(() => {
    if (!isDirty && !pendingImage) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassWarningRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptLinks = (event: MouseEvent) => {
      if (bypassWarningRef.current || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (!confirm("尚有未儲存的變更，確定要離開嗎？")) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        bypassWarningRef.current = true;
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLinks, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptLinks, true);
    };
  }, [isDirty, pendingImage]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  const onSubmit = (values: ProductFormValues) => {
    setServerError(null);
    startTransition(async () => {
      try {
        bypassWarningRef.current = true;
        const submittedValues = { ...values };
        if (pendingImage) {
          const optimized = await optimizeImageForUpload(pendingImage);
          submittedValues.image_url = await uploadProductImage(optimized);
        }
        if (product) {
          await updateProduct(product.id, submittedValues);
        } else {
          await createProduct(submittedValues);
        }
      } catch (err) {
        bypassWarningRef.current = false;
        // NEXT_REDIRECT is thrown by successful server actions; rethrow it
        if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
        setServerError(err instanceof Error ? err.message : "發生錯誤，請再試一次。");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onFocusCapture={(event) => {
        if (window.innerWidth >= 640) return;
        const target = event.target as HTMLElement;
        window.setTimeout(() => target.scrollIntoView({ block: "center", behavior: "smooth" }), 180);
      }}
      className={modal ? "flex min-h-0 flex-1 flex-col" : "space-y-6 pb-28 sm:pb-0"}
      style={!modal && keyboardInset > 0 ? { paddingBottom: `calc(7rem + ${keyboardInset}px)` } : undefined}
    >
      <div className={modal ? "min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6" : "contents"}>
      {serverError && (
        <div className="rounded-input border border-danger/30 bg-dangerSoft px-3.5 py-2.5 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div>
        <Label>商品圖片</Label>
        <Controller
          control={control}
          name="image_url"
          render={({ field }) => <ImageUploader value={field.value ?? ""} file={pendingImage} onChange={field.onChange} onFileChange={setPendingImage} />}
        />
      </div>

      <div>
        <Label htmlFor="name">商品名稱</Label>
        <Input id="name" {...register("name")} placeholder="例如：肌因光蘊環采晶采露" />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <Label htmlFor="brand_name">品牌</Label>
          <Input id="brand_name" {...register("brand_name")} placeholder="例如：SK-II" />
        </div>
        <div>
          <Label htmlFor="quantity">庫存</Label>
          <Input id="quantity" type="number" min={0} {...register("quantity")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <Label htmlFor="category_id">大分類</Label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select
                id="category_id"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <option value="">請選擇大分類</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
          />
          <FieldError message={errors.category_id?.message} />
        </div>
        <div>
          <Label htmlFor="subcategory_id">小分類</Label>
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
                <option value="">無</option>
                {visibleSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="capacity">容量</Label>
        <Input id="capacity" type="number" min={0} step="any" {...register("capacity")} placeholder="例如：100" />
        <p className="mt-1 text-[11px] text-textMuted">僅需輸入數字，不含單位。</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <Label htmlFor="expiration_type">
            <span className="sm:hidden">截止類型</span>
            <span className="hidden sm:inline">截止日期類型</span>
          </Label>
          <Select id="expiration_type" {...register("expiration_type")}>
            <option value="dated">有截止日期</option>
            <option value="none">無期限</option>
            <option value="unknown">未知</option>
          </Select>
        </div>
        {expirationType === "dated" && (
          <div>
            <Label htmlFor="expiration_date">截止日期</Label>
            <Input id="expiration_date" type="date" {...register("expiration_date")} />
            <FieldError message={errors.expiration_date?.message} />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="pao_months">開封後使用期限（PAO，月）</Label>
        <Input id="pao_months" type="number" min={0} {...register("pao_months")} placeholder="例如：12" />
      </div>

      <div>
        <Label htmlFor="notes">備註</Label>
        <Textarea id="notes" {...register("notes")} placeholder="任何值得記錄的小筆記…" />
      </div>
      </div>

      {/* Mobile: fixed to the viewport bottom (not `sticky`, so it's
          edge-to-edge regardless of this form's own max-width/padding
          ancestors) with a safe-area-aware bottom inset for iPhone home
          indicators. Desktop (sm:+) reverts to the original static
          inline row — no border, no background, no fixed positioning. */}
      <div
        className={modal ? "flex shrink-0 items-center justify-end gap-2.5 border-t border-divider bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:py-4" : "fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2"}
        style={!modal && keyboardInset > 0 ? { bottom: keyboardInset } : undefined}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!onCancel && (isDirty || pendingImage) && !confirm("尚有未儲存的變更，確定要離開嗎？")) return;
            bypassWarningRef.current = true;
            if (onCancel) onCancel();
            else router.push("/");
          }}
          className="flex-1 justify-center sm:flex-none"
        >
          取消
        </Button>
        <Button type="submit" disabled={pending} className="flex-1 justify-center sm:flex-none">
          {pending ? (pendingImage ? "處理圖片中…" : "儲存中…") : product ? "儲存變更" : "新增商品"}
        </Button>
      </div>
    </form>
  );
}
