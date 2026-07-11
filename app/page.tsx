import { SiteHeader } from "@/components/site-header";
import { ProductExplorer } from "@/components/product-explorer";
import { getCategories, getProductsWithRelations, getSubcategories, usedBrands } from "@/lib/queries";

export const revalidate = 0;

export default async function HomePage() {
  const [products, categories, subcategories] = await Promise.all([
    getProductsWithRelations(),
    getCategories(),
    getSubcategories(),
  ]);

  const brands = usedBrands(products);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 py-7 sm:px-6 sm:py-8">
        <ProductExplorer
          products={products}
          categories={categories}
          subcategories={subcategories}
          brands={brands}
        />
      </main>
    </div>
  );
}
