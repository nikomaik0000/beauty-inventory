import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getSubcategories } from "@/lib/queries";

export const revalidate = 0;

export default async function NewProductPage() {
  const [categories, subcategories] = await Promise.all([getCategories(), getSubcategories()]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-5 font-serif text-xl font-semibold text-textPrimary">Add product</h1>
      <ProductForm categories={categories} subcategories={subcategories} />
    </div>
  );
}
