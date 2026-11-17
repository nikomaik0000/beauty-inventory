import { z } from "zod";
import { extractProductImagePath } from "@/lib/product-image-path";

const optionalPaoMonthsSchema = z
  .union([
    z.literal(""),
    z.coerce
      .number({ invalid_type_error: "PAO 必須是數字。" })
      .int("PAO 必須是整數月數。")
      .min(0, "PAO 不可小於 0。")
      .max(120, "PAO 不可超過 120 個月。"),
  ])
  .optional();

const optionalCapacitySchema = z
  .union([
    z.literal(""),
    z.coerce
      .number({ invalid_type_error: "容量必須是數字。" })
      .min(0, "容量不可小於 0。")
      .max(100000, "容量不可超過 100000。"),
  ])
  .optional();

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "請輸入商品名稱。").max(200, "商品名稱最多 200 個字。"),
    brand_name: z.string().max(120, "品牌名稱最多 120 個字。").optional().or(z.literal("")),
    category_id: z.string().uuid("大分類格式無效，請重新選擇。").nullable(),
    subcategory_id: z.string().uuid("小分類格式無效，請重新選擇。").nullable().optional(),
    image_url: z
      .string()
      .refine(
        (value) => value === "" || extractProductImagePath(value) !== null,
        "圖片路徑無效，請重新選擇圖片。",
      )
      .optional(),
    expiration_type: z.enum(["dated", "none", "unknown"]),
    expiration_date: z
      .string()
      .refine(
        (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
        "截止日期格式無效。",
      )
      .optional(),
    pao_months: optionalPaoMonthsSchema,
    capacity: optionalCapacitySchema,
    quantity: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.coerce
        .number({ invalid_type_error: "請輸入庫存數量。" })
        .int("庫存必須是整數。")
        .min(0, "庫存不可小於 0。")
        .max(9999, "庫存不可超過 9999。"),
    ),
    notes: z.string().max(2000, "備註最多 2000 個字。").optional().or(z.literal("")),
  })
  .refine(
    (data) => data.expiration_type !== "dated" || !!data.expiration_date,
    { message: "選擇有截止日期時，請填寫日期。", path: ["expiration_date"] },
  );

export type ProductFormValues = z.infer<typeof productSchema>;

export const quantityAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  delta: z.union([z.literal(-1), z.literal(1)]),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
});

export const subcategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  category_id: z.string().uuid("Choose a category"),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
export type SubcategoryFormValues = z.infer<typeof subcategorySchema>;
