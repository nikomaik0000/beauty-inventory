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
      <h1 className="mb-1 font-serif text-xl font-semibold text-textPrimary">Tags</h1>
      <p className="mb-5 text-sm text-textMuted">
        Tags are created automatically when you add one on a product. Manage or clean up the list here.
      </p>

      {!loading && (
        <SimpleEntityList
          items={tags}
          emptyLabel="No tags yet — add one on a product to get started."
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
