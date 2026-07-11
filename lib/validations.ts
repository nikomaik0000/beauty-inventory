import { z } from "zod";

export const productSchema = z
  .object({
    name: z.string().min(1, "Product name is required").max(200),
    brand_name: z.string().max(120).optional().or(z.literal("")),
    category_id: z.string().uuid("Choose a category").nullable(),
    subcategory_id: z.string().uuid().nullable().optional(),
    image_url: z.string().url().optional().or(z.literal("")),
    expiration_type: z.enum(["dated", "none", "unknown"]),
    expiration_date: z.string().optional().or(z.literal("")),
    opened: z.boolean().default(false),
    opened_date: z.string().optional().or(z.literal("")),
    pao_months: z
      .union([z.coerce.number().int().min(0).max(120), z.literal("")])
      .optional(),
    capacity: z
      .union([z.coerce.number().min(0).max(100000), z.literal("")])
      .optional(),
    quantity: z.coerce.number().int().min(0).max(9999).default(1),
    notes: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine(
    (data) => data.expiration_type !== "dated" || !!data.expiration_date,
    { message: "Expiration date is required when type is “Has Expiration Date”", path: ["expiration_date"] },
  )
  .refine(
    (data) => !data.opened || !!data.opened_date,
    { message: "Opened date is required once a product is marked opened", path: ["opened_date"] },
  );

export type ProductFormValues = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
});

export const subcategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  category_id: z.string().uuid("Choose a category"),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
export type SubcategoryFormValues = z.infer<typeof subcategorySchema>;
