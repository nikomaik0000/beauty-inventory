import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/admin/product-table";
import { getProductsWithRelations } from "@/lib/queries";

export const revalidate = 0;

export default async function AdminProductsPage() {
  const products = await getProductsWithRelations();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-textPrimary">Products</h1>
          <p className="text-sm text-textMuted">{products.length} total</p>
        </div>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus size={15} />
            Add product
          </Button>
        </Link>
      </div>

      <ProductTable products={products} />
    </div>
  );
}
