import { AdminProductManager } from "@/components/admin/admin-product-manager";
import { getBrands, getCategories, getProductsWithRelations, getSubcategories } from "@/lib/queries";

export const revalidate = 0;

export default async function AdminProductsPage() {
  const [products, categories, subcategories, brands] = await Promise.all([
    getProductsWithRelations(),
    getCategories(),
    getSubcategories(),
    getBrands(),
  ]);

  return (
    <AdminProductManager
      products={products}
      categories={categories}
      subcategories={subcategories}
      brands={brands}
    />
  );
}
