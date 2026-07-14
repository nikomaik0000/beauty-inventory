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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-semibold text-textPrimary">商品</h1>
          <p className="text-sm text-textMuted">共 {products.length} 件</p>
        </div>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus size={14} strokeWidth={1.75} />
            新增商品
          </Button>
        </Link>
      </div>

      <ProductTable products={products} />
    </div>
  );
}
