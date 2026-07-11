"use client";

import { useEffect, useState } from "react";
import { SimpleEntityList } from "@/components/admin/simple-entity-list";
import { deleteTag, renameTag } from "@/app/actions/taxonomy";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/lib/types";

export default function TagsAdminPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.from("tags").select("*").order("name");
    setTags(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 font-serif text-xl font-semibold text-textPrimary">標籤</h1>
      <p className="mb-6 text-sm text-textMuted">
        在商品上輸入標籤名稱時會自動建立。您可以在這裡重新命名或清理清單。
      </p>

      {!loading && (
        <SimpleEntityList
          items={tags}
          emptyLabel="尚無標籤 — 請先在商品上新增一個標籤。"
          onRename={async (id, name) => {
            await renameTag(id, name);
            await refresh();
          }}
          onDelete={async (id) => {
            await deleteTag(id);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
