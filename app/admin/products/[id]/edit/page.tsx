import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getProductById, getSubcategories } from "@/lib/queries";

export const revalidate = 0;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, subcategories] = await Promise.all([
    getProductById(id),
    getCategories(),
    getSubcategories(),
  ]);

  if (!product) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="mb-5 font-serif text-xl font-semibold text-textPrimary">Edit product</h1>
      <ProductForm categories={categories} subcategories={subcategories} product={product} />
    </div>
  );
}
