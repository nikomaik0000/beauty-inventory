import { SiteHeader } from "@/components/site-header";
import { ProductExplorer } from "@/components/product-explorer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { requireInventoryUser } from "@/lib/inventory-auth";
import { getCategories, getProductsWithRelations, getSubcategories, usedBrands } from "@/lib/queries";

export const revalidate = 0;

export default async function HomePage() {
  await requireInventoryUser({ redirectToLogin: true });

  const [products, categories, subcategories] = await Promise.all([
    getProductsWithRelations(),
    getCategories(),
    getSubcategories(),
  ]);

  const brands = usedBrands(products);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-7 sm:px-6 sm:py-8">
        <ProductExplorer
          products={products}
          categories={categories}
          subcategories={subcategories}
          brands={brands}
        />
      </main>
      <MobileBottomNav />
    </div>
  );
}
