"use client";

import { useEffect, useState } from "react";
import { SimpleEntityList } from "@/components/admin/simple-entity-list";
import { deleteBrand, renameBrand } from "@/app/actions/taxonomy";
import { createClient } from "@/lib/supabase/client";
import type { Brand } from "@/lib/types";

export default function BrandsAdminPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.from("brands").select("*").order("name");
    setBrands(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 font-serif text-xl font-semibold text-textPrimary">Brands</h1>
      <p className="mb-5 text-sm text-textMuted">
        Brands are created automatically when you enter one on a product. Manage or clean up the list here.
      </p>

      {!loading && (
        <>
          <SimpleEntityList
            items={brands}
            emptyLabel="No brands yet — add one on a product to get started."
            onRename={async (id, name) => {
              await renameBrand(id, name);
              await refresh();
            }}
            onDelete={async (id) => {
              await deleteBrand(id);
              await refresh();
            }}
          />
        </>
      )}
    </div>
  );
}
