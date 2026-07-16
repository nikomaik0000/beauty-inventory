import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getSubcategories } from "@/lib/queries";

export const revalidate = 0;

export default async function NewProductPage() {
  const [categories, subcategories] = await Promise.all([getCategories(), getSubcategories()]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-semibold text-textPrimary" style={{ fontFamily: "var(--font-serif-cjk)" }}>新增商品</h1>
      <ProductForm categories={categories} subcategories={subcategories} />
    </div>
  );
}
