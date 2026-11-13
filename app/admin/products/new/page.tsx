import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getProductById, getSubcategories } from "@/lib/queries";

export const revalidate = 0;

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const { duplicate } = await searchParams;
  const [categories, subcategories, initialProduct] = await Promise.all([
    getCategories(),
    getSubcategories(),
    duplicate ? getProductById(duplicate) : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-semibold text-textPrimary">{initialProduct ? "複製商品" : "新增商品"}</h1>
      <ProductForm categories={categories} subcategories={subcategories} initialProduct={initialProduct ?? undefined} />
    </div>
  );
}
