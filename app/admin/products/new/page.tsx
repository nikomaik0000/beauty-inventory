import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getSubcategories } from "@/lib/queries";

export const revalidate = 0;

export default async function NewProductPage() {
  const [categories, subcategories] = await Promise.all([getCategories(), getSubcategories()]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-serif text-xl font-semibold text-textPrimary">新增商品</h1>
      <ProductForm categories={categories} subcategories={subcategories} />
    </div>
  );
}
