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
      <h1 className="mb-1 text-xl font-semibold text-textPrimary" style={{ fontFamily: "var(--font-serif-cjk)" }}>品牌</h1>
      <p className="mb-6 text-sm text-textMuted">
        在商品上輸入品牌名稱時會自動建立。您可以在這裡重新命名或清理清單。
      </p>

      {!loading && (
        <>
          <SimpleEntityList
            items={brands}
            emptyLabel="尚無品牌 — 請先在商品上新增一個品牌。"
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
